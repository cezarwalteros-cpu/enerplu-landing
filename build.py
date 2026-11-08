# Arma la copia de la landing de Shopify (/products/enerplu, GemPages) para Vercel.
# Una sola sección de oferta + formulario contra entrega (fuente/oferta-formulario.html), justo antes de las reseñas con fotos.
# Fuente: fuente/shopify.json (secciones tal cual las sirve Shopify) + fuente/formulario (lógica del formulario de pedido.enerplu.com).
import json, re, pathlib

ROOT = pathlib.Path(__file__).parent
PDP = ROOT / 'fuente' / 'formulario'
OUT = ROOT / 'public'
OUT.mkdir(exist_ok=True)
GUIAS_TOKEN = 'mF2kt4dP8qpH'
d = json.loads((ROOT / 'fuente' / 'shopify.json').read_text())
PIXEL = '1248121626590977'
# TikTok: pixel de ENERPLU (vacío = no se instala). La compra también va por la Events API desde checkout-native.
TIKTOK_PIXEL = 'D7MGRHBC77U8CJLL8D70'
SHOP = 'https://enerplu.lat'


def must(s, a, b, n=1):
    c = s.count(a)
    assert c == n, (a[:80], c)
    return s.replace(a, b)


secs = list(d['sections'])

# GemPages deja cada sección invisible (gps-lazy) hasta que su script la muestra; sin Shopify ese script no corre, así que se quita la clase
secs = [re.sub(r'class="([^"]*)"', lambda m: 'class="' + re.sub(r'(?<![\w-])gps-lazy(?![\w-])', '', m.group(1)) + '"', h) for h in secs]

# 0 · script de embudo: la página se registra con dominio (para separarla de Shopify en el CRM) y guarda el anuncio
secs[0] = must(secs[0], 'page: location.pathname, store: STORE,', 'page: location.host + location.pathname, store: STORE,')
secs[0] = must(secs[0], 'utm_content: q.get("utm_content"),\n      extra', 'utm_content: q.get("utm_content"), utm_term: q.get("utm_term"),\n      extra')

# en modo prueba (?ep_test=1) los scripts de embudo de la página no registran nada
secs[0] = must(secs[0], 'function send(ev, extra) {', 'function send(ev, extra) {\n    if (/[?&]ep_test=1(&|$)/.test(location.search)) return;')

# "En línea ahora" del CRM: latido cada 30 s mientras la página está a la vista (máx. 30 min) y aviso de salida al ocultarla.
# funnel-track guarda ping/salida solo en funnel_en_vivo (no en funnel_events), así que el embudo no cambia.
secs[0] = must(secs[0], 'if (sent[ev] && ev !== "plan_click" && ev !== "cta_click") return;',
               'if (sent[ev] && ev !== "plan_click" && ev !== "cta_click" && ev !== "ping" && ev !== "salida") return;')
secs[0] = must(secs[0], '  send("page_view");\n', """  send("page_view");

  // 1b) En línea ahora (CRM): latido cada 30 s con la página a la vista, máx. 30 min; al ocultarla avisa la salida
  var latidos = 0;
  function latido() { if (document.visibilityState === "visible" && latidos < 60) { latidos++; send("ping"); } }
  setInterval(latido, 30000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") send("salida"); else latido(); });
""")

# 11 · enlaces legales a la tienda
secs[11] = secs[11].replace('href="/pages/', 'href="' + SHOP + '/pages/')

# oferta + formulario (una sola sección, diseño del selector v13)
order_block = (ROOT / 'fuente' / 'oferta-formulario.html').read_text()
oferta_css = (ROOT / 'fuente' / 'oferta.css').read_text()
oferta_js = (ROOT / 'fuente' / 'oferta-selector.js').read_text()
# E-03 · ofertas + formulario solo en ventana emergente, como Mg Collagen (A/B, 2026-11-08).
# 'off' = sin prueba, 'ab' = 50/50 solo en "/", 'all' = todos ven la ventana.
POPUP_MODE = 'off'
popup_js = (ROOT / 'fuente' / 'popup-pedido.js').read_text()
popup_css = (ROOT / 'fuente' / 'popup-pedido.css').read_text()

