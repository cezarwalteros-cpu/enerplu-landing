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

# 2 · HERO v2 (estilo ficha de producto: galería + calificación + beneficios + selector de planes + confianza).
# Reemplaza solo el bloque #ep-hero-clean; se quedan la barra fija, el salto a reseñas y la imagen de resultados.
# HERO_V2 = False vuelve al hero de texto de siempre.
HERO_V2 = True
hero_css = hero_js = ''
if HERO_V2:
    import subprocess
    cfg = json.loads(subprocess.check_output(['node', '-e',
        "global.window={};eval(require('fs').readFileSync(process.argv[1],'utf8'));process.stdout.write(JSON.stringify(window.EP_CONFIG))",
        str(PDP / 'config.js')]))

    def cdn(u, w):
        return u.replace('/upload/', '/upload/w_%d/f_auto/q_auto/' % w) if 'res.cloudinary.com/' in u and '/upload/' in u else u

    def esc(t):
        return str(t).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')

    def money(n):
        return '$' + format(int(round(n)), ',').replace(',', '.')

    gal = [{'src': 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793076270/Energ%C3%ADa_discreta_con_maca_negra_bt78tl.webp',
            'alt': 'ENERPLU tabletas masticables con maca negra'}] + [g for g in cfg['gallery'] if g.get('type') == 'img']
    figs = ''.join('<figure><img src="%s" srcset="%s 540w, %s 1080w" sizes="(min-width:900px) 520px, 100vw" alt="%s" width="1080" height="1080" %s></figure>'
                   % (cdn(g['src'], 720), cdn(g['src'], 540), cdn(g['src'], 1080), esc(g['alt']),
                      'fetchpriority="high"' if i == 0 else 'loading="lazy" decoding="async"') for i, g in enumerate(gal))
    ths = ''.join('<button type="button" class="%s" aria-label="Ver foto %d"><img src="%s" alt="" loading="lazy" width="54" height="54"></button>'
                  % ('is-on' if i == 0 else '', i + 1, cdn(g['src'], 120)) for i, g in enumerate(gal))
    SH = 'https://cdn.shopify.com/s/files/1/0748/9418/0397/files/'
    LOOK = {'inicial': (SH + 'BASICO.webp?v=1793468688&width=160', '', 'Para probar', ''),
            'dominio': (SH + 'DOMINIO.webp?v=1793468717&width=160', 'El más pedido', '✓ Retardante gratis', ''),
            'elite': (SH + 'ELITE.webp?v=1793468748&width=160', '', '✓ Retardante gratis', ' hv-pinc--best')}
    plans = ''
    for pid in ['inicial', 'dominio', 'elite']:   # de menor a mayor, con el más pedido en el medio
        pk = next(x for x in cfg['packs'] if x['id'] == pid)
        img, tag, inc, inc_cls = LOOK[pid]
        was = cfg['singleBoxPrice'] * pk['boxes']
        on = pid == cfg['defaultPack']
        off = int((1 - pk['price'] / was) * 100)
        plans += ('<label class="hv-plan%s%s" data-pack="%s">' % (' hv-plan--rec' if tag else '', ' is-on' if on else '', pid) +
                  '<input type="radio" name="ep-pack-hero" value="%s"%s>' % (pid, ' checked' if on else '') +
                  ('<span class="hv-tag">★ %s</span>' % tag if tag else '') +
                  '<span class="hv-dot" aria-hidden="true"></span>' +
                  '<span class="hv-pimg"><img src="%s" alt="%s ENERPLU" loading="lazy" width="58" height="58"></span>' % (img, esc(pk['name'])) +
                  '<span><span class="hv-pname">%s</span><span class="hv-pqty">%d %s · %d tabletas</span>' % (esc(pk['name']), pk['boxes'], 'cajas' if pk['boxes'] > 1 else 'caja', pk['tablets']) +
                  ('<span class="hv-pinc%s">%s</span>' % (inc_cls, inc) if pid != 'inicial' else '<span class="hv-pqty">%s</span>' % inc) + '</span>' +
                  '<span class="hv-pr"><span class="hv-price">%s</span>' % money(pk['price']) +
                  ('<span class="hv-was">%s</span><span class="hv-off">%d%% OFF</span>' % (money(was), off) if off > 0 else '') +
                  '<span class="hv-unit">%s c/tableta</span></span></label>' % money(pk['price'] / pk['tablets']))
    dflt = next(x for x in cfg['packs'] if x['id'] == cfg['defaultPack'])
    ico = lambda d: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'
    hero_html = (ROOT / 'fuente' / 'hero-v2.html').read_text()
    for k, v in {'{{FIGS}}': figs, '{{THUMBS}}': ths, '{{PLANS}}': plans, '{{PCT}}': str(max(int((1 - x['price'] / (cfg['singleBoxPrice'] * x['boxes'])) * 100) for x in cfg['packs'])),
                 '{{CTA}}': 'Quiero el %s · %s →<small>Pagas en efectivo al recibir · envío gratis</small>' % (esc(dflt['name']), money(dflt['price'])),
                 '{{I_BOLT}}': ico('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
                 '{{I_UP}}': ico('<path d="M7 17 17 7"/><path d="M8 7h9v9"/>'),
                 '{{I_TIME}}': ico('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/>'),
                 '{{I_LEAF}}': ico('<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.4 5.1-6"/>'),
                 '{{I_TRUCK}}': ico('<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>'),
                 '{{I_CASH}}': ico('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>'),
                 '{{I_BOX}}': ico('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>')}.items():
        hero_html = hero_html.replace(k, v)
    a = secs[2].index('<section id="ep-hero-clean"')
    b = secs[2].index('</section>', a) + len('</section>')
    secs[2] = secs[2][:a] + hero_html + secs[2][b:]
    # la barra fija y el salto a reseñas buscaban las clases del hero viejo
    secs[2] = must(secs[2], 'document.querySelectorAll("#ep-hero-clean .ep-hc-btn"), function(b){ return b.offsetParent', 'document.querySelectorAll("#ep-hero-clean .hv-cta"), function(b){ return b.offsetParent')
    secs[2] = must(secs[2], 'Array.prototype.forEach.call(document.querySelectorAll("#ep-hero-clean .ep-hc-btn")', 'Array.prototype.forEach.call(document.querySelectorAll("#ep-hero-clean .hv-cta")')
    secs[2] = must(secs[2], 'e.target.closest("#ep-hero-clean .ep-hc-kicker")', 'e.target.closest("#ep-hero-clean .hv-rating")')
    hero_css = (ROOT / 'fuente' / 'hero-v2.css').read_text()
    hero_js = '<script>\n' + (ROOT / 'fuente' / 'hero-v2.js').read_text() + '</script>'

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
{hero_css}
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
{hero_js}
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
