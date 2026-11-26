"""Vista previa (cesar 15-11 6:50 pm): la página de siempre (pedido.enerplu.com) con diseño profesional y efectos.
Mismo contenido, mismas ofertas y el checkout nuevo de /ofertas. Sale en /pro, sin píxel ni embudo, siempre en modo prueba.
Fuente: fuente/pro/pro.html. Reseñas: el mismo bloque de /nueva (120 reseñas). Uso: python3 tools/pro_page.py"""
import re, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
P = ROOT / 'public'
sys.path.insert(0, str(ROOT / 'tools'))
import vieja_checkout as vc

page = (ROOT / 'fuente' / 'pro' / 'pro.html').read_text()
nv = (P / 'nueva.html').read_text()

# cinta: 8 repeticiones para el bucle continuo
item = ('<span class="tick-i"><svg class="p-ic"><use href="#i-bolt"/></svg>Oferta hasta 55 % de descuento</span><span class="tick-d"></span>'
        '<span class="tick-i"><svg class="p-ic"><use href="#i-cash"/></svg>Pagas al recibir</span><span class="tick-d"></span>'
        '<span class="tick-i"><svg class="p-ic"><use href="#i-truck"/></svg>Envío gratis</span><span class="tick-d"></span>')
page = page.replace('<!--TICK-->', item * 8, 1)

# reseñas: sección + script de /nueva, y su CSS
r = nv.index('<section id="resenas"'); re_end = nv.index('</script>', r) + len('</script>')
page = page.replace('<!--RESENAS-->', nv[r:re_end], 1)
a = nv.index('/* reseñas:'); b = nv.find('/*', a + 5)
css = nv[a:b].split('</style>')[0]
# las clases de las reseñas son todas .enerplu-review*: no chocan con el resto de la página
page = page.replace('/*RESENAS_CSS*/', css, 1)

# checkout nuevo (el mismo de /ofertas)
page = vc.embed(page, (P / 'checkout.html').read_text())

# cesar 15-11 7:38 pm: sin la tarjeta "Estás a un paso" ni sus 3 fichas (repetían envío gratis / pagas al recibir / bolsa negra)
page, n1 = re.subn(r'\s*<section class="hero">.*?</section>\s*<div class="perks">.*?</div>\s*</div>', '\n', page, count=1, flags=re.S)
assert n1 == 1
# título del selector (texto de cesar)
old_h = '<h2>Elige tu plan<small>Entre más cajas, menos pagas por cada tableta</small></h2></div>'
assert old_h in page
page = page.replace(old_h, '<h2>Elige tu arsenal<small>Asegura tu arsenal ya: entre más cajas lleves, más barato te sale cada polvo.</small></h2></div>'
                    '\n    <p class="ars-p">Cada caja trae 10 tabletas: 10 noches en las que mandas tú. Toca tu plan y pide. <b>Pagas al recibir.</b></p>', 1)

# LIVE=True (python3 tools/pro_page.py --live): sin modo prueba forzado y con la misma medición de /ofertas
# (píxel 1248121626590977, Clarity, etiquetas de Clarity y embudo funnel-track). Todo eso no mide nada con ?ep_test=1.
LIVE = '--live' in sys.argv
if LIVE:
    of = (P / 'ofertas.html').read_text()
    keep = []
    for m in re.finditer(r'<script(?![^>]*src)[^>]*>(.*?)</script>', of, re.S):
        b = m.group(1)
        if len(b) < 8000 and ("fbq('init'" in b or '"clarity", "script"' in b or 'window.__epClar' in b or 'window.__epFunnel' in b):
            keep.append('<script>' + b + '</script>')
    assert len(keep) == 4, len(keep)
    page = page.replace('<!--PRO_GUARD-->', '', 1).replace('</head>', '\n'.join(keep[:2]) + '\n</head>', 1)
    page = page.replace('</body>', '\n'.join(keep[2:]) + '\n</body>', 1)
    page = page.replace('<meta name="robots" content="noindex">\n', '', 1)

# vista previa: nunca crea pedidos ni mide (fuerza ?ep_test=1)
guard = ("<script>(function(){var u=new URL(location.href);if(u.searchParams.get('ep_test')!=='1'){u.searchParams.set('ep_test','1');"
         "history.replaceState(null,'',u.toString());}})();</script>")
page = page.replace('<!--PRO_GUARD-->', guard, 1)
(P / 'pro.html').write_text(page)
print('pro.html', len(page))