# barra de oferta (reemplaza la franja desplazante de Shopify, que sin su script queda como lista quieta)
# descuento = Plan Élite frente a 4 cajas sueltas (precios de fuente/formulario/config.js)
cfg_js = (PDP / 'config.js').read_text()
single = int(re.search(r'singleBoxPrice:\s*(\d+)', cfg_js).group(1))
elite = re.search(r"id: 'elite',.*?boxes: (\d+).*?price: (\d+)", cfg_js, re.S)
PCT = int((1 - int(elite.group(2)) / (single * int(elite.group(1)))) * 100)
item = ('<span class="epb-item"><i>🔥</i>Oferta hasta <b>{pct} % de descuento</b></span><span class="epb-item epb-dot">★</span>'
        '<span class="epb-item">💵 Pagas al recibir</span><span class="epb-item epb-dot">★</span>'
        '<span class="epb-item">🚚 Envío gratis</span><span class="epb-item epb-dot">★</span>').format(pct=PCT)
items = item * 3 + '<span class="epb-dup" style="display:contents">' + item * 3 + '</span>'
barra = (ROOT / 'fuente' / 'barra-oferta.html').read_text().replace('{{PCT}}', str(PCT)).replace('{{ITEMS}}', items)

# Secciones de Shopify que quedan (índices de fuente/shopify.json):
#   0 embudo · BARRA DE OFERTA (en lugar de 1, la franja) · 2 hero · 5 jarabes · 6 matriz sublingual · 7 decisión · OFERTA+FORMULARIO · 10 reseñas con fotos · 11 legal
# Se quitan: 3 (selector viejo con Releasit), 4 (testimonios de WhatsApp), 8 (franja blanca vacía), 9 (reseñas sin fotos).
ORDER = [0, 'barra', 2, 5, 6, 7, 'oferta', 10, 11]
head_styles = re.sub(r'<style id="shopify-accelerated-checkout-cart">.*?</style>', '', d['headStyles'], flags=re.S)
base_css = '<link href="https://losgomosos.lat/cdn/shop/t/3/assets/base.css?v=101470124488811828791792019403" rel="stylesheet" type="text/css" media="all">'
ep_css = (PDP / 'styles.css').read_text()
sprite = (PDP / 'sprite.html').read_text()
config = (PDP / 'config.js').read_text()
app = (PDP / 'app.js').read_text()
overrides = """window.EP_CONFIG.checkout.mode = 'inline';
window.EP_CONFIG.checkout.funnelLite = true;
window.EP_CONFIG.theme = 'negro';
window.EP_CONFIG.tracking.fireStandardEvents = true;
"""
pixel = f"""<script>
!function(f,b,e,v,n,t,s){{if(f.fbq)return;n=f.fbq=function(){{n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)}};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '{PIXEL}');
fbq('track', 'PageView');
</script>"""
if TIKTOK_PIXEL:
    pixel += f"""
<script>
!function (w, d, t) {{
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){{t[e]=function(){{t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){{for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e}},ttq.load=function(e,n){{var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{{}},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{{}},ttq._t[e]=+new Date,ttq._o=ttq._o||{{}},ttq._o[e]=n||{{}};n=d.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=d.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)}};
  ttq.load('{TIKTOK_PIXEL}');
  ttq.page();
}}(window, document, 'ttq');
</script>"""

body = '\n'.join({'oferta': order_block, 'barra': barra}.get(k) if isinstance(k, str) else secs[k] for k in ORDER)

