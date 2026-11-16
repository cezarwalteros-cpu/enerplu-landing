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
# uso normal (desde build.py): python3 tools/limpiar_siempre.py public/index.html public/index.html  (limpia en el sitio)
SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'public' / 'siempre.html'
OUT = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / 'public' / 'limpia.html'

ANTES = SRC.read_text()
soup = BeautifulSoup(ANTES, 'html.parser')
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


def visible(t):
    """GemPages esconde por equipo con --d / --d-tablet / --d-mobile:none (celular <768, tableta 768-1023, PC >=1024)."""
    st = t.get('style') or ''
    d = dict(re.findall(r'--d(-tablet|-mobile)?:\s*([\w-]+)', st))
    pc = d.get('', 'block') != 'none'
    return (d.get('-mobile', d.get('', 'block')) != 'none', d.get('-tablet', d.get('', 'block')) != 'none', pc)


def destino_para(t, destino):
    m, ta, pc = visible(t)
    if m and ta and pc:
        return destino
    caja = soup.new_tag('div', attrs={'class': ' '.join(c for c, v in (('ep-no-m', m), ('ep-no-t', ta), ('ep-no-d', pc)) if not v)})
    destino.append(caja)
    return caja


def recorrer(nodo, destino):
    for hijo in list(nodo.contents):
        if not getattr(hijo, 'name', None):
            if isinstance(hijo, Comment) or not str(hijo).strip():
                continue
            destino.append(hijo.extract()); continue
        if es_basura(hijo):
            continue
        if 'gp-custom-code' in (hijo.get('class') or []):
            dst = destino_para(hijo, destino)
            # el "custom code" trae un <div> sin atributos con el HTML propio
            for n in list(hijo.contents):
                if getattr(n, 'name', None) == 'div' and not n.attrs:
                    for m in list(n.contents):
                        dst.append(m.extract())
                elif getattr(n, 'name', None):
                    dst.append(n.extract())
        elif hijo.get('data-id') == 'gpGrrwtDmE':
            destino_para(hijo, destino).append(imagen(hijo))
        elif es_gp(hijo):
            recorrer(hijo, destino_para(hijo, destino))
        else:
            destino.append(hijo.extract())


recorrer(main, nuevo)
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
css_extra.string = ('*,*::before,*::after{box-sizing:border-box}'
                    'html{-webkit-text-size-adjust:100%}'
                    'body{margin:0;font-family:Inter,-apple-system,Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}'
                    'img,picture,video,canvas,svg{display:block;max-width:100%}'
                    'p,h1,h2,h3,h4,h5,h6{overflow-wrap:break-word}'
                    '.ep-no-m,.ep-no-t,.ep-no-d{display:contents}'
                    '@media(max-width:767px){.ep-no-m{display:none!important}}'
                    '@media(min-width:768px) and (max-width:1023px){.ep-no-t{display:none!important}}'
                    '@media(min-width:1024px){.ep-no-d{display:none!important}}'
                    '.ep-resultados{background:#000;text-align:center;line-height:0}'
                    '.ep-resultados img{display:block;width:100%;max-width:1024px;height:auto;margin:0 auto}')
head.append(css_extra)

html = str(soup)
# enlaces legales propios (antes iban a la tienda de Shopify)
html = html.replace('https://enerplu.lat/pages/politica-de-privacidad', '/terminos').replace('https://enerplu.lat/pages/terminos-y-condiciones', '/terminos')
# el pixel no cuenta las visitas de prueba (?ep_test=1), igual que el embudo
html = html.replace("fbq('init', '1248121626590977');\nfbq('track', 'PageView');",
                    "if(!/ep_test=1/.test(location.search)){fbq('init', '1248121626590977');\nfbq('track', 'PageView');}")
html = re.sub(r'\n\s*\n+', '\n', html)
OUT.write_text(html)
print(OUT.name, 'limpia:', len(html), 'bytes (antes', len(ANTES), ')')
