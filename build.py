# Arma la copia de la landing de Shopify (/products/enerplu, GemPages) para Vercel.
# Una sola sección de oferta + formulario contra entrega (fuente/oferta-formulario.html), justo antes de las reseñas con fotos.
# Fuente: fuente/shopify.json (secciones tal cual las sirve Shopify) + fuente/formulario (lógica del formulario de pedido.enerplu.com).
import json, os, re, pathlib, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).parent
PDP = ROOT / 'fuente' / 'formulario'
OUT = pathlib.Path(os.environ['EP_OUT']) if os.environ.get('EP_OUT') else ROOT / 'public'
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

# 2 · HERO v2 (estilo ficha de producto: galería + calificación + beneficios + selector de planes + confianza).
# Reemplaza solo el bloque #ep-hero-clean; se quedan la barra fija, el salto a reseñas y la imagen de resultados.
# HERO_V2 = False vuelve al hero de texto de siempre.
HERO_V2 = os.environ.get('EP_HERO_V2') == '1'   # el hero v2 solo se usa para armar la página B (/b) de la prueba E-04
hero_css = hero_js = ''
if HERO_V2:
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
</script>
<script type="text/javascript">
(function(c,l,a,r,i,t,y){{
c[a]=c[a]||function(){{(c[a].q=c[a].q||[]).push(arguments)}};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
}})(window, document, "clarity", "script", "aj18t0em8h");
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
html,body{{margin:0;padding:0;background:#000}}
{ep_css}
{oferta_css}
{popup_css}
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
<script>
window.EP_POPUP_MODE = '{POPUP_MODE}';
{popup_js}
</script>
{hero_js}
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
    if HERO_V2 and 'ep-hc' in a + b or HERO_V2 and 'POTENCIA EN <span>' in a:
        continue   # el hero v2 ya trae su propio título y botón
    html = must(html, a, b)

# E-04 (cesar 2026-11-10, "probemos esa versión"): prueba A/B 50/50 en "/".
# A = esta página tal cual. B = /b: hero v2 con planes y precio arriba, ofertas solo arriba, formulario 1 Pago · 2 Dirección · 3 Envío,
# "Faltan N datos", pagar ahora destacado (-$12.000) y sello Bold. Se arma con tools/maqueta_b.py --real.
# Asignación: localStorage ep_e04 (50/50, se queda fija por navegador); ?ab4=A|B fuerza la variante.
# Medición: funnel_events ab_assign {exp:'E04', v} por sesión + checkout_attempts.session_id. AB_E04 = False apaga la prueba (todos ven A).
AB_E04 = False   # 10-nov 4:18 pm: cesar apagó la página B (confusa de diligenciar); todos ven A
AB_HEAD = """<script>
(function(){try{
  var p=location.pathname; if(p!=='/'&&p!=='/index'&&p!=='/index.html') return;
  var q=location.search, f=(q.match(/[?&]ab4=([AB])/)||[])[1], v=f;
  if(!v){try{v=localStorage.getItem('ep_e04')}catch(e){}}
  if(v!=='A'&&v!=='B'){v=Math.random()<0.5?'A':'B'}
  try{localStorage.setItem('ep_e04',v)}catch(e){}
  if(v==='B'){location.replace('/b'+q+location.hash);}
}catch(e){}})();
</script>"""
def ab_send(v, exp='E04'):
    return """<script>
(function(){
  var q=new URLSearchParams(location.search); if(q.get('ep_test')==='1') return;
  var n=0;(function go(){var sid='';try{sid=sessionStorage.getItem('ep_sid')||''}catch(e){}
    if(!sid){if(n++<20)setTimeout(go,300);return;}
    var b=JSON.stringify({sid:sid,ev:'ab_assign',page:(location.host+location.pathname).slice(0,300),store:'enerplu',utm_source:q.get('utm_source'),utm_campaign:q.get('utm_campaign'),utm_content:q.get('utm_content'),utm_term:q.get('utm_term'),extra:{exp:'%s',v:'%s'}});
    var U='https://mqwscbpdozrdiqxofmod.supabase.co/functions/v1/funnel-track';
    try{if(!(navigator.sendBeacon&&navigator.sendBeacon(U,new Blob([b],{type:'text/plain'}))))fetch(U,{method:'POST',body:b,keepalive:true,headers:{'Content-Type':'text/plain'}})}catch(e){}
  })();
})();
</script>""" % (exp, v)
# E-05 (cesar 2026-11-10 10:47 pm, "Test A/B 50/50"): página actual (A, "/") contra la réplica de octubre (B, "/octubre").
# Asignación: localStorage ep_e05 (50/50, fija por navegador); ?ab5=A|B fuerza la variante. B se redirige antes de cargar el píxel.
# Medición: funnel_events ab_assign {exp:'E05', v} por sesión + checkout_attempts.session_id. AB_E05 = False apaga la prueba (todos ven A).
AB_E05 = False   # 13-nov: E-05 cerrada; la página actual queda como control de E-06
AB5_HEAD = """<script>
(function(){try{
  var p=location.pathname; if(p!=='/'&&p!=='/index'&&p!=='/index.html') return;
  var q=location.search; if(/[?&]ep_test=1(&|$)/.test(q)) return;
  var f=(q.match(/[?&]ab5=([AB])/)||[])[1], v=f;
  if(!v){try{v=localStorage.getItem('ep_e05')}catch(e){}}
  if(v!=='A'&&v!=='B'){v=Math.random()<0.5?'A':'B'}
  try{localStorage.setItem('ep_e05',v)}catch(e){}
  if(v==='B'){location.replace('/octubre'+q+location.hash);}
}catch(e){}})();
</script>"""
# Popup de 5% en la primera compra (fuente/popup5.js, prueba "popup5" A vs B, código ENERPLU5 en el CRM). Sale en "/" y en "/b".
# POPUP5 = False lo apaga. Necesita discount_codes ENERPLU5 + checkout_pages.show_coupon en el CRM.
POPUP5 = True
if POPUP5:
    html = must(html, '</head>', '<style>' + (ROOT / 'fuente' / 'popup5.css').read_text() + '</style>\n</head>')
    html = must(html, '</body>', '<script>' + (ROOT / 'fuente' / 'popup5.js').read_text() + '</script>\n</body>')

# Imagen "RESULTADOS VISIBLES DE INMEDIATO" (data-id gpGrrwtDmE): era lo más tocado de la página en Clarity (33 toques en 3 días)
# y no hacía nada. Al tocarla hace lo mismo que "VER OFERTAS" (aprobado por cesar 2026-11-13 12:54 pm). Sale en "/" y "/oferta-a".
IMG_A_OFERTAS = True

# Puente embudo -> Clarity (aprobado por cesar 2026-11-13 5:41 pm): etiqueta cada sesión de Clarity con anuncio, campaña,
# conjunto, variante y sid, y marca los pasos del embudo como eventos de Clarity, para filtrar grabaciones por anuncio,
# variante y paso. Lee lo que ya envían los scripts del embudo (sendBeacon/fetch a funnel-track) y el push 'ep_purchase';
# no cambia nada de lo que se envía al CRM. Sin datos personales. CLARITY_PUENTE = False lo apaga.
CLARITY_PUENTE = True
if CLARITY_PUENTE:
    html = must(html, '</head>', """<script>(function(){
  if(window.__epClar)return;window.__epClar=1;
  function c(){try{window.clarity.apply(null,arguments)}catch(e){}}
  var q=new URLSearchParams(location.search),p=location.pathname.replace(/\\/+$/,'')||'/';
  [['anuncio','utm_term'],['campana','utm_campaign'],['conjunto','utm_content'],['fuente','utm_source']].forEach(function(k){var v=q.get(k[1]);if(v)c('set',k[0],v.slice(0,100));});
  c('set','pagina',p);
  if(p==='/'||p==='/oferta-a')c('set','e06',p==='/oferta-a'?'B':'A');
  var sidOk=0;
  var N={selector_view:'vio_ofertas',cta_click:'toco_comprar',plan_select:'eligio_plan',form_start:'empezo_formulario',
    form_error:'error_formulario',pay_select:'eligio_pago',plan_click:'toco_confirmar',upsell_view:'vio_upsell',pay_fallback_cod:'pago_a_contraentrega'};
  var hecho={};
  function ev(n){if(!hecho[n]){hecho[n]=1;c('event',n);}}
  function leer(body){try{
    if(typeof body!=='string')return;var b=JSON.parse(body);if(!b||!b.ev)return;var x=b.extra||{};
    if(b.sid&&!sidOk){sidOk=1;c('set','sid',String(b.sid).slice(0,40));}
    if(x.plan)c('set','plan',String(x.plan).slice(0,40));
    if(b.ev==='form_field'){
      if(x.field==='_visto')ev('vio_formulario');
      else if(x.field==='_salida'){ if(!(x.completos||[]).length)ev('salio_sin_escribir'); if(x.ultimo)c('set','ultimo_campo',String(x.ultimo).slice(0,30)); }
      else ev('escribio_dato');
      return;}
    if(N[b.ev])ev(N[b.ev]);
  }catch(e){}}
  function esEmbudo(u){return /funnel-track/.test(String(u||''));}
  try{var sb=navigator.sendBeacon&&navigator.sendBeacon.bind(navigator);
    if(sb)navigator.sendBeacon=function(u,d){if(esEmbudo(u)){if(typeof d==='string')leer(d);else if(d&&d.text)d.text().then(leer).catch(function(){});}return sb(u,d);};}catch(e){}
  try{var f=window.fetch&&window.fetch.bind(window);
    if(f)window.fetch=function(u,o){if(esEmbudo(u)&&o&&typeof o.body==='string')leer(o.body);return f(u,o);};}catch(e){}
  var dl=window.dataLayer=window.dataLayer||[],push=dl.push.bind(dl);
  dl.push=function(o){try{if(o&&o.event==='ep_purchase'){ev('pedido');c('upgrade','pedido');}}catch(e){}return push.apply(null,arguments);};
})();</script>
</head>""")
if IMG_A_OFERTAS:
    html = must(html, '</head>', '<style>[data-id="gpGrrwtDmE"] img{cursor:pointer}</style>\n</head>')
    html = must(html, '</body>', """<script>(function(){document.addEventListener('click',function(e){
  var img=e.target.closest&&e.target.closest('[data-id="gpGrrwtDmE"] img');if(!img)return;
  var a=document.querySelector('a[href="#ep-offer-widget"]');if(!a)return;e.preventDefault();a.click();
},false);})();</script>
</body>""")

# /octubre · réplica de la página de octubre (pedido de cesar 2026-11-10): textos y botones de entonces, testimonios de WhatsApp,
# selector de planes en la página y el formulario en una ventana (estilo Releasit), con el mismo checkout de hoy.
# Vista previa, noindex. No cambia la página principal.
if not HERO_V2:
    _oc = html
    for _a, _b in CAMBIOS_TODAS:
        _oc = must(_oc, _b, _a)
    _pg = json.loads((ROOT / 'fuente' / 'octubre' / 'pagina.json').read_text())   # secciones de la página guardada de Shopify (tools/octubre_extraer.py)
    _ORDER_OCT = ['e', 'p0', 'p1', 'oferta', 'p5']
    _body_oc = '\n'.join({'e': secs[0], 'oferta': order_block, 'p0': _pg['sections'][0], 'p1': _pg['sections'][1], 'p5': _pg['sections'][2]}[k] for k in _ORDER_OCT)
    # textos del selector (cesar 2026-11-10): ya hay pago anticipado, así que no se dice "sin tarjeta / sin pagos por adelantado"; es un paquete, no una caja
    _body_oc = must(_body_oc, '<div class="ep-trust-line">🔒 Sin tarjeta · Sin pagos por adelantado</div>', '')
    _body_oc = must(_body_oc, '📦 Caja neutra: nadie sabe qué contiene', '📦 Paquete neutro: nadie sabe qué contiene')
    # los botones del hero y de los testimonios apuntaban a la página de Shopify: aquí bajan a las ofertas sin salir de la página
    _body_oc = re.sub(r'https://enerplu\.lat/pages/html\?[^"#]*#ep-offer-widget', '#ep-offer-widget', _body_oc)
    assert _oc.count(body) == 1, 'octubre: no encuentro el cuerpo'
    _oc = _oc.replace(body, _body_oc)
    assert _oc.count(head_styles) == 1, 'octubre: no encuentro los estilos'
    _oc = _oc.replace(head_styles, _pg['headStyles'])
    _oc = must(_oc, '</head>', '<style>' + (ROOT / 'fuente' / 'octubre' / 'octubre.css').read_text() + '</style>\n</head>')
    _oc = must(_oc, '</body>', '<script>' + (ROOT / 'fuente' / 'octubre' / 'octubre.js').read_text() + '</script>\n</body>')
    if AB_E05:
        _oc = must(_oc, '</body>', ab_send('B', 'E05') + '\n</body>')
    (OUT / 'octubre.html').write_text(_oc)
index_html = html
if AB_E04 and not HERO_V2:
    index_html = must(index_html, '<head>', '<head>\n' + AB_HEAD)
    index_html = must(index_html, '</body>', ab_send('A') + '\n</body>')
if AB_E05 and not HERO_V2:
    index_html = must(index_html, '<head>', '<head>\n' + AB5_HEAD)
    index_html = must(index_html, '</body>', ab_send('A', 'E05') + '\n</body>')
# E-06 (cesar 2026-11-12 10:14 pm, "publica para mañana con la ganadora de E-05"): página actual (A, "/") contra la
# Oferta A (B, "/oferta-a"): mismos 3 planes y precios, sin tachados ni %, precio por tableta, qué incluye cada plan,
# garantía explicada debajo de los planes, sin "hasta 56 % de descuento" en la barra.
# Asignación: localStorage ep_e06 (50/50, fija por navegador); ?ab6=A|B fuerza la variante. AB_E06 = False apaga la prueba.
AB_E06 = True
AB6_HEAD = AB5_HEAD.replace("ab5=", "ab6=").replace("ep_e05", "ep_e06").replace("'/octubre'", "'/oferta-a'")
if not HERO_V2:
    _ofa = html
    _ofa = must(_ofa, '<head>', '<head>\n<script>window.EP_OFERTA_A=true</script>')
    _ofa = must(_ofa, 'Tenemos 3 ofertas disponibles hoy</h2>', 'Elige tu plan</h2>', 2)   # sección + teaser de la ventana (apagada)
    _ofa = must(_ofa, '<p class="eph-sub">🚚 Envío gratis · 💵 Pago al recibir · 📦 Discreto</p>', '<p class="eph-sub">Pagas al recibir · Envío gratis · Paquete discreto</p>')
    _ofa = re.sub(r'\s*<div class="eph-garantia">.*?</div>\s*</div>', '', _ofa, count=1, flags=re.S)
    assert 'eph-garantia' not in _ofa.split('ep-offer-widget')[1].split('</form>')[0], 'oferta-a: quedó el sello de garantía'
    _ofa = must(_ofa, '🎁 <b>Regalo: 3 guías digitales</b> para potenciar tus encuentros. Te llegan por WhatsApp cuando recibes tu pedido.',
                'En todos los planes recibes <b>3 guías digitales</b> por WhatsApp al recibir.')
    _GA = ('<div class="eph-ga"><svg viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
           '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>'
           '<div><b>Garantía Real · Dominio y Élite</b><br>Prueba una caja. Si decides no continuar, te devolvemos el valor correspondiente a las cajas sin abrir.<br>'
           'Tienes 15 días desde la entrega. <a href="/garantia" target="_blank" rel="noopener">Ver condiciones</a></div></div>')
    _ofa = must(_ofa, '<div class="eph-list" role="radiogroup" aria-label="Ofertas" data-ep-render="selector"></div>',
                '<div class="eph-list" role="radiogroup" aria-label="Ofertas" data-ep-render="selector"></div>\n        ' + _GA)
    # barra superior: sin "hasta 56 % de descuento"
    _ofa = _ofa.replace('<span class="epb-item"><i>🔥</i>Oferta hasta <b>%d %% de descuento</b></span>' % PCT, '<span class="epb-item"><b>Paquete discreto</b></span>')
    _ofa = must(_ofa, 'Oferta hasta %d %% de descuento. Pagas al recibir.' % PCT, 'Paquete discreto. Pagas al recibir.')
    assert 'Oferta hasta' not in _ofa, 'oferta-a: quedó "Oferta hasta X % de descuento"'
    _ofa_base = _ofa
    if AB_E06:
        _ofa = must(_ofa, '</body>', ab_send('B', 'E06') + '\n</body>')
    (OUT / 'oferta-a.html').write_text(_ofa)
if AB_E06 and not HERO_V2:
    index_html = must(index_html, '<head>', '<head>\n' + AB6_HEAD)
    index_html = must(index_html, '</body>', ab_send('A', 'E06') + '\n</body>')
# Checkout blanco en 3 pasos (cesar 2026-11-13 7:40 pm, "blanco crealo", maqueta https://claude.ai/artifact/3Lq26TgYytzKKBAoma1Nf1).
# Página aparte /checkout-blanco (igual a "/" con la sección de oferta + formulario en blanco, barra 1 Plan · 2 Entrega · 3 Pago,
# número en cada paso y el envío dentro del paso 2). Mismos planes, precios, campos, bump, resumen y botón.
# Todavía NO entra en ninguna prueba A/B: nadie llega aquí salvo con el enlace. CHECKOUT_BLANCO = False la quita.
CHECKOUT_BLANCO = True
if CHECKOUT_BLANCO and not HERO_V2:
    _ck = html
    _ck = must(_ck, '<section class="ep-order eph-order" id="ep-order"', '<section class="ep-order eph-order ck3" id="ep-order"')
    _ck = must(_ck, '<div class="ep-wrap ep-wrap--form">', '<div class="ep-wrap ep-wrap--form">\n    <div class="ck3-bar" aria-hidden="true"><span>1 Plan</span><span>2 Entrega</span><span>3 Pago</span></div>')
    _ck = must(_ck, '<div class="eph-list" role="radiogroup" aria-label="Ofertas" data-ep-render="selector"></div>',
               '<p class="ck3-step"><span class="ck3-n">1</span>Elige tu plan</p>\n        <div class="eph-list" role="radiogroup" aria-label="Ofertas" data-ep-render="selector"></div>')
    _ck = must(_ck, '<fieldset class="ep-of-block">\n        <legend class="ep-of-legend">¿A dónde te lo enviamos?</legend>',
               '<fieldset class="ep-of-block ck3-addr">\n        <legend class="ep-of-legend"><span class="ck3-n">2</span>¿A dónde te lo enviamos?</legend>')
    _ck = must(_ck, '<fieldset class="ep-of-block" data-ep-ship-block>', '<fieldset class="ep-of-block ck3-ship" data-ep-ship-block>')
    _ck = must(_ck, '<legend class="ep-of-legend">¿Cómo quieres pagar?</legend>', '<legend class="ep-of-legend"><span class="ck3-n">3</span>¿Cómo quieres pagar?</legend>')
    _ck = must(_ck, '</head>', '<style>\n' + (ROOT / 'fuente' / 'checkout-blanco' / 'ck.css').read_text() + '</style>\n</head>')
    _ck = must(_ck, '</body>', '<script>\n' + (ROOT / 'fuente' / 'checkout-blanco' / 'ck.js').read_text() + '</script>\n</body>')
    (OUT / 'checkout-blanco.html').write_text(_ck)

# Checkout en página aparte (cesar 2026-11-13 10:15 pm: "construir un checkout en una página aparte, para que sea dinámico y
# no se vaya a la antigua página"). /pedido = solo plan + entrega + pago: la sección de pedido de la Oferta A (sin tachados)
# con el fondo blanco en 3 pasos; el resto de la página antigua no se muestra. Llega desde /nueva con ?plan=basico|dominio|elite.
# Sin tráfico: nadie llega aquí salvo desde /nueva (vista previa). PEDIDO_APARTE = False la quita.
PEDIDO_APARTE = True
if PEDIDO_APARTE and CHECKOUT_BLANCO and not HERO_V2:
    _pd = _ofa_base
    _pd = must(_pd, '<div class="ep-root" data-ep-theme="negro">\n<section class="ep-order eph-order" id="ep-order"',
               '<div class="ep-root ck-keep" data-ep-theme="negro">\n' + (ROOT / 'fuente' / 'pedido' / 'cabecera.html').read_text() + '\n<section class="ep-order eph-order ck3" id="ep-order"')
    _pd = must(_pd, '<div class="ep-wrap ep-wrap--form">', '<div class="ep-wrap ep-wrap--form">\n    <div class="ck3-bar" aria-hidden="true"><span>1 Plan</span><span>2 Entrega</span><span>3 Pago</span></div>')
    _pd = must(_pd, '<div class="eph-list" role="radiogroup" aria-label="Ofertas" data-ep-render="selector"></div>',
               '<p class="ck3-step"><span class="ck3-n">1</span>Elige tu plan</p>\n        <div class="eph-list" role="radiogroup" aria-label="Ofertas" data-ep-render="selector"></div>')
    _pd = must(_pd, '<fieldset class="ep-of-block">\n        <legend class="ep-of-legend">¿A dónde te lo enviamos?</legend>',
               '<fieldset class="ep-of-block ck3-addr">\n        <legend class="ep-of-legend"><span class="ck3-n">2</span>¿A dónde te lo enviamos?</legend>')
    _pd = must(_pd, '<fieldset class="ep-of-block" data-ep-ship-block>', '<fieldset class="ep-of-block ck3-ship" data-ep-ship-block>')
    _pd = must(_pd, '<legend class="ep-of-legend">¿Cómo quieres pagar?</legend>', '<legend class="ep-of-legend"><span class="ck3-n">3</span>¿Cómo quieres pagar?</legend>')
    _pd = must(_pd, _GA, (ROOT / 'fuente' / 'pedido' / 'garantia.html').read_text())
    _pd, _n = re.subn(r'<div class="eph-libros">.*?</div>', '<div class="eph-libros pd-libros"><img src="/img/guias-libros.webp" alt="Guías Maestro del Orgasmo, Secretos Sexuales y Genio del Sexo" width="1200" height="805" loading="lazy"></div>', _pd, count=1, flags=re.S)
    assert _n == 1, 'pedido: guias'
    _pd, _n = re.subn(r'<p class="eph-trust">.*?</p>', lambda m: (ROOT / 'fuente' / 'pedido' / 'confianza.html').read_text(), _pd, count=1, flags=re.S)
    assert _n == 1, 'pedido: no se encontró el texto de confianza bajo el botón'
    _i = _pd.index('</section>', _pd.index('id="ep-order"')) + len('</section>')
    _pd = _pd[:_i] + '\n' + (ROOT / 'fuente' / 'pedido' / 'pie.html').read_text() + _pd[_i:]
    _pd = re.sub('[\U0001F381\U0001F69A\U0001F4B5\U0001F4E6\U0001F4AC\U0001F6E1\U0001F525]\uFE0F? ?', '', _pd)   # sin emojis en esta página
    _pd = must(_pd, '</head>', '<meta name="robots" content="noindex">\n<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@800;900&display=swap" rel="stylesheet">\n<style>\n'
               + (ROOT / 'fuente' / 'checkout-blanco' / 'ck.css').read_text() + (ROOT / 'fuente' / 'pedido' / 'pedido.css').read_text() + '</style>\n</head>')
    _pd = must(_pd, '</body>', '<script>\n' + (ROOT / 'fuente' / 'checkout-blanco' / 'ck.js').read_text() + (ROOT / 'fuente' / 'pedido' / 'pedido.js').read_text() + '</script>\n</body>')
    (OUT / 'pedido.html').write_text(_pd)
(OUT / 'index.html').write_text(index_html)
if AB_E04 and not HERO_V2:
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run([sys.executable, str(ROOT / 'build.py')], check=True, env=dict(os.environ, EP_HERO_V2='1', EP_OUT=tmp), stdout=subprocess.DEVNULL)
        subprocess.run([sys.executable, str(ROOT / 'tools' / 'maqueta_b.py'), tmp + '/index.html', str(OUT / 'b.html'), '--real'], check=True)
    b_html = (OUT / 'b.html').read_text()
    (OUT / 'b.html').write_text(must(b_html, '</body>', ab_send('B') + '\n</body>'))
elif not HERO_V2 and (OUT / 'b.html').exists():
    (OUT / 'b.html').unlink()
if HERO_V2:
    sys.exit(0)   # en modo hero v2 solo hace falta el index (insumo de /b)
# Vistas de prueba del popup (no dependen de parámetros en el enlace): siempre en modo prueba y con la versión forzada
for _f in OUT.glob('prueba-popup-*.html'): _f.unlink()
if POPUP5 and AB_E04:
    for _n, _v, _src in (('no-te-vayas', 'A', 'b.html'), ('primera-compra', 'B', 'b.html'), ('pagina-a', 'B', 'index.html')):
        _h = (OUT / _src).read_text().replace(AB_HEAD, '').replace(AB5_HEAD, '')
        _h = must(_h, '<head>', "<head>\n<meta name=\"robots\" content=\"noindex\">\n<script>try{history.replaceState(null,'',location.pathname+'?ep_test=1&pop=%s')}catch(e){}</script>" % _v)
        (OUT / ('prueba-popup-%s.html' % _n)).write_text(_h)
# Vista previa del upsell del spray (solo Plan Básico) + bump de estrechante con texto nuevo. NO está en vivo: solo esta página lo activa.
UPSELL_PREVIEW = {
    # especificación completa dada por cesar (10-nov 4:32 pm): textos, colores e imagen
    'upsell': {'key': 'retardante', 'only': 'inicial', 'price': 24900, 'compare': 49900, 'title': 'Spray Retardante Club Velvet 30 ml',
               'image': 'https://res.cloudinary.com/dzlys7ftg/image/upload/f_auto,q_auto,w_500/v1794346291/Botella_Club_Velvet_Retardante_Premium_qj3ihr.webp',
               'eyebrow': 'Espera, antes de confirmar', 'headline': 'Lleva la experiencia al nivel de control absoluto',
               'text': 'Ya tienes la firmeza y resistencia con tu pedido por dentro; el spray Velvet te da el control exacto del reloj por fuera. El combo de blindaje definitivo.',
               'bullets': ['Olvídate de la tensión mental de tener que aguantar', 'Disfruta del ritmo intenso sin miedo a terminar antes', 'Llega en el mismo paquete 100% discreto y sin costo de envío adicional']},
    # texto e imagen dados por cesar (10-nov 4:08 pm)
    'bump': {'title': 'Gel Estrechante Virgyflower (30 ml)', 'contain': True,'image': 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1794344899/ESTRECHANTE_tg6at5.webp',
             'text': 'Efecto astringente y lubricante inmediato: mayor fricción y sensación más intensa para ambos. Fórmula suave en frasco de 30 ml. Se despacha en el mismo paquete 100% discreto.'},
}
if True:
    _h = (OUT / ('b.html' if (OUT / 'b.html').exists() else 'index.html')).read_text().replace(AB_HEAD, '').replace(AB5_HEAD, '')
    _h = must(_h, '<head>', "<head>\n<meta name=\"robots\" content=\"noindex\">\n<script>window.EP_PREVIEW_UPSELL=%s;try{history.replaceState(null,'',location.pathname+'?ep_test=1&pop=N')}catch(e){}</script>" % json.dumps(UPSELL_PREVIEW, ensure_ascii=False))
    (OUT / 'prueba-upsell-spray.html').write_text(_h)
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
    # copia a nuestro servidor las imágenes de Shopify y el CSS/fuentes de losgomosos.lat (si falla, deja el enlace original)
    "buildCommand": "node tools/bajar-recursos.mjs",
    "outputDirectory": "public",
    "cleanUrls": True,
    # con la prueba E-04 apagada, quien llegue a /b vuelve a la página principal (conserva los parámetros del anuncio)
    "redirects": ([] if AB_E04 else [{"source": "/b", "destination": "/", "permanent": False}]),
    "headers": [{"source": "/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=0, must-revalidate"}]},
                {"source": "/rec/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=604800, immutable"}]},
                {"source": "/guias/(.*)", "headers": [{"key": "X-Robots-Tag", "value": "noindex, nofollow, noarchive"}]}]
}, indent=2))
print('ok', len(html))
