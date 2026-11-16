"""Plantilla Shopify de la versión pro (cesar 15-11 8:29 pm): misma página que pedido.enerplu.com/pro,
con imágenes y checkout servidos desde pedido.enerplu.com. Los pedidos entran a nuestro checkout (checkout-native, CORS abierto).
Sin el código de la prueba E-08 (no debe mezclarse con la prueba). Uso: python3 tools/shopify_pro.py [salida]"""
import re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
D = 'https://pedido.enerplu.com'
s = (ROOT / 'public' / 'pro.html').read_text()
s, n = re.subn(r'<!--E08-->.*?<!--/E08-->', '', s, flags=re.S)
assert n == 1, n
# rutas propias -> absolutas
s = re.sub(r'''(["'(])/(img|js|rec|garantia|terminos|politica[a-z-]*)''', lambda m: m.group(1) + D + '/' + m.group(2), s)
# links que el checkout pinta con ruta relativa (ej. /garantia) -> pedido.enerplu.com
fix = ("<script>(function(){function f(r){(r||document).querySelectorAll('a[href^=\"/\"]').forEach(function(a){"
       "var h=a.getAttribute('href');if(h.charAt(1)!=='/')a.setAttribute('href','" + D + "'+h);});}"
       "document.addEventListener('DOMContentLoaded',function(){f();new MutationObserver(function(){f();})"
       ".observe(document.body,{subtree:true,childList:true});});})();</script>")
s = s.replace('</body>', fix + '\n</body>', 1)
assert '{% endraw' not in s
out = '{% layout none %}{% raw %}' + s + '{% endraw %}\n'
dst = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'shopify' / 'page.enerplu-pro.liquid'
dst.parent.mkdir(parents=True, exist_ok=True); dst.write_text(out)
left = re.findall(r'''(?:src|href)=["']/(?!/)[^"']*''', s)
print(dst, len(out), 'relativas:', left[:5])
