"""Metadata neutra en todas las páginas de ENERPLU (cesar 20-nov: "así deben estar todas las páginas de ENERPLU,
esa data es la que Meta relaciona"). Título, descripción y vista previa de Facebook sin marca, maca, Invima ni tableta;
la vista previa es una imagen negra (/og-negro.png). No toca el kit íntimo (otro hilo) ni /vital y /tienda
(esas las arma tools/vital_sin_guias.py con la imagen en https://tiendavital.lat).
Uso: python3 tools/meta_neutra.py   (build.py lo corre al final)"""
import re, sys, pathlib
PUB = pathlib.Path(__file__).resolve().parent.parent / 'public'
TIT = 'Tienda Vital | Envío a toda Colombia'
DES = 'Pago contra entrega y envío discreto a toda Colombia.'
TITULOS = {'garantia.html': 'Garantía | Tienda Vital', 'terminos.html': 'Términos y condiciones | Tienda Vital',
           'checkout.html': 'Finaliza tu pedido | Tienda Vital', 'energia.html': None}  # None = deja el título
SALTAR = {'vital.html', 'tienda.html', 'bienestarintimo.html', 'pedido-intimo.html'}
OG_RE = re.compile(r'\s*<meta[^>]*(?:property|name)="(?:og:[^"]*|twitter:[^"]*)"[^>]*>')
DESC_RE = re.compile(r'\s*<meta[^>]*name="description"[^>]*>')

def neutra(s, nombre):
    tit = TITULOS.get(nombre, TIT)
    s = OG_RE.sub('', s)
    if tit:
        s, n = re.subn(r'<title>[^<]*</title>', '<title>%s</title>' % tit, s, count=1)
        if n != 1:
            return None
    m = re.search(r'<title>([^<]*)</title>', s)
    t = m.group(1) if m else TIT
    d = DES
    if nombre == 'energia.html':
        dm = DESC_RE.search(s); d = re.search(r'content="([^"]*)"', dm.group(0)).group(1) if dm else DES
    s = DESC_RE.sub('', s)
    og = ('\n<meta content="%s" name="description"/>' % d +
          '\n<meta property="og:type" content="website"/>'
          '\n<meta property="og:title" content="%s"/>' % t +
          '\n<meta property="og:description" content="%s"/>' % d +
          '\n<meta property="og:image" content="/og-negro.png"/>'
          '\n<meta property="og:image:width" content="1200"/>\n<meta property="og:image:height" content="630"/>')
    i = s.find('</title>')
    return s[:i + 8] + og + s[i + 8:]

hechos = []
for f in sorted(PUB.glob('*.html')):
    if f.name in SALTAR:
        continue
    s = f.read_text(encoding='utf-8')
    if '<title>' not in s:
        continue
    n = neutra(s, f.name)
    if n is None:
        sys.exit('sin título: ' + f.name)
    if n != s:
        f.write_text(n, encoding='utf-8'); hechos.append(f.name)
print('metadata neutra:', ', '.join(hechos))
