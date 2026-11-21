#!/usr/bin/env python3
"""Convierte public/siempre.html (página de siempre limpia) en archivos de tema Shopify.

Uso: python3 tools/shopify_siempre.py [SRC] [OUT_DIR]
Salida (OUT_DIR, por defecto shopify-siempre/):
  layout/enerplu-landing.liquid        layout mínimo (sin header/footer del tema)
  sections/enerplu-siempre.liquid      sección que pinta la página
  snippets/ep-siempre-head.liquid      <head> (estilos, píxel, Clarity)
  snippets/ep-siempre-body-N.liquid    cuerpo partido en trozos < 200 KB (límite Shopify 256 KB)
  templates/product.enerplu-siempre.json  plantilla de producto que usa todo lo anterior
"""
import os, re, sys, json

SRC = sys.argv[1] if len(sys.argv) > 1 else "public/siempre.html"
OUT = sys.argv[2] if len(sys.argv) > 2 else "shopify-siempre"
BASE = "https://pedido.enerplu.com"
MAX = 200_000

h = open(SRC, encoding="utf-8").read()

# 1) quitar noindex y el reparto de la prueba E-08 (solo aplica en Vercel)
h = h.replace('<meta name="robots" content="noindex">\n', "").replace('<meta name="robots" content="noindex">', "")
h = re.sub(r"<!--E08--><script>.*?</script>", "", h, flags=re.S).replace("<!--/E08-->", "")
assert "E08" not in h, "quedó rastro de E08"

# 2) rutas relativas -> absolutas a pedido.enerplu.com (garantía, términos, imágenes)
h = re.sub(r'''(["'(])/(garantia|terminos|img/)''', lambda m: f"{m.group(1)}{BASE}/{m.group(2)}", h)

head = h[h.index("<head>") + 6 : h.index("</head>")]
body_open = re.search(r"<body[^>]*>", h)
body_cls = re.search(r'class="([^"]*)"', body_open.group(0))
body = h[body_open.end() : h.rindex("</body>")]

for bad in ("{% endraw %}", "{%- endraw"):
    assert bad not in h

def raw(s):
    return "{% raw %}" + s + "{% endraw %}\n"

# 3) partir el cuerpo en fronteras seguras (entre etiquetas de primer nivel)
def split(s):
    parts, start = [], 0
    while len(s) - start > MAX:
        cut = start + MAX
        # retroceder hasta un cierre de bloque de primer nivel fuera de <script>/<style>
        cands = [m.end() for m in re.finditer(r"</(section|div|script|style)>\s*\n", s[start:cut])]
        ok = None
        for c in reversed(cands):
            pos = start + c
            pre = s[:pos]
            if pre.count("<script") == pre.count("</script>") and pre.count("<style") == pre.count("</style>"):
                ok = pos; break
        assert ok and ok > start, "no encontré un corte seguro"
        parts.append(s[start:ok]); start = ok
    parts.append(s[start:])
    return parts

chunks = split(body)
for d in ("layout", "sections", "snippets", "templates"):
    os.makedirs(os.path.join(OUT, d), exist_ok=True)

def w(p, s):
    with open(os.path.join(OUT, p), "w", encoding="utf-8") as f:
        f.write(s)
    print(f"{p}: {len(s.encode()):,} bytes")

w("snippets/ep-siempre-head.liquid", raw(head))
for i, c in enumerate(chunks, 1):
    w(f"snippets/ep-siempre-body-{i}.liquid", raw(c))

renders = "\n".join(f"{{% render 'ep-siempre-body-{i}' %}}" for i in range(1, len(chunks) + 1))
w("sections/enerplu-siempre.liquid", renders + """
{% schema %}
{ "name": "ENERPLU página de siempre", "settings": [] }
{% endschema %}
""")

w("layout/enerplu-landing.liquid", f"""<!DOCTYPE html>
<html lang="es">
<head>
{{{{ content_for_header }}}}
{{% render 'ep-siempre-head' %}}
</head>
<body class="{body_cls.group(1) if body_cls else ''}">
{{{{ content_for_layout }}}}
</body>
</html>
""")

w("templates/product.enerplu-siempre.json", json.dumps({
    "layout": "enerplu-landing",
    "sections": {"main": {"type": "enerplu-siempre", "settings": {}}},
    "order": ["main"],
}, ensure_ascii=False, indent=2) + "\n")
