"""ZAFIR · página con VSL + formulario contraentrega (cesar 25-nov: "fondo negro con formulario COD, muy similar a ENERPLU").

Genera el sitio aparte zafir/ (index.html, js/z.js, og.jpg, vercel.json) a partir del checkout aparte de ENERPLU
(public/checkout.html + public/js/checkout-ep.js), para que el formulario sea el mismo que ya funciona.

  - Arriba: titular + video (VSL). La oferta y el formulario aparecen cuando el video llega a DELAY segundos.
    ?oferta=1 la muestra de una vez (revisión). Quien ya la desbloqueó la vuelve a ver al entrar.
  - LIVE = False: página de muestra. No crea pedidos, no escribe en el CRM y no dispara el pixel.
    Para conectarla: crear el slug en checkout_pages (CRM) y poner LIVE = True.
  - Departamento + ciudad en listas (regla de cesar para todos los formularios), botón verde, sin botón flotante.

Uso: python3 tools/zafir_build.py
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / "public"

# ------------------------------------------------------------------ configuración
LIVE = False                       # True solo cuando el CRM tenga el slug y cesar dé el OK
SLUG = "zafir"
PIXEL = "534952895765160"          # el pixel que usan las campañas viejas de ZAFIR
DELAY = 0                          # segundos de video para mostrar la oferta. 0 = todo visible desde el inicio, como la página que vendía
VIDEO = "https://vz-c91527a7-3a2.b-cdn.net/b62d6978-a4c2-4d3f-aed5-9a2db3a89796/playlist.m3u8"  # Bunny de cesar (biblioteca 821672), subido 25-nov, 9:46 min
TITULAR = "El secreto de los hombres que nunca fallan."  # página que vendía (captura de cesar 25-nov)
# Orden, nombres, etiquetas y precios "antes" de la página que vendía. Precios de venta = mínimos que dio cesar el 25-nov
# (la página vieja tenía 2 botellas a $110.300; el mínimo de cesar es $116.000).
GIFT = "Obsequio sorpresa"   # cesar 25-nov: no hay libros digitales, solo obsequio
PLANS = [
    {"key": "x1", "id": "x1", "name": "1 Botella de ZAFIR", "boxes": 1, "price": 73500, "was": 99900, "tag": "Ideal para probar", "extras": [GIFT], "gift": GIFT},
    {"key": "x2", "id": "x2", "name": "2 Botellas de ZAFIR", "boxes": 2, "price": 116000, "was": 147000, "tag": "TRATAMIENTO RECOMENDADO 🔥", "hot": True, "extras": [GIFT], "gift": GIFT},
    {"key": "x3", "id": "x3", "name": "3 Botellas de ZAFIR", "boxes": 3, "price": 147000, "was": 220500, "tag": "⭐ Más vendido – Ahorras $73.500", "extras": [GIFT], "gift": GIFT},
]
BUMP = 5000                        # "Envío Nacional prioritario con seguro" de la página que vendía
# departamentos donde no hay contraentrega: no salen en la lista (regla de cesar 25-nov)
SIN_COD = {"Amazonas", "Chocó", "Guainía", "Vaupés", "Vichada", "San Andrés y Providencia"}

# ------------------------------------------------------------------ JS del formulario
js = (PUB / "js" / "checkout-ep.js").read_text(encoding="utf-8")


def cambia(viejo, nuevo, n=1):
    global js
    assert js.count(viejo) >= 1, "no encontré: " + viejo[:70]
    js = js.replace(viejo, nuevo) if n == 0 else js.replace(viejo, nuevo, n)


def cambia_re(patron, nuevo):
    global js
    js, k = re.subn(patron, lambda m: nuevo, js, count=1, flags=re.S)
    assert k == 1, "no encontré: " + patron[:70]


cambia_re(r"/\* =+\n   ENERPLU · Checkout aparte.*?=+ \*/",
          "/* ZAFIR · formulario contraentrega de la página con VSL. Generado por tools/zafir_build.py desde checkout-ep.js: no editar a mano. */")
cambia('slug: "enerplu",\n    pixel: "1248121626590977"', 'slug: "%s",\n    pixel: "%s",\n    live: %s' % (SLUG, PIXEL, "true" if LIVE else "false"))
cambia_re(r"var PLANS = \[.*?\n  \];", "var PLANS = " + json.dumps(PLANS, ensure_ascii=False) + ";")
cambia('var TEST = qs.get("ep_test") === "1";', 'var TEST = qs.get("ep_test") === "1" || !CFG.live;')
cambia("ep_ck_", "zf_ck_", 0)
cambia('"ep_sid"', '"zf_sid"', 0)
cambia("if (!window.fbq) {", "if (!window.fbq && !TEST) {")
cambia("var pixel = function (ev, data, opts) { try {", "var pixel = function (ev, data, opts) { if (TEST) return; try {")
cambia_re(r"var alias = \{.*?\};", 'var alias = { "1": "x1", x1: "x1", "2": "x2", x2: "x2", "3": "x3", x3: "x3" };')
cambia('var boldOn = true, transferOn = false, discount = 12000;', 'var boldOn = false, transferOn = false, discount = 0;')
cambia('return p.id === "basico"; })[0].price; };', 'return p.id === "x1"; })[0].price; };')
cambia('"enerplu-"', '"zafir-"', 0)
cambia('funnel("selector_view");\n', '')
cambia('})[0] || PLANS[0];', '})[0] || PLANS[1];')
cambia('var total = function () { return plan.price - disc(); };', 'var bump = false, BUMP = %d;\n  var total = function () { return plan.price - disc() + (bump ? BUMP : 0); };' % BUMP)
cambia('bump: false', 'bump: bump', 0)
cambia('"PÍDELO YA - Pagas al recibir"', '"PEDIR Y PAGAR AL RECIBIR"')
cambia_re(r'm\.length \? "Faltan " \+ m\.length.*?</em>"\s*: pay === "cod"', 'pay === "cod"')   # cesar 25-nov: nada de "Faltan 4 datos", el botón siempre dice lo mismo
cambia('"Hoy no pagas nada · Envío gratis"', '"Pago 100% seguro contra entrega. Pagas al recibir en la puerta de tu casa"')

# tarjetas de los paquetes: tarros en vez de cajas y tabletas, sin foto hasta tener las del producto
cambia_re(r"function paintPlans\(\) \{.*?\n  \}\n\n  function render\(\) \{", r'''function paintPlans() {
    $("#plans").innerHTML = PLANS.map(function (p, i) {
      return '<label class="plan' + (p.hot ? " hot" : "") + '" data-i="' + i + '"><input type="radio" name="plan">' +
        '<span class="ptag">' + esc(p.tag) + "</span>" +
        '<span class="pbody"><span class="radio"></span>' +
        '<img class="pim" src="/img/zafir/b' + p.boxes + '.png" alt="" width="72" height="72">' +
        '<span class="pm"><div class="pn">' + esc(p.name) + '</div><div class="pg">' + ico("gift") + "<span>" + esc(p.gift) + "</span></div></span>" +
        '<span class="pr"><s>ANTES ' + fmt(p.was) + "</s><small>AHORA</small><strong>" + fmt(p.price) + "</strong></span></span></label>";
    }).join("");
  }

  function render() {''')
cambia('''"<li>" + ico("box") + "<span><b>" + plan.boxes + (plan.boxes > 1 ? " cajas" : " caja") + " ENERPLU</b> <em>· " + plan.tablets + " tabletas</em></span></li>" +''',
       '''"<li>" + ico("box") + "<span><b>" + plan.boxes + (plan.boxes > 1 ? " botellas" : " botella") + " de ZAFIR</b></span></li>" +''')
cambia('''"<li>" + ico("bag") + "<span><b>Envío gratis</b> <em>· bolsa negra sellada, sin marcas por fuera</em></span></li>" +''',
       '''"<li>" + ico("bag") + "<span><b>Envío gratis</b> <em>· empaque discreto</em></span></li>";''')
cambia_re(r"\n\s*\(plan\.boxes > 1 \? \"<li>\" \+ ico\(\"shield\"\).*?: \"\"\);", "")
cambia('$("#sumName").textContent = plan.name + " · " + plan.tablets + " tabletas";', '$("#sumName").textContent = plan.name;')
cambia('$("#sumSub").textContent = fmt(plan.price);', '$("#sumSub").innerHTML = "<s>ANTES " + fmt(plan.was) + "</s><b>AHORA " + fmt(plan.price) + "</b>";')
cambia_re(r'\$\("#sumGifts"\)\.innerHTML = .*?: ""\);', '''$("#sumGifts").innerHTML = plan.extras.map(function (x) { return '<div class="row g"><span>' + esc(x) + "</span><span>GRATIS</span></div>"; }).join("") + (bump ? '<div class="row"><span>Envío prioritario con seguro</span><span>' + fmt(BUMP) + "</span></div>" : "");''')
cambia('''esc(plan.name) + " · " + plan.tablets + " tabletas</span><span>"''', '''esc(plan.name) + "</span><span>"''')
cambia_re(r"\(mun \? '<div class=\"eta\">'.*?: \"\"\) \+\n", "")

# página de muestra: el pedido no sale del celular
cambia('  fetch(CFG.api + "?slug=" + CFG.slug + "&vista=0")', '  if (CFG.live) fetch(CFG.api + "?slug=" + CFG.slug + "&vista=0")')
cambia('  fetch(CFG.api + "?slug=" + CFG.slug).catch(function () {});', '  if (CFG.live) fetch(CFG.api + "?slug=" + CFG.slug).catch(function () {});')
cambia('lastChecked = p;\n', 'lastChecked = p;\n    if (!CFG.live) return;\n')
cambia('''(tr ? "<p>Transfiere <b>"''', '''(!tr && !d.paid ? '<div class="pce"><div class="pch"><i></i>PAGO CONTRAENTREGA</div><p>Solo pagarás el pedido una vez que se entregue en tu domicilio.</p></div>' : "") + (tr ? "<p>Transfiere <b>"''')
cambia('    missMsg([]);\n    sending = true;',
       '    missMsg([]);\n    if (!CFG.live) { showDone({ order_number: "PRUEBA", dry_run: true }, { total: total(), paid: false }); return; }\n    sending = true;')

# departamento + ciudad en listas
deps = {}
for bloque in (ROOT / "tools" / "municipios.txt").read_text(encoding="utf-8").strip().split("|"):
    d, ms = bloque.split(":", 1)
    if d not in SIN_COD:
        deps[d] = [re.sub(r"\s*\(.*?\)\s*", " ", m).strip() for m in ms.split(";")]

LISTAS = r'''
  /* ---------- departamento + ciudad en listas; "Mi municipio no aparece" abre el buscador de siempre ---------- */
  var DEPS = __DEPS__;
  var selDep = null, selMun = null, cityText = function () {};
  (function () {
    var cf = fieldOf("city"), lab = cf.querySelector("label"), inp = cf.querySelector(".inp"), hint = cf.querySelector(".hint");
    var box = document.createElement("div"); box.className = "dc";
    box.innerHTML = '<label for="dp">Departamento</label><select id="dp" class="sel vac"><option value="">Elige tu departamento</option>' +
      Object.keys(DEPS).map(function (d) { return "<option>" + esc(d) + "</option>"; }).join("") + "</select>" +
      '<label for="mn" class="l2">Ciudad o municipio</label><select id="mn" class="sel vac" disabled><option value="">Primero elige el departamento</option></select>';
    cf.insertBefore(box, lab); lab.hidden = true; inp.hidden = true;
    selDep = $("#dp"); selMun = $("#mn");
    cityText = function (focus) {
      box.querySelector(".l2").hidden = true; selMun.hidden = true; lab.hidden = false; inp.hidden = false;
      if (focus) { try { F.city.focus(); } catch (e) {} }
    };
    selDep.addEventListener("change", function () {
      selDep.classList.toggle("vac", !selDep.value);
      var ms = DEPS[selDep.value] || [];
      selMun.innerHTML = '<option value="">' + (selDep.value ? "Elige tu ciudad o municipio" : "Primero elige el departamento") + "</option>" +
        ms.map(function (x) { return "<option>" + esc(x) + "</option>"; }).join("") + (selDep.value ? '<option value="__otro">Mi municipio no aparece (escribirlo)</option>' : "");
      selMun.disabled = !selDep.value; selMun.classList.add("vac");
      city = null; F.city.value = ""; cf.classList.remove("good", "bad"); hint.textContent = hints.city;
      if (!started && selDep.value) { started = true; funnel("form_start", { field: "city" }); pixel("InitiateCheckout", { value: plan.price, currency: "COP", num_items: plan.boxes, content_ids: ["zafir-" + plan.id], content_type: "product" }); }
      if (ms.length === 1) { selMun.value = ms[0]; selMun.dispatchEvent(new Event("change")); }
      check();
    });
    selMun.addEventListener("change", function () {
      selMun.classList.toggle("vac", !selMun.value);
      city = null; cf.classList.remove("good", "bad"); hint.textContent = hints.city;
      if (!selMun.value) { F.city.value = ""; check(); return; }
      if (selMun.value === "__otro") { F.city.value = ""; cityText(true); check(); return; }
      var mun = selMun.value, dep = selDep.value;
      F.city.value = mun + ", " + dep;
      search(F.city.value).then(function () {
        if (!city) {
          var ex = items.filter(function (c) { return norm(c.municipio) === norm(mun) && (norm(c.departamento).indexOf(norm(dep).split(" ")[0]) === 0 || norm(dep).indexOf(norm(c.departamento)) === 0); });
          if (ex.length) pickCity(ex[0]); else autoCity();
        }
        sug.hidden = true;
        if (!city && !/no tenemos pago/.test(hint.textContent)) { sug.hidden = false; cityText(true); }
      }).catch(function () { cityText(true); });
    });
  })();
  /* datos guardados: la ciudad que ya había elegido vuelve a verse en las listas */
  function syncSel() {
    if (!selDep) return;
    if (!city) { if (clean(F.city.value)) cityText(false); return; }
    var d = Object.keys(DEPS).filter(function (k) { return norm(k) === norm(city.departamento) || norm(k).indexOf(norm(city.departamento)) === 0; })[0];
    var m = d && DEPS[d].filter(function (x) { return norm(x) === norm(city.municipio); })[0];
    if (!m) { cityText(false); return; }
    selDep.value = d; selDep.classList.remove("vac");
    selMun.innerHTML = DEPS[d].map(function (x) { return "<option>" + esc(x) + "</option>"; }).join("") + '<option value="__otro">Mi municipio no aparece (escribirlo)</option>';
    selMun.disabled = false; selMun.value = m; selMun.classList.remove("vac");
  }
  var bp = $("#bp"); if (bp) bp.addEventListener("change", function () { bump = bp.checked; funnel("bump_toggle", { on: bump }); render(); });
  window.ZF = { funnel: funnel, pixel: pixel, test: TEST, live: CFG.live, plan: function () { return plan; } };

  paintPlans(); render(); loadDraft(); syncSel();
})();
'''.replace("__DEPS__", json.dumps(deps, ensure_ascii=False, separators=(",", ":")))
cambia("\n  paintPlans(); render(); loadDraft();\n})();\n", LISTAS)
import sys
for m in re.finditer(r"(?i)enerplu", js): print("AVISO ENERPLU:", js[max(0,m.start()-80):m.start()+60].replace("\n"," "), file=sys.stderr)
assert "tableta" not in js

# ------------------------------------------------------------------ HTML
ck = (PUB / "checkout.html").read_text(encoding="utf-8")
utm = ck[ck.index("<!-- UTM:INI -->"):ck.index("<!-- UTM:FIN -->") + len("<!-- UTM:FIN -->")]
css = ck[ck.index("<style>") + 7:ck.index("</style>")]
sprite = ck[ck.index('<svg width="0" height="0"'):ck.index("</svg>") + 6]
main = ck[ck.index('<main class="wrap">'):ck.index("</main>") + 7]


def html_cambia(viejo, nuevo):
    global main
    assert viejo in main, "no encontré en el HTML: " + viejo[:60]
    main = main.replace(viejo, nuevo, 1)


def html_re(patron, nuevo):
    global main
    main, k = re.subn(patron, lambda m: nuevo, main, count=1, flags=re.S)
    assert k == 1, "no encontré en el HTML: " + patron[:60]


html_re(r'<section class="hero">.*?</section>\s*', "")
html_cambia("Bolsa negra sellada y discreta", "Empaque discreto")
html_cambia("Elige tu plan<small>Entre más cajas, menos pagas por cada tableta</small>", "PASO 1. SELECCIONA LA OFERTA")
html_cambia("¿A dónde te lo enviamos?<small>Solo 4 datos. Toma menos de 1 minuto.</small>", "PASO 2. DIGITA TUS DATOS DE ENVÍO")
html_cambia('<div class="plans" id="plans"></div>', '''<div class="tabla"><div class="th"><span>OFERTAS</span><span>PRECIOS</span></div><div class="plans" id="plans"></div></div>''')
html_cambia("<h3>Resumen</h3>", "<h3>RESUMEN DE PEDIDO</h3>")
html_cambia("PÍDELO YA - Pagas al recibir", "PEDIR Y PAGAR AL RECIBIR")
html_cambia("Hoy no pagas nada · Envío gratis", "Pago 100% seguro contra entrega. Pagas al recibir en la puerta de tu casa")
html_cambia('<span id="sumName">Plan Dominio Total</span><span id="sumSub">$129.900</span>', '<span id="sumName">2 Botellas de ZAFIR</span><span id="sumSub">$116.000</span>')
html_cambia('<strong id="tot">$129.900</strong>', '<strong id="tot">$116.000</strong>')
html_re(r'<div class="trust">.*?</div>\s*</div>', '''<div class="sellos">
    <div class="sello"><svg class="i"><use href="#truck"/></svg><b>ENVÍO GRATIS</b><small>Pago contra entrega</small></div>
    <div class="sello"><svg class="i"><use href="#shield"/></svg><b>CALIDAD PREMIUM</b></div>
    <div class="sello"><svg class="i"><use href="#check"/></svg><b>PRODUCTO GARANTIZADO</b></div>
  </div>''')
html_re(r'<footer class="ft">.*?</footer>', '<footer class="ft"><p>ZAFIR · Pago contra entrega en Colombia.</p></footer>')
assert "ENERPLU" not in main and "/garantia" not in main

EXTRA_CSS = r"""
/* ===== ZAFIR: fondo negro, tarjetas blancas (mismo esquema del checkout de ENERPLU) ===== */
:root{--bg:#0A0A0A;color-scheme:dark}
body{background:#0A0A0A;color:#fff}
.h h2{color:#fff}.h small{color:#A9A59A}
.f label{color:#fff}.f label span{color:#A9A59A}
.hint{color:#A9A59A}.f.bad .hint{color:#FF9B90}
.sub{color:#CFCABB}.sub svg{color:#34C267}
.ft,.ft p{color:#8D897E}
.okl{background:#F5F5F2}.okc2{color:#0D0D0D}
.plan{grid-template-columns:22px 58px minmax(0,1fr) auto;color:#0D0D0D}
.pay,.perk,.tr,.incl{color:#0D0D0D}
.tr{color:#4B5563}
.qty{width:58px;height:58px;border-radius:12px;background:#0D0D0D;color:#E9CB6B;display:grid;place-items:center;align-content:center;font:700 10px/1 Inter,sans-serif;letter-spacing:.06em;text-transform:uppercase;border:1px solid #D4AF37}
.qty b{font:900 24px/1 var(--disp);color:#fff;margin-bottom:3px}
.dc label.l2{margin-top:12px}
select.sel{display:block;width:100%;height:52px;border:1.5px solid var(--line);border-radius:14px;padding:0 44px 0 14px;font:500 16px Inter,sans-serif;color:#0D0D0D;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 16px center;-webkit-appearance:none;appearance:none;outline:none}
select.sel:focus{border-color:var(--gold);box-shadow:0 0 0 4px rgba(212,175,55,.25)}
select.sel.vac{color:#6B7280}
select.sel:disabled{background-color:#E5E7EB;color:#6B7280}
.f.good select.sel{border-color:#9FD5B0}.f.bad select.sel{border-color:#F0A39A}
.inp[hidden]+.hint{margin-top:5px}

/* pasos (no quedan pegados arriba: en la página del video no hay barras fijas) */
.steps{max-width:460px;margin:18px auto 0;padding:0 16px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.st{font-size:11px;font-weight:600;color:#8D897E;display:flex;flex-direction:column;gap:6px}
.st i{display:block;height:3px;border-radius:3px;background:#2A2A2A;position:relative;overflow:hidden}

/* ===== VSL ===== */
.vsl{max-width:520px;margin:0 auto;padding:18px 16px 8px;text-align:center}
.zf-brand{font:900 20px/1 var(--disp);letter-spacing:.34em;color:var(--gold);padding-left:.34em}
.vsl h1{font:900 25px/1.14 var(--disp);letter-spacing:-.01em;margin:14px 0 14px;text-wrap:balance;color:#fff}
.vsl h1 b{color:var(--gold2);font-weight:900}
.player{position:relative;border-radius:18px;overflow:hidden;background:#000;aspect-ratio:16/9;margin:0 auto;border:1px solid #2A2519;box-shadow:0 0 0 1px rgba(212,175,55,.12),0 30px 60px -30px rgba(212,175,55,.35)}
.player.v916{aspect-ratio:9/16;max-height:74vh}
.player video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;display:block}
.unmute{position:absolute;inset:0;border:0;background:rgba(0,0,0,.38);color:#fff;cursor:pointer;display:grid;place-items:center;font:inherit;padding:0}
.unmute span{display:flex;flex-direction:column;align-items:center;gap:6px;background:rgba(13,13,13,.86);border:1.5px solid var(--gold);border-radius:16px;padding:12px 18px;font:800 15px/1.2 var(--disp);animation:lat 1.6s ease-in-out infinite}
.unmute svg{width:30px;height:30px;stroke:var(--gold2);fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.unmute small{font:500 12.5px Inter,sans-serif;color:#CFCABB}
@keyframes lat{50%{transform:scale(1.045)}}
.pausa{position:absolute;inset:0;border:0;background:rgba(0,0,0,.5);color:#fff;font:800 16px var(--disp);cursor:pointer}
.nv{position:absolute;inset:0;display:grid;place-content:center;gap:8px;padding:24px;text-align:center;font:800 17px/1.25 var(--disp);color:#fff;background:#0D0D0D}
.nv small{display:block;font:500 13px/1.4 Inter,sans-serif;color:#A9A59A}
.pbar{position:absolute;left:0;right:0;bottom:0;height:5px;background:rgba(255,255,255,.16)}
.pbar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--goldd),var(--gold),var(--gold2))}
.lock{margin:14px 0 0;font-size:14px;color:#CFCABB;display:flex;gap:8px;justify-content:center;align-items:center}
.lock svg{width:16px;height:16px;color:var(--gold)}
.lock.listo{color:#8FE0A8;font-weight:700}.lock.listo svg{color:#8FE0A8}
.ver{margin:14px auto 0;max-width:460px}
#oferta{animation:sube .6s ease both}
@keyframes sube{from{opacity:0;transform:translateY(18px)}}

/* ===== estructura de la página que vendía (captura de cesar 25-nov) ===== */
body{background:#0B0E17}
.lock[hidden]{display:none}
.vsl{text-align:left;padding-top:26px}
.vsl h1{font:700 34px/1.25 Georgia,"Times New Roman",serif;color:#C9A45C;margin:0 0 18px;letter-spacing:0}
.bajada{font-size:15.5px;line-height:1.35;color:#fff;margin:0 0 16px}
.rayos{list-style:none;margin:0 0 16px;padding:0;font-size:15.5px;line-height:1.35;color:#fff}
.rayos li{padding-left:26px;position:relative;margin-bottom:4px}
.rayos li::before{content:"⚡";position:absolute;left:0}
.player{border-radius:12px;border:1px solid #7A1526;box-shadow:none}
.unmute span{background:#19C332;border:2px solid #fff;box-shadow:0 0 0 4px #19C332;border-radius:14px;padding:14px 20px;gap:8px;font:700 13.5px/1.2 Inter,sans-serif;color:#fff}
.unmute span small{font:700 12.5px Inter,sans-serif;color:#fff}
.unmute svg{width:46px;height:46px;stroke:#fff}
.prueba{max-width:520px;margin:0 auto;padding:22px 16px 0}
.rr{font:900 21px/1.1 var(--disp);color:#E11D48;margin:0 0 14px;letter-spacing:.01em}
.testi{background:#fff;color:#374151;border-radius:14px;padding:18px 18px 14px}
.testi .est{color:#F59E0B;letter-spacing:2px;font-size:15px}
.testi p{font-style:italic;font-size:15px;line-height:1.5;margin:10px 0 12px}
.quien{display:flex;gap:10px;align-items:center;border-top:1px solid #EEF0F3;padding-top:12px}
.quien i{width:34px;height:34px;border-radius:50%;background:#EEF2F7;display:grid;place-items:center;font:700 13px Inter,sans-serif;color:#475569;font-style:normal}
.quien b{display:block;color:#111;font-size:14px}.quien small{color:#6B7280;font-size:12px}
.res{background:#DDDDDD;color:#111;border-radius:6px;margin-top:22px;padding:12px 10px 14px;text-align:center}
.res h3{font:900 28px/1 var(--disp);margin:0 0 10px;letter-spacing:.01em}
.res ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.res li{font:700 10.5px/1.25 Inter,sans-serif}
.res li::before{content:"✓";display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:#111;color:#E9CB6B;font-size:18px;margin:0 auto 6px}
.invima{background:#fff;color:#111;margin-top:10px;padding:16px;display:flex;gap:16px;align-items:center;justify-content:center}
.orig{width:92px;height:92px;border-radius:50%;flex:none;background:radial-gradient(circle,#1a1a1a 55%,#C9A227 57%,#F3D46B 70%,#B8860B 100%);color:#E9CB6B;display:grid;place-content:center;text-align:center;font:800 10px/1.1 Inter,sans-serif}
.orig b{display:block;font:900 20px/1 var(--disp);color:#F3D46B}
.reg{font:900 25px/1.15 var(--disp);letter-spacing:.02em}
.llamado{background:#000;text-align:center;padding:30px 16px 6px;margin-top:0}
.llamado h2{font:700 29px/1.25 Georgia,"Times New Roman",serif;color:#fff;margin:0 0 14px}
.llamado p{font:700 16.5px/1.25 Inter,sans-serif;color:#fff;margin:0 auto;max-width:380px}
#oferta{background:#000}
.wrap{display:block!important;max-width:520px!important;padding-bottom:40px}
.side{position:static!important;display:flex;flex-direction:column}
.perks,.incl,#paso3,.num{display:none!important}
.h h2{font:900 21px/1.15 var(--disp);color:#fff;text-transform:uppercase}
.tabla{background:#fff;border-radius:8px;border:2px solid #F5E11A;overflow:hidden}
.th{display:flex;justify-content:space-between;padding:12px 14px;font:800 12px Inter,sans-serif;color:#111;border-bottom:1px solid #E5E7EB}
.plans{gap:0}
.plan{grid-template-columns:22px 60px minmax(0,1fr) auto;gap:10px;border:0;border-bottom:1px solid #E5E7EB;border-radius:0;padding:16px 10px;background:#fff;color:#111;box-shadow:none!important}
.plan:last-child{border-bottom:0}
.plan.sel{background:#fff;border-color:#E5E7EB}
.plan .radio{border-color:#8A8A8A}.plan.sel .radio{border-color:#1D6FE0}.plan .radio::after{background:#1D6FE0}
.pim{width:60px;height:60px;object-fit:contain;border:1px solid #EEE;border-radius:4px;background:#fff}
.ptag{display:inline-block;background:#1F2937;color:#fff;font:700 11px/1.2 Inter,sans-serif;padding:4px 8px;margin-bottom:6px}
.pn{font:700 15px/1.2 Inter,sans-serif;color:#111}
.pr s{display:block;font:700 12px Inter,sans-serif;color:#8A8A8A}
.pr strong{font:800 13.5px Inter,sans-serif;color:#111}
.plan.hot .pr strong{color:#E00000}
.bump{display:flex;gap:14px;align-items:flex-start;background:#F9E51B;color:#111;border-radius:0 0 8px 8px;padding:14px 16px;margin-top:-2px;cursor:pointer}
.bump input{width:24px;height:24px;flex:none;margin-top:6px;accent-color:#16A34A}
.bump b{display:block;font:600 19px/1.3 Inter,sans-serif}
.bump small{display:block;font:700 12.5px/1.6 Inter,sans-serif;margin-top:8px}
.btn{flex-direction:column;gap:2px;border-radius:8px;min-height:74px;background:#28A745;font:900 19px/1.15 Georgia,"Times New Roman",serif;letter-spacing:.06em;color:#0B0B0B}
.btn small{display:block;font:500 16px Inter,sans-serif;letter-spacing:.02em}
.btn>svg{display:none}
.cta{order:1}.sub{font-style:italic;color:#fff;text-align:center;justify-content:center}.sub svg{display:none}
.sellos{order:2;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:22px 0 4px}
.sello{aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#F3D46B 0 58%,#1a1a1a 60% 90%,#C9A227 92%);display:grid;place-content:center;justify-items:center;text-align:center;color:#111;padding:22px}
.sello svg{width:24px;height:24px;color:#111;margin-bottom:3px}
.sello b{font:800 8px/1.1 Inter,sans-serif;letter-spacing:.02em}.sello small{font:600 7px Inter,sans-serif;color:#111}
.sum{order:3;background:#fff;color:#111;border-radius:4px;border:0;margin-top:20px}
.sum::after{display:none}
.sum h3{color:#111;text-align:center;font:900 20px var(--disp);letter-spacing:0;margin-bottom:14px}
.sum .row{color:#111;font-weight:700;align-items:center}.sum .row.g{color:#111}
#sumSub{text-align:right}#sumSub s{display:block;color:#8A8A8A}#sumSub b{display:block;color:#E00000}
.sum .row.t{border-top:1px solid #E5E7EB;color:#374151}.sum .row.t strong{color:#111;font:800 20px Inter,sans-serif}
.sum .note{color:#6B7280}
.pce{order:4;background:#F3F4F6;color:#4B5563;border-radius:8px;margin-top:16px;overflow:hidden;text-align:center}
.pch{background:#fff;text-align:left;padding:14px 18px;font:800 14px Inter,sans-serif;color:#4B5563;display:flex;gap:12px;align-items:center;border-bottom:1px solid #E5E7EB}
.pch i{width:16px;height:16px;border-radius:50%;background:#F97316}
.pce p{margin:0;padding:22px 20px;font-size:14.5px;line-height:1.6}
.ft{order:5}
@media (min-width:960px){.vsl{max-width:620px}.prueba{max-width:620px}}

/* ===== v2 (cesar 25-nov: mismos textos, fuentes profesionales y colores más llamativos) ===== */
:root{--tit:"Playfair Display",Georgia,serif;--cond:"Oswald","Archivo",sans-serif;--oro:linear-gradient(100deg,#B8860B 0%,#F7D774 28%,#FFF1B8 50%,#F7D774 72%,#B8860B 100%);--rojo:#FF1F3D;--verde:#19D160}
body{background:radial-gradient(120% 60% at 50% 0,#2A1205 0,#0B0706 46%,#000 100%) #000;background-attachment:scroll}
.vsl{padding-top:30px}
.vsl h1{font:900 39px/1.12 var(--tit);background:var(--oro);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:-.005em;margin-bottom:16px;text-wrap:balance}
.bajada{font-size:16.5px;line-height:1.45;color:#F3EEE2}
.rayos{font-size:16.5px;line-height:1.4}
.rayos li{margin-bottom:8px;padding-left:30px}
.rayos li b{color:#F7D774}
.rayos li::before{content:"";top:2px;width:20px;height:20px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F7D774'%3E%3Cpath d='M13 2L4 14h6l-1 8 9-12h-6z'/%3E%3C/svg%3E") no-repeat center/contain}
.player{border-radius:16px;border:2px solid #F7D774;box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 46px -6px rgba(247,215,116,.55)}
.unmute span{background:var(--verde);box-shadow:0 0 0 4px var(--verde),0 0 40px rgba(25,209,96,.7);font:700 14px/1.2 var(--cond);letter-spacing:.04em;text-transform:uppercase}
.unmute span small{font:600 13px var(--cond);letter-spacing:.04em}
.rr{font:700 27px/1 var(--cond);letter-spacing:.03em;color:var(--rojo);text-shadow:0 0 22px rgba(255,31,61,.55);display:flex;align-items:center;gap:10px}
.rr::after{content:"";flex:1;height:2px;background:linear-gradient(90deg,var(--rojo),transparent)}
.testi{border-radius:18px;border-top:5px solid #F7D774;box-shadow:0 22px 40px -22px rgba(247,215,116,.6)}
.testi .est{color:#FFB400;font-size:19px}
.testi p{font:italic 600 17px/1.5 var(--tit);color:#1B1B1B}
.quien i{background:#111;color:#F7D774}
.res{background:linear-gradient(180deg,#1A1408,#0B0906);color:#fff;border:1.5px solid #F7D774;border-radius:16px;padding:18px 8px 16px}
.res h3{font:700 32px/1 var(--cond);letter-spacing:.05em;background:var(--oro);-webkit-background-clip:text;background-clip:text;color:transparent}
.res li{font:600 11px/1.25 Inter,sans-serif;color:#F3EEE2}
.res li::before{width:44px;height:44px;background:var(--oro);color:#111;font-weight:900;font-size:21px;box-shadow:0 0 18px rgba(247,215,116,.55)}
.invima{background:linear-gradient(180deg,#fff,#F4EFE0);border-radius:16px;margin-top:14px;border:2px solid #F7D774}
.reg{font:700 27px/1.12 var(--cond);letter-spacing:.04em}
.llamado{background:transparent;padding-top:34px}
.llamado h2{font:900 33px/1.15 var(--tit);background:var(--oro);-webkit-background-clip:text;background-clip:text;color:transparent}
.llamado p{font:600 17px/1.35 Inter,sans-serif;color:#fff}
#oferta{background:transparent}
.h h2{font:700 25px/1.1 var(--cond);letter-spacing:.03em;color:#fff}
.h h2::first-line{color:#F7D774}
.tabla{border:2.5px solid #F7D774;border-radius:14px 14px 0 0;box-shadow:0 0 40px -8px rgba(247,215,116,.6)}
.th{background:#111;color:#F7D774;font:600 13px var(--cond);letter-spacing:.14em;border-bottom:0}
.plan{padding:18px 12px}
.plan.sel{background:linear-gradient(90deg,#FFF6CC,#FFFDF2);box-shadow:inset 5px 0 0 var(--rojo)!important}
.plan .radio{width:24px;height:24px}.plan.sel .radio{border-color:var(--rojo)}.plan .radio::after{background:var(--rojo);width:12px;height:12px}
.ptag{font:600 11.5px/1.2 var(--cond);letter-spacing:.06em;text-transform:uppercase;background:#111;color:#F7D774;border-radius:4px;padding:4px 8px}
.plan.hot .ptag{background:var(--rojo);color:#fff}
.pn{font:800 16px/1.2 Inter,sans-serif}
.pr s{font:600 12px Inter,sans-serif}
.pr strong{font:700 17px var(--cond);letter-spacing:.01em}
.plan.hot .pr strong{color:var(--rojo)}
.bump{background:linear-gradient(180deg,#FFE93B,#FFD400);border:2.5px dashed #D10000;border-radius:0 0 14px 14px;margin-top:0}
.bump b{font:700 20px/1.25 var(--cond);letter-spacing:.01em}
.bump small{font:600 12.5px/1.5 Inter,sans-serif}
.f label{font:600 15px Inter,sans-serif}
.inp input,select.sel{border-radius:12px}
.inp input:focus,select.sel:focus{border-color:#F7D774;box-shadow:0 0 0 4px rgba(247,215,116,.35)}
.btn{border-radius:14px;min-height:82px;background:linear-gradient(180deg,#3BF07F,#19D160 45%,#0E9F45);color:#04220F;font:700 25px/1.1 var(--cond);letter-spacing:.06em;box-shadow:0 0 0 3px rgba(25,209,96,.25),0 18px 44px -10px rgba(25,209,96,.85);animation:late 1.8s ease-in-out infinite}
.btn small{font:700 15px Inter,sans-serif;letter-spacing:.02em;color:#04220F}
.btn em{font-style:normal}
@keyframes late{50%{transform:scale(1.025);box-shadow:0 0 0 6px rgba(25,209,96,.18),0 22px 54px -8px rgba(25,209,96,1)}}
@media (prefers-reduced-motion:reduce){.btn{animation:none}}
.sub{font:italic 500 14px/1.4 Inter,sans-serif;color:#F3EEE2}
.sello{background:radial-gradient(circle,#FFF1B8 0,#F7D774 34%,#B8860B 58%,#111 60% 90%,#F7D774 92%);box-shadow:0 0 26px -6px rgba(247,215,116,.7)}
.sello b{font:700 9px/1.1 var(--cond);letter-spacing:.04em}
.sum{border-radius:16px;border-top:5px solid #F7D774}
.sum h3{font:700 24px var(--cond);letter-spacing:.04em}
#sumSub b{color:var(--rojo)}
.sum .row.t strong{font:700 26px var(--cond);color:#0E9F45}
.pce{border-radius:16px}
.pch{font:600 15px var(--cond);letter-spacing:.08em;color:#111}
.pch i{background:var(--rojo);box-shadow:0 0 0 4px rgba(255,31,61,.2)}
@media (min-width:960px){.vsl h1{font-size:46px}}
/* ===== tarjetas de oferta v3 (cesar 25-nov: "mejora las tarjetas de ofertas") ===== */
.tabla{background:none;border:0;box-shadow:none;border-radius:0;overflow:visible}
.th{display:none}
.plans{gap:16px;display:flex;flex-direction:column}
.plan,.plan.sel{display:block;position:relative;padding:0;border-radius:18px;border:2px solid #3A2F12;background:linear-gradient(160deg,#1C1608,#0C0A05 70%);color:#fff;overflow:hidden;box-shadow:none!important;transition:border-color .2s,transform .15s}
.plan:last-child{border-bottom:2px solid #3A2F12}
.plan.sel,.plan.sel:last-child{border-color:#F7D774;background:linear-gradient(160deg,#2B2009,#120D04 70%);box-shadow:0 0 0 3px rgba(247,215,116,.22),0 0 44px -6px rgba(247,215,116,.7)!important}
.ptag{display:block;margin:0;border-radius:0;padding:8px 14px;text-align:center;font:600 13px/1.2 var(--cond);letter-spacing:.1em;background:#2A220D;color:#F7D774}
.plan.hot .ptag{background:linear-gradient(90deg,#C8001E,#FF1F3D,#C8001E);color:#fff}
.plan.sel:not(.hot) .ptag{background:var(--oro);color:#111}
.pbody{display:grid;grid-template-columns:26px 72px minmax(0,1fr) auto;gap:12px;align-items:center;padding:16px 14px}
.plan .radio{width:26px;height:26px;background:transparent;border:2px solid #7A6A3A}
.plan.sel .radio{border-color:#F7D774;background:#F7D774}
.plan .radio::after{width:12px;height:12px;background:#111}
.pim{width:72px;height:72px;border-radius:12px;border:0;background:#fff;padding:3px}
.pn{font:700 19px/1.15 var(--cond);letter-spacing:.02em;color:#fff;text-transform:uppercase}
.pg{color:#F7D774;font:600 12px/1.3 Inter,sans-serif;margin-top:6px}
.pg svg{width:14px;height:14px;flex:none;color:#F7D774}
.pr{text-align:right}
.pr s{font:600 12px Inter,sans-serif;color:#9A9383}
.pr small{display:block;font:600 11px var(--cond);letter-spacing:.14em;color:#F7D774;margin-top:4px}
.pr strong,.plan.hot .pr strong{display:block;font:700 27px/1 var(--cond);color:#fff;letter-spacing:0}
.plan.sel .pr strong{background:var(--oro);-webkit-background-clip:text;background-clip:text;color:transparent}
.btn{min-height:76px;font:700 23px/1.1 var(--cond)}
/* cesar 25-nov: el resumen y el cuadro de pago van en la página de gracias, no en la landing */
.sum{display:none!important}
.okc2 .pce{margin:14px 0 4px;text-align:center}
/* resultados con íconos propios */
.res li::before{content:none}
.res li i{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;margin:0 auto 7px;background:var(--oro);color:#111;box-shadow:0 0 18px rgba(247,215,116,.55)}
.res li i svg{width:26px;height:26px}
"""

VSL_JS = r"""
(function(){
  var DELAY=__DELAY__, SRC="__VIDEO__";
  var q=new URLSearchParams(location.search), v=document.getElementById('v'), pl=document.getElementById('pl');
  var un=document.getElementById('un'), pa=document.getElementById('pa'), pb=document.getElementById('pb');
  var of=document.getElementById('oferta'), lk=document.getElementById('lk'), ver=document.getElementById('ver');
  var sonido=false, abierto=false, hitos={}, maxT=0;
  function zf(ev,extra){try{window.ZF&&window.ZF.funnel(ev,extra||{})}catch(e){}}
  function abrir(como){
    if(abierto)return; abierto=true;
    if(DELAY<=0||como==='sin_video'){lk.hidden=true;}
    of.hidden=false; ver.hidden=(DELAY<=0);
    lk.className='lock listo'; lk.lastElementChild.textContent='Oferta desbloqueada. Elige tu paquete abajo.';
    try{localStorage.setItem('zf_oferta','1')}catch(e){}
    zf('offer_unlock',{como:como,seg:Math.round(maxT)}); zf('selector_view');
    try{window.ZF&&window.ZF.pixel('ViewContent',{content_name:'ZAFIR',content_ids:['zafir'],content_type:'product',currency:'COP',value:window.ZF.plan().price})}catch(e){}
  }
  ver.addEventListener('click',function(){zf('cta_click',{where:'vsl'});document.getElementById('paso1').scrollIntoView({behavior:'smooth',block:'start'})});
  /* cargar el video: Safari lo reproduce directo; en los demás navegadores con hls.js */
  function cargar(){
    if(/\.m3u8/.test(SRC)&&(window.MediaSource||window.ManagedMediaSource)&&!/iP(hone|ad|od)/.test(navigator.userAgent)){
      var s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
      s.onload=function(){ if(window.Hls&&Hls.isSupported()){var h=new Hls({capLevelToPlayerSize:true,startLevel:-1}); h.loadSource(SRC); h.attachMedia(v); h.on(Hls.Events.MANIFEST_PARSED,arrancar); h.on(Hls.Events.ERROR,function(e,d){ if(d&&d.fatal)sinVideo(); });} else { v.src=SRC; arrancar(); } };
      s.onerror=function(){ v.src=SRC; arrancar(); };
      document.head.appendChild(s);
    } else { v.src=SRC; arrancar(); }
  }
  /* si el video no carga: aviso en el reproductor y la oferta no se queda escondida para siempre */
  var caido=false;
  function sinVideo(){ if(caido)return; caido=true; un.hidden=true; pa.hidden=true; document.getElementById('nv').hidden=false; zf('vsl_error'); abrir('sin_video'); }
  v.addEventListener('error',sinVideo);
  function arrancar(){ v.muted=true; var p=v.play(); if(p&&p.catch)p.catch(function(){}); }
  v.addEventListener('loadedmetadata',function(){ if(v.videoHeight>v.videoWidth)pl.classList.add('v916'); });
  v.addEventListener('playing',function(){ if(!hitos.play){hitos.play=1; zf('vsl_play');} });
  un.addEventListener('click',function(){
    sonido=true; un.hidden=true; v.muted=false; try{v.currentTime=0}catch(e){}
    var p=v.play(); if(p&&p.catch)p.catch(function(){});
    zf('vsl_sound');
  });
  v.addEventListener('click',function(){ if(!sonido)return; if(v.paused){v.play();}else{v.pause();} });
  pa.addEventListener('click',function(){ pa.hidden=true; v.play(); });
  v.addEventListener('pause',function(){ if(sonido&&!v.ended)pa.hidden=false; });
  v.addEventListener('play',function(){ pa.hidden=true; });
  document.addEventListener('visibilitychange',function(){ if(document.hidden&&sonido&&!v.paused)v.pause(); });
  v.addEventListener('timeupdate',function(){
    var d=v.duration||0, t=v.currentTime||0; if(!d)return;
    if(sonido&&t>maxT)maxT=t;
    pb.style.width=(Math.pow(t/d,0.55)*100).toFixed(2)+'%';   /* avanza rápido al inicio, como las barras de los VSL */
    if(sonido){[25,50,75,95].forEach(function(h){ if(!hitos[h]&&t/d*100>=h){hitos[h]=1; zf('vsl_'+h);} });}
    if(sonido&&DELAY>0&&t>=DELAY)abrir('video');
  });
  v.addEventListener('ended',function(){ abrir('fin'); });
  var ya=false; try{ya=localStorage.getItem('zf_oferta')==='1'}catch(e){}
  function inicio(){ if(DELAY<=0)abrir('directo'); else if(q.get('oferta')==='1')abrir('link'); else if(ya)abrir('regreso'); cargar(); }
  if(document.readyState==='complete')inicio(); else window.addEventListener('load',inicio);
})();
""".replace("__DELAY__", str(DELAY)).replace("__VIDEO__", VIDEO)

PAGE = """<!doctype html>
<html lang="es">
<head>""" + utm + """
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0A0A0A">
<title>Tienda AlNatural</title>
<meta name="description" content="Pago contra entrega y envío discreto a toda Colombia.">
<meta property="og:type" content="website">
<meta property="og:title" content="Tienda AlNatural">
<meta property="og:description" content="Pago contra entrega y envío discreto a toda Colombia.">
<meta property="og:image" content="/og.jpg">
<!-- ZAFIR: página con VSL + formulario contraentrega. Generada por tools/zafir_build.py (no editar a mano). __ESTADO__ -->
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://vz-c91527a7-3a2.b-cdn.net" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800;900&family=Oswald:wght@500;600;700&display=swap">
<style>""" + css + EXTRA_CSS + """</style>
</head>
<body>

""" + sprite + """

<div id="tb" hidden style="background:#B42318;color:#fff;text-align:center;font:700 13px Inter,sans-serif;padding:8px">__AVISO__</div>
<input id="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">

<section class="vsl">
  <h1>__TITULAR__</h1>
  <p class="bajada">Basta de químicos y soluciones temporales, acá está el suplemento líquido que está devolviendo la seguridad a miles de hombres en Colombia.</p>
  <ul class="rayos">
    <li><b>Firmeza natural:</b> Siente el cambio desde el primer shot.</li>
    <li><b>Resistencia total:</b> Recupera el control y deja que ella pida más.</li>
  </ul>
  <div class="player" id="pl">
    <video id="v" playsinline webkit-playsinline muted preload="auto" disablepictureinpicture controlslist="nodownload noplaybackrate"></video>
    <button class="unmute" id="un" type="button" aria-label="Activar el sonido"><span><small>Su video ya comenzó…</small><svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/><path d="M3 3l18 18"/></svg>Pulse aquí para escuchar</span></button>
    <button class="pausa" id="pa" type="button" hidden>Toca para continuar</button>
    <div class="nv" id="nv" hidden>__SINVIDEO__</div>
    <div class="pbar"><i id="pb"></i></div>
  </div>
  <p class="lock" id="lk"><svg class="i"><use href="#lock"/></svg><span>Sigue viendo para desbloquear tu oferta</span></p>
  <div class="ver"><button class="btn" id="ver" type="button" hidden><span>VER MI OFERTA</span><svg class="i"><use href="#arrow"/></svg></button></div>
</section>

<div id="oferta" hidden>
<div hidden><i id="s1"></i><i id="s2"></i><i id="s3"></i></div>
<section class="prueba">
  <h2 class="rr">RESULTADOS REALES</h2>
  <div class="testi"><div class="est">★★★★★</div><p>"A los 45 años ya me fallaba la firmeza. Con Zafir recuperé la dureza de antes desde la primera semana."</p><div class="quien"><i>A</i><span><b>Alberto S.</b><small>Medellín</small></span></div></div>
  <div class="res">
    <h3>RESULTADOS:</h3>
    <ul>
      <li><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/><path d="M5 12h3l1.5-2.5 2 5 1.5-2.5H19"/></svg></i>Aumento garantizado de la circulación</li>
      <li><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4 0 7-2.7 7-6.8 0-3.6-2.6-5.8-4-8.2-.6 2-1.7 3-3 3.6.4-2.8-.6-5.6-3-8.6 0 4.2-4 6.2-4 13.2C5 19.3 8 22 12 22z"/></svg></i>Más libido y vigor sexual</li>
      <li><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M10 2.5h4M12 2.5V6"/></svg></i>Erecciones firmes y mucho más duraderas</li>
      <li><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6z"/><path d="M8.5 12l2.4 2.4 4.6-4.8"/></svg></i>Ayuda a controlar la eyaculación</li>
      <li><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19s-6-3.7-6-8.4A3.4 3.4 0 0 1 9 8.4a3.4 3.4 0 0 1 6 2.2"/><path d="M16 21s-5-3-5-7a2.8 2.8 0 0 1 5-1.8 2.8 2.8 0 0 1 5 1.8c0 4-5 7-5 7z"/></svg></i>Dale mucho más placer a tu pareja</li>
    </ul>
  </div>
  <div class="invima"><span class="orig"><b>100%</b>ORIGINAL</span><span class="reg">REGISTRO INVIMA<br>RSA-3599-2025</span></div>
</section>
<section class="llamado">
  <h2>RECUPERA TU VIGOR HOY MISMO</h2>
  <p>Llena el formulario y paga al recibir tu paquete discreto.</p>
</section>
""" + main + """
</div>

<div class="ok" id="ok" hidden><div class="okc2" id="okBox" tabindex="-1"></div></div>

<script src="/js/z.js" defer></script>
<script>""" + VSL_JS + """</script>
</body>
</html>
"""
PAGE = (PAGE.replace("__TITULAR__", TITULAR)
        .replace("__ESTADO__", "EN VIVO" if LIVE else "MUESTRA: no crea pedidos ni dispara el pixel")
        .replace("__SINVIDEO__", "No pudimos cargar el video.<small>Recarga la página.</small>")
        .replace("__AVISO__", "MODO PRUEBA: este pedido no se crea" if LIVE else "PÁGINA DE MUESTRA: todavía no crea pedidos"))

# ------------------------------------------------------------------ sitio aparte (cesar 25-nov)
# Nada de ZAFIR se puede asociar con las otras marcas: sitio propio en la carpeta zafir/ (proyecto de Vercel aparte),
# sin comentarios, sin nombres de otras marcas, sin archivos compartidos, imagen de vista previa propia
# y el servidor de pedidos detrás de /api del mismo dominio.
import shutil
OUT = ROOT / "zafir"
(OUT / "js").mkdir(parents=True, exist_ok=True)
(OUT / "img").mkdir(parents=True, exist_ok=True)
for n in (1, 2, 3):
    shutil.copyfile(ROOT / "tools" / "zafir-img" / ("b%d.png" % n), OUT / "img" / ("b%d.png" % n))

def sin_comentarios_js(t):
    # quita /* ... */ y // de línea completa (no toca URLs ni textos)
    t = re.sub(r"/\*.*?\*/", "", t, flags=re.S)
    t = re.sub(r"(?m)^\s*//.*\n", "", t)
    t = re.sub(r"(?m)[ \t]+//[^\"'\n]*$", "", t)
    return re.sub(r"\n\s*\n+", "\n", t)

def limpiar(t):
    t = t.replace("https://mqwscbpdozrdiqxofmod.supabase.co/functions/v1/checkout-native", "/api/c")
    t = t.replace("https://mqwscbpdozrdiqxofmod.supabase.co/functions/v1/funnel-track", "/api/f")
    t = t.replace("ep_utm", "zf_utm").replace('"ep_test"', '"zf_test"').replace("ep_sid", "zf_sid")
    return t

jz = limpiar(sin_comentarios_js(js))
pg = limpiar(PAGE)
pg = re.sub(r"<!--.*?-->", "", pg, flags=re.S)
pg = re.sub(r"<style>(.*?)</style>", lambda m: "<style>" + re.sub(r"/\*.*?\*/", "", m.group(1), flags=re.S) + "</style>", pg, flags=re.S)
pg = re.sub(r"<script>(.*?)</script>", lambda m: "<script>" + sin_comentarios_js(m.group(1)) + "</script>", pg, flags=re.S)
pg = re.sub(r'\s*<div class="logos">.*?</div>', "", pg, flags=re.S)
pg = re.sub(r"\n\s*\n+", "\n", pg)
PROHIBIDO = r"(?i)enerplu|bienestar|gasfrut|collagen|\bmgc\b|todoguate|losgomosos|tiendavital|origenvital|supabase|cloudinary|og-negro|/img/pay|ep_|checkout-ep|derman|vital mastery"
for nombre, t in (("index.html", pg), ("js/z.js", jz)):
    m = re.search(PROHIBIDO, t)
    assert not m, "quedó rastro de otra marca en %s: %r" % (nombre, t[max(0, m.start() - 60):m.end() + 40])
    (OUT / nombre).write_text(t, encoding="utf-8")

# imagen de vista previa propia (negro y dorado, solo la palabra ZAFIR)
from PIL import Image, ImageDraw, ImageFont
og = Image.new("RGB", (1200, 630), (8, 6, 4))
d = ImageDraw.Draw(og)
for r in range(420, 0, -6):
    c = int(38 * (1 - r / 420))
    d.ellipse((600 - r * 1.6, 315 - r, 600 + r * 1.6, 315 + r), fill=(8 + c, 6 + int(c * .7), 4))
try:
    fnt = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 150)
except OSError:
    fnt = ImageFont.load_default()
TXT = "Tienda AlNatural"   # cesar 25-nov: el título y la vista previa no dicen ZAFIR
fnt = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 96)
w = d.textlength(TXT, font=fnt)
d.text(((1200 - w) / 2, 255), TXT, font=fnt, fill=(247, 215, 116))
og.save(OUT / "og.jpg", quality=88)

(OUT / "vercel.json").write_text(json.dumps({
    "framework": None, "buildCommand": "", "outputDirectory": ".", "cleanUrls": True,
    "rewrites": [
        {"source": "/ZAFIRO", "destination": "/"},
        {"source": "/zafiro", "destination": "/"},
        {"source": "/api/c", "destination": "https://mqwscbpdozrdiqxofmod.supabase.co/functions/v1/checkout-native"},
        {"source": "/api/f", "destination": "https://mqwscbpdozrdiqxofmod.supabase.co/functions/v1/funnel-track"},
    ],
    "headers": [{"source": "/(.*)", "headers": [{"key": "X-Robots-Tag", "value": "noindex"}]}],
}, indent=2) + "\n", encoding="utf-8")
print("ok zafir/index.html", len(pg), "· zafir/js/z.js", len(jz))
