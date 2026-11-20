"""Cambia la imagen "Resultados visibles de inmediato" (resultados_enerplu) por la V2 de íconos
(public/img/resultados-v2.webp) en todas las páginas de ENERPLU (cesar 20-nov eligió V2).
/vital y /tienda no la llevan (las arma tools/vital_sin_guias.py). build.py lo corre al final.
Uso: python3 tools/resultados_v2.py"""
import re, pathlib
PUB = pathlib.Path(__file__).resolve().parent.parent / 'public'
NUEVA = ('<img alt="Resultados que se notan de inmediato" decoding="async" height="1024" width="1024" '
         'loading="lazy" src="/img/resultados-v2.webp"/>')
IMG = re.compile(r'<img[^>]*resultados_enerplu[^>]*>')
hechos = []
for f in sorted(PUB.glob('*.html')):
    if f.name in ('vital.html', 'tienda.html'):
        continue
    s = f.read_text(encoding='utf-8')
    n, k = IMG.subn(NUEVA, s)
    if k:
        f.write_text(n, encoding='utf-8'); hechos.append(f.name)
print('resultados v2:', ', '.join(hechos))
