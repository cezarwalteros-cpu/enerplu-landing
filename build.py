# Arma la copia de la landing de Shopify (/products/enerplu, GemPages) para Vercel,
# con el formulario contra entrega incrustado debajo del selector de planes.
# Fuente: src/shopify.json (secciones tal cual las sirve Shopify) + ../enerplu-pdp/src (formulario, estilos, lógica).
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

# 3 · selector (carrusel): "Pedir y pagar al recibir" ya no abre Releasit; elige el plan en el formulario de abajo
s3 = secs[3]
s3 = must(s3, 'function send(ev, extra) {', 'function send(ev, extra) {\n    if (/[?&]ep_test=1(&|$)/.test(location.search)) return;')
s3 = must(s3, 'page: location.pathname, store: "enerplu",', 'page: location.host + location.pathname, store: "enerplu",')
s3 = must(s3, 'utm_content: qs.get("utm_content"), extra: extra || null });', 'utm_content: qs.get("utm_content"), utm_term: qs.get("utm_term"), extra: extra || null });')
s3 = must(s3, 'send("plan_click", { plan: p.key, via: "releasit" });\n    openReleasit(p);',
          'send("plan_click", { plan: p.key, via: "formulario" });\n    if (window.EP_SELECT_PLAN) window.EP_SELECT_PLAN(p.key, "selector");')
# los precios y tachados salen de la configuración del selector (en Vercel no existe /products.json de Shopify)
i = s3.find('fetch("/products.json')
if i >= 0:
    j = s3.find('.catch(function () {});', i)
    assert j > i
    s3 = s3[:i] + s3[j + len('.catch(function () {});'):]
assert 'fetch("/products.json' not in s3
# los botones del formulario no deben subir al selector
s3 = must(s3, 't.closest(".epv") || t.closest(\'[class*="_rsi"]\')', 't.closest(".epv") || t.closest(".ep-root") || t.closest(\'[class*="_rsi"]\')')
secs[3] = s3

# 11 · enlaces legales a la tienda
secs[11] = secs[11].replace('href="/pages/', 'href="' + SHOP + '/pages/')

# formulario: la misma sección 15 de pedido.enerplu.com, con el encabezado del paso final
order = (PDP / '15-order.html').read_text()
order = order.replace('{{SIG}}', '').replace('{{SELECTOR}}', '')
order = must(order, '<p class="ep-eyebrow">Pedido en 1 minuto</p>', '<p class="ep-eyebrow">Último paso</p>')
order = must(order, '<h2 class="ep-h2" id="ep-h-order">Elige tu plan y <em>pagas al recibir</em></h2>',
             '<h2 class="ep-h2" id="ep-h-order">Completa tu pedido y <em>pagas al recibir</em></h2>')
order = re.sub(r'<p class="ep-lead"[^>]*>.*?</p>', '<p class="ep-lead" style="margin-inline:auto">Revisa tu plan, déjanos tus datos y te lo enviamos en bolsa negra sellada. Te confirmamos por WhatsApp antes de despacharlo.</p>', order, count=1, flags=re.S)
order_block = '<div class="ep-root" data-ep-theme="claro">\n' + order + '\n</div>'

head_styles = re.sub(r'<style id="shopify-accelerated-checkout-cart">.*?</style>', '', d['headStyles'], flags=re.S)
base_css = '<link href="https://losgomosos.lat/cdn/shop/t/3/assets/base.css?v=101470124488811828791792019403" rel="stylesheet" type="text/css" media="all">'
ep_css = (PDP / 'styles.css').read_text()
sprite = (PDP / 'sprite.html').read_text()
config = (PDP / 'config.js').read_text()
app = (PDP / 'app.js').read_text()
overrides = """window.EP_CONFIG.checkout.mode = 'inline';
window.EP_CONFIG.checkout.funnelLite = true;
window.EP_CONFIG.theme = 'claro';
window.EP_CONFIG.tracking.fireStandardEvents = true;
"""
pixel = f"""<script>
!function(f,b,e,v,n,t,s){{if(f.fbq)return;n=f.fbq=function(){{n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)}};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '{PIXEL}');
fbq('track', 'PageView');
</script>"""

body = '\n'.join(secs[:4]) + '\n' + order_block + '\n' + '\n'.join(secs[4:12])

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
.ep-root .ep-order {{ padding-block: 36px 44px; }}
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
