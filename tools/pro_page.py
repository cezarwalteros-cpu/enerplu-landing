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

# vista previa: nunca crea pedidos ni mide (fuerza ?ep_test=1)
guard = ("<script>(function(){var u=new URL(location.href);if(u.searchParams.get('ep_test')!=='1'){u.searchParams.set('ep_test','1');"
         "history.replaceState(null,'',u.toString());}})();</script>")
page = page.replace('<!--PRO_GUARD-->', guard, 1)
(P / 'pro.html').write_text(page)
print('pro.html', len(page))
