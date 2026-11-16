# Página de siempre LIMPIA (cesar 16-11 10:28 am: "2" = rehacerla limpia con el mismo diseño).
# Toma public/siempre.html (copia de la página de Shopify/GemPages) y deja solo lo que se ve y lo que funciona:
# - quita los envoltorios de GemPages (filas, columnas, estilos .gps) y deja las secciones propias en orden
# - quita el CSS del tema de Shopify (base.css, colores, fuentes duplicadas) y el de Releasit
# - quita los datos JSON de GemPages y los comentarios
# Mismo contenido, mismos scripts (pixel, Clarity, embudo, formulario, reseñas). Sale en public/limpia.html (noindex).
# Uso: python3 tools/limpiar_siempre.py   (después de build.py)
import pathlib, re, sys
from bs4 import BeautifulSoup, Comment

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'public' / 'siempre.html'
OUT = ROOT / 'public' / 'limpia.html'

soup = BeautifulSoup(SRC.read_text(), 'html.parser')
head, body = soup.head, soup.body

# ---------- head ----------
for t in head.find_all('style'):
    css = t.string or ''
    if (t.has_attr('data-shopify') or 'gps-link' in (t.get('class') or [])
            or css.lstrip().startswith(('.gps', 'button._rsi-buy-now-button', '[data-id="gpGrrwtDmE"]'))):
        t.decompose()
for t in head.find_all('link'):
    href = t.get('href', '')
    if 'base.css' in href or 'losgomosos.lat' in href or 'cdn.shopify.com' in href:
        t.decompose()

# ---------- body ----------
main = body.find('main')
nuevo = soup.new_tag('main', id='MainContent')


def es_gp(t):
    if t.name and t.name.startswith('gp-'):
        return True
    cls = ' '.join(t.get('class') or [])
    return bool(re.search(r'(^|\s)(gp-|gps|shopify-section)', cls)) or t.has_attr('data-same-height-display-contents')


def es_basura(t):
    css = t.string or ''
    return (t.name == 'style' and ('gps-link' in (t.get('class') or []) or css.lstrip().startswith(('.gps', '[data-id="gpGrrwtDmE"]')))) \
        or (t.name == 'script' and t.has_attr('gp-data'))


def imagen(el):
    img = el.find('img')
    fig = soup.new_tag('div', attrs={'class': 'ep-resultados'})
    nimg = soup.new_tag('img', src=img['src'], alt='Resultados de ENERPLU', loading='lazy', decoding='async', width='1024', height='1024')
    if img.get('srcset'):
        nimg['srcset'] = img['srcset']
        nimg['sizes'] = '(max-width: 1024px) 100vw, 1024px'
    fig.append(nimg)
    return fig


def recorrer(nodo):
    for hijo in list(nodo.contents):
        if not getattr(hijo, 'name', None):
            if isinstance(hijo, Comment) or not str(hijo).strip():
                continue
            nuevo.append(hijo.extract()); continue
        if es_basura(hijo):
            continue
        if 'gp-custom-code' in (hijo.get('class') or []):
            # el "custom code" trae un <div> sin atributos con el HTML propio
            for n in list(hijo.contents):
                if getattr(n, 'name', None) == 'div' and not n.attrs:
                    for m in list(n.contents):
                        nuevo.append(m.extract())
                elif getattr(n, 'name', None):
                    nuevo.append(n.extract())
        elif hijo.get('data-id') == 'gpGrrwtDmE':
            nuevo.append(imagen(hijo))
        elif es_gp(hijo):
            recorrer(hijo)
        else:
            nuevo.append(hijo.extract())


recorrer(main)
main.replace_with(nuevo)

# los estilos que GemPages metía dentro del cuerpo: solo se quedan los propios
for t in body.find_all('style'):
    css = t.string or ''
    if 'gps-link' in (t.get('class') or []) or css.lstrip().startswith(('.gps', '[data-id="gpGrrwtDmE"]')):
        t.decompose()
for t in body.find_all('script', attrs={'gp-data': True}):
    t.decompose()
for c in soup.find_all(string=lambda x: isinstance(x, Comment)):
    if not c.strip().startswith(('E08', '/E08')):
        c.extract()

css_extra = soup.new_tag('style')
css_extra.string = ('.ep-resultados{background:#000;text-align:center;line-height:0}'
                    '.ep-resultados img{display:block;width:100%;max-width:1024px;height:auto;margin:0 auto}')
head.append(css_extra)

html = str(soup)
html = re.sub(r'\n\s*\n+', '\n', html)
OUT.write_text(html)
print('limpia.html', len(html), 'bytes (antes', len(SRC.read_text()), ')')