html = f"""<!doctype html>
<html {d['htmlAttrs']}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Enerplu | Energía, Resistencia, Firmeza Suplemento Natural ™</title>
<meta name="description" content="ENERPLU, tableta masticable sublingual. Registro Invima NSA2314-2025. Pago contra entrega y envío discreto a toda Colombia.">
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://losgomosos.lat" crossorigin>
<link rel="preconnect" href="https://cdn.shopify.com" crossorigin>
<link rel="preconnect" href="https://mqwscbpdozrdiqxofmod.supabase.co" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&family=Figtree:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800;900&display=swap">
{base_css}
{head_styles}
<style>
{ep_css}
{oferta_css}
{popup_css}
</style>
{pixel}
</head>
<body {d['bodyAttrs']}>
<noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id={PIXEL}&ev=PageView&noscript=1"></noscript>
{sprite}
<main {d['mainAttrs']}>
{body}
</main>
<script>
{config}
{overrides}</script>
<script>
{app}
</script>
<script>
{oferta_js}
</script>
<script>
window.EP_POPUP_MODE = '{POPUP_MODE}';
{popup_js}
</script>
</body>
</html>
"""
# Textos de confianza y CTAs de contraentrega (2026-11-08, propuesta 'Garantía Prueba Real'). Cada par es (actual, nuevo).
CAMBIOS_TODAS = [
    ('POTENCIA EN <span>5 MINUTOS EXACTOS.</span>', 'POTENCIA EN <span>5 A 15 MINUTOS.</span>'),
    ('class="ep-hc-btn">QUIERO POTENCIA INMEDIATA →</a>', 'class="ep-hc-btn">PÍDELO YA · PAGAS AL RECIBIR →</a>'),
    ('<strong>Acción en 5 Minutos:</strong>', '<strong>Acción en 5 a 15 minutos:</strong>'),
    ('id="enerplu-review-cta">YO TAMBIÉN QUIERO PROBAR</button>', 'id="enerplu-review-cta">QUIERO PROBARLO SIN RIESGO</button>'),
    # el embudo del CRM sigue contando los botones nuevos como clic en botón
    ('if (a && /quiero|pedir|comprar|ofertas|elegir|elige/i.test', 'if (a && /quiero|pedir|pídelo|pidelo|comprar|ofertas|elegir|elige/i.test'),
]
for a, b in CAMBIOS_TODAS:
    html = must(html, a, b)
(OUT / 'index.html').write_text(html)
(OUT / 'garantia.html').write_text((ROOT / 'fuente' / 'garantia.html').read_text())
(OUT / 'guias' / GUIAS_TOKEN).mkdir(parents=True, exist_ok=True)   # PDFs de regalo: solo enlace secreto, sin Drive (cesar 2026-11-08)
(OUT / 'guias' / GUIAS_TOKEN / 'index.html').write_text((ROOT / 'fuente' / 'guias.html').read_text())

