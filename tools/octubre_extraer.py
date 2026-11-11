#!/usr/bin/env python3
"""Extrae de la página guardada de Shopify (enerplu.lat/pages/html, "Guardar como: página web completa") lo que usa /octubre:
las secciones 0 (navbar + hero + testimonios de WhatsApp + sublingual + decisión), 1 (selector de ofertas v7) y 5 (reseñas + legal),
y los estilos del <head>. Escribe fuente/octubre/pagina.json. Uso: python3 tools/octubre_extraer.py <pagina.html>"""
import json, pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
src = pathlib.Path(sys.argv[1]).read_text(encoding='utf8')
old = (ROOT / 'fuente' / 'shopify.json').read_text()
SHOP = 'https://cdn.shopify.com/s/files/1/0748/9418/0397/files/'

def url_de(name):
    # 1) la misma imagen en la captura anterior de Shopify (url completa con versión)
    m = re.search(r'https?:(?:\\?/\\?/)[^"\'\s)]*?/' + re.escape(name) + r'(?:\?[^"\'\s)\\]*)?', old)
    if m:
        return m.group(0).replace('\\/', '/')
    return SHOP + name   # 2) carpeta de archivos de la tienda

main_i = re.search(r'<main id="MainContent".*?>', src).end()
main = src[main_i:src.find('</main>', main_i)]
idx = [x.start() for x in re.finditer(r'<section id="shopify-section-[^"]+"', main)]
secs = [main[a:b] for a, b in zip(idx, idx[1:] + [len(main)])]
KEEP = (0, 1, 5)

def limpiar(s, n):
    def script(m):
        t = m.group(0)
        if 'gp-data' in t[:80] or 'application/json' in t[:120]: return t       # datos de GemPages (inertes)
        if 'src=' in t[:200]: return ''                                           # cargadores de GemPages
        if "ep-wa-ss-dots" in t or "getElementById('resenas')" in t: return t     # dots de WhatsApp y reseñas con fotos
        return ''                                                                 # botones/scroll y selector: los reemplaza octubre.js
    s = re.sub(r'<script[^>]*>.*?</script>', script, s, flags=re.S)
    s = re.sub(r'\./HTML – Men Booster_files/([^"\' )]+)', lambda m: url_de(m.group(1)), s)
    return s

head = re.search(r'<head>(.*?)</head>', src, re.S).group(1)
styles = ''.join(re.findall(r'<style[^>]*>.*?</style>', head, re.S))
styles = re.sub(r'\./HTML – Men Booster_files/([^"\' )]+)', lambda m: url_de(m.group(1)), styles)
out = {'headStyles': styles, 'sections': [limpiar(secs[n], n) for n in KEEP]}
(ROOT / 'fuente' / 'octubre' / 'pagina.json').write_text(json.dumps(out, ensure_ascii=False))
left = re.findall(r'\./HTML – Men Booster_files/[^"\' )]+', json.dumps(out))
print('secciones', [len(x) for x in out['sections']], 'estilos', len(styles), 'locales sin resolver', len(left))
for n in sorted(set(re.findall(r'(?:https?:)?//[^"\' )]+(?:ANTES_1|Alonso_G|BASICO|resultados_enerplu|logo_enerplu|testimonio_1)[^"\' )]*', json.dumps(out))))[:8]: print(n)
