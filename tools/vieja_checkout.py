"""Vista previa (cesar 15-11): la página antigua (/) con el checkout nuevo dentro, en lugar de su sección de pedido.
Genera public/vieja-checkout.html a partir de public/index.html + public/checkout.html. No cambia ninguna otra página."""
import re, pathlib
P = pathlib.Path(__file__).resolve().parent.parent / 'public'
old = (P / 'index.html').read_text()
ck = (P / 'checkout.html').read_text()

css = re.search(r'<style>(.*?)</style>', ck, re.S).group(1)
def scope(css):
    out, i = [], 0
    # recorre reglas de primer nivel; @media se procesa por dentro, @keyframes se deja igual
    def rules(block):
        res, j = [], 0
        while j < len(block):
            k = block.find('{', j)
            if k < 0: res.append(block[j:]); break
            sel = block[j:k].strip()
            depth, m = 1, k + 1
            while depth:
                depth += {'{': 1, '}': -1}.get(block[m], 0); m += 1
            body = block[k + 1:m - 1]
            if sel.startswith('@media'):
                res.append(sel + '{' + rules(body) + '}')
            elif sel.startswith('@'):
                res.append(sel + '{' + body + '}')
            else:
                parts = []
                for s in sel.split(','):
                    s = s.strip()
                    if s in (':root', 'html', 'body'): parts.append('#ckn')
                    elif s.startswith('body'): parts.append('#ckn' + s[4:])
                    elif s == '*': parts.append('#ckn,#ckn *')
                    else: parts.append('#ckn ' + s)
                res.append(','.join(parts) + '{' + body + '}')
            j = m
        return ''.join(res)
    return rules(css)
sc = scope(css)
sc = sc.replace('#ckn::before{', '#ckn .nope::before{')   # la franja negra del notch solo en el checkout aparte
extra = """
#ckn{padding:8px 0 0;border-radius:0;font:15px/1.45 Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
#ckn .cta{position:sticky;bottom:0}
#ckn .ckn-top{top:0}
#ckn .ft{display:none}
"""
main = re.search(r'(<div id="tb".*?</div>\s*<input id="hp"[^>]*>)\s*<main class="wrap">(.*?)</main>\s*(<div class="ok".*?</div></div>)', ck, re.S)
steps = re.search(r'<div class="steps">.*?</div></div>', ck).group(0)
svg = re.search(r'<svg width="0" height="0".*?</svg>', ck, re.S).group(0)
block = ('<section id="ep-order" class="ckn-sec">\n<div id="ckn">' + svg + '<div class="top ckn-top">' + steps + '</div>' + main.group(1) + '<main class="wrap">' + main.group(2) + '</main>' + main.group(3) + '</div>\n</section>')

# los botones de arriba bajan a #ep-offer-widget y el embudo mide 'vio planes' con .ep-plans: se conservan
block = block.replace('<div id="ckn">', '<div id="ckn"><span id="ep-offer-widget" style="display:block;position:relative;top:-8px"></span>', 1)
block = block.replace('<section class="sec" id="paso1">', '<section class="sec ep-plans" id="paso1">', 1)
a = old.index('<section class="ep-order eph-order" id="ep-order"')
b = old.index('</section>', a) + len('</section>')
# la sección vieja puede tener secciones internas: cerrar en el </section> que balancea
depth, j = 0, a
for m in re.finditer(r'<section\b|</section>', old[a:]):
    depth += 1 if m.group(0) != '</section>' else -1
    if depth == 0: b = a + m.end(); break
page = old[:a] + block + old[b:]
fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=Inter:wght@400;500;600;700;800&display=swap">'
page = page.replace('</head>', '<meta name="robots" content="noindex">\n' + fonts + '\n<style>' + sc + extra + '</style>\n</head>', 1)
page = page.replace('</body>', '<script src="/js/checkout-ep.js" defer></script>\n</body>', 1)
(P / 'vieja-checkout.html').write_text(page)
print('ok', len(old), '->', len(page), 'quitado', b - a)