# /producto: la misma landing con aviso de restricción de edad (+18) a pantalla completa, para el tráfico de TikTok.
# Lo ve todo el que abre esa URL, igual en celular y computador. La landing de Meta (/) no cambia.
gate = (ROOT / 'fuente' / 'producto' / 'aviso-edad.html').read_text()
# Imágenes que se ocultan solo en /producto (TikTok). Para volver a mostrar una, quítala de esta lista.
OCULTAR_PRODUCTO = [
    'gpGrrwtDmE',   # "RESULTADOS VISIBLES DE INMEDIATO" (resultados_enerplu.avif), oculta 2026-11-07 a pedido de cesar
]
ocultar = '<style>' + ''.join('[data-id="%s"]{display:none!important}' % i for i in OCULTAR_PRODUCTO) + '</style>\n' if OCULTAR_PRODUCTO else ''
# Textos que cambian solo en /producto (TikTok), pedido de cesar 2026-11-07: sin términos explícitos ni promesas médicas.
# Cada par es (texto actual, texto nuevo); si el texto de Shopify cambia, el build falla en vez de dejarlo a medias.
CAMBIOS_PRODUCTO = [
    ('v1774025718/ENEPLU_MECANISMO_fextu4.webp" alt="Mecanismo Enerplu"',
     'v1794091617/Tecnolog%C3%ADa_sublingual__absorci%C3%B3n_directa_al_torrente_sangu%C3%ADneo_wsarhe.webp" alt="Tecnología sublingual: absorción directa al torrente sanguíneo"'),
    ('content="ENERPLU, tableta masticable sublingual.', 'content="ENERPLU, tableta sublingual.'),
    ('alt="ENERPLU tabletas masticables con maca negra"', 'alt="ENERPLU tabletas sublinguales con maca negra"'),
    ('La tableta masticable que inunda tu zona pélvica de sangre antes de que ella termine de desvestirse.',
     'La tableta que se disuelve bajo la lengua y actúa en minutos, para que llegues con toda la energía al momento decisivo.'),
    ('<strong>Más duro. Más firme. Más control.</strong>', '<strong>Más firmeza. Más energía. Más control.</strong>'),
    ('alt="Masticables Enerplu"', 'alt="Tabletas sublinguales Enerplu"'),
    ('<span>MASTICABLES ENERPLU</span>', '<span>TABLETAS SUBLINGUALES ENERPLU</span>'),
    ('Lo masticas como un caramelo de menta.', 'La disuelves bajo la lengua como un caramelo de menta.'),
    ('Al masticarla, nuestra matriz activa', 'Al disolverla bajo la lengua, nuestra matriz activa'),
    (' (el mismo método de emergencia rápida que usa la medicina).', '.'),
    ('Es el mismo método de emergencia rápida usado en cardiología.',
     'Tecnología de rápida biodisponibilidad que ingresa directo al flujo sanguíneo evitando la degradación digestiva.'),
    ('Absorción avalada por la ciencia vascular para un bombeo masivo en 5 minutos.', 'Absorción rápida: empieza a actuar en 5 a 15 minutos.'),
    ('<p>Mastica una tableta de 5 a 15 minutos antes del encuentro y déjala disolver bajo la lengua.',
     '<p>Disuelve una tableta bajo la lengua de 5 a 15 minutos antes del encuentro.'),
    ("'Mastica una tableta'", "'Disuelve una tableta bajo la lengua'"),
    ('<h3>Se mastica y se deja bajo la lengua</h3>', '<h3>Se disuelve bajo la lengua</h3>'),
    ('aria-label="Masticas, esperas de 5 a 15 minutos, listo"><span>Masticas</span>',
     'aria-label="La disuelves, esperas de 5 a 15 minutos, listo"><span>La disuelves</span>'),
    ("alt: 'Caja de ENERPLU con tabletas masticables'", "alt: 'Caja de ENERPLU con tabletas sublinguales'"),
    ("'ENERPLU, tabletas masticables'", "'ENERPLU, tabletas sublinguales'"),
]
# Reseñas: no se reescriben las palabras de los clientes; en /producto solo se muestran estas (las que no tienen lenguaje explícito).
# Son los números de posición en la lista REVIEWS de la sección de reseñas (0 = la primera).
RESENAS_PRODUCTO = [20, 23, 30, 39, 40, 41, 42, 43, 44, 45, 47, 49, 51, 53, 57, 59, 101, 108, 109, 111, 114, 117]
prod = html
for a, b in CAMBIOS_PRODUCTO:
    prod = must(prod, a, b)
_k = prod.index('const REVIEWS=') + len('const REVIEWS=')
_arr, _n = json.JSONDecoder().raw_decode(prod[_k:])
assert len(_arr) == 120, len(_arr)
prod = prod[:_k] + json.dumps([_arr[i] for i in RESENAS_PRODUCTO], ensure_ascii=False, separators=(',', ':')) + prod[_k + _n:]
(OUT / 'producto.html').write_text(must(prod, '<main ', ocultar + gate + '\n<main '))
(OUT / 'terminos.html').write_text((ROOT / 'fuente' / 'producto' / 'terminos.html').read_text())
(ROOT / 'vercel.json').write_text(json.dumps({
    "framework": None,
    "buildCommand": "",
    "outputDirectory": "public",
    "cleanUrls": True,
    "headers": [{"source": "/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=0, must-revalidate"}]},
                {"source": "/guias/(.*)", "headers": [{"key": "X-Robots-Tag", "value": "noindex, nofollow, noarchive"}]}]
}, indent=2))
print('ok', len(html))
