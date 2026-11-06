# Arma la copia de la landing de Shopify (/products/enerplu, GemPages) para Vercel.
# Una sola sección de oferta + formulario contra entrega (fuente/oferta-formulario.html), justo antes de las reseñas con fotos.
# Fuente: fuente/shopify.json (secciones tal cual las sirve Shopify) + fuente/formulario (lógica del formulario de pedido.enerplu.com).
import json, re, pathlib

ROOT = pathlib.Path(__file__).parent
PDP = ROOT / 'fuente' / 'formulario'
OUT = ROOT / 'public'
OUT.mkdir(exist_ok=True)
d = json.loads((ROOT / 'fuente' / 'shopify.json').read_text())
PIXEL = '1248121626590977'
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
</body>
</html>
"""
(OUT / 'index.html').write_text(html)
(ROOT / 'vercel.json').write_text(json.dumps({
    "framework": None,
    "buildCommand": "",
    "outputDirectory": "public",
    "cleanUrls": True,
    "headers": [{"source": "/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=0, must-revalidate"}]}]
}, indent=2))
print('ok', len(html))
