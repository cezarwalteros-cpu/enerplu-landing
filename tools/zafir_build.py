"""ZAFIR · página con VSL + formulario contraentrega (cesar 25-nov: "fondo negro con formulario COD, muy similar a ENERPLU").

Genera public/zafiro.html y public/js/checkout-zf.js a partir del checkout aparte de ENERPLU
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
DELAY = 60                         # segundos de video para mostrar la oferta (PROVISIONAL: falta el minuto real)
VIDEO = "https://vz-d6192f8d-204.b-cdn.net/463c894e-8ea6-4da9-819a-1372d05af358/playlist.m3u8"  # VSL de la página vieja (provisional)
TITULAR = "El secreto natural que está devolviendo la virilidad a miles de hombres en Colombia"  # el de la página vieja
# precios mínimos que dio cesar el 25-nov
PLANS = [
    {"key": "x2", "id": "x2", "name": "2 tarros", "boxes": 2, "price": 113250, "extras": ["Obsequio"], "gift": "Obsequio", "badge": "RECOMENDADO"},
    {"key": "x3", "id": "x3", "name": "3 tarros", "boxes": 3, "price": 147000, "extras": ["Obsequio"], "gift": "Obsequio", "badge": "MEJOR PRECIO", "dark": True},
    {"key": "x1", "id": "x1", "name": "1 tarro", "boxes": 1, "price": 73500, "extras": ["Obsequio"], "gift": "Obsequio", "note": "Para probar"},
]
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

# tarjetas de los paquetes: tarros en vez de cajas y tabletas, sin foto hasta tener las del producto
cambia_re(r"function paintPlans\(\) \{.*?\n  \}\n\n  function render\(\) \{", r'''function paintPlans() {
    $("#plans").innerHTML = PLANS.map(function (p, i) {
      var save = single() * p.boxes - p.price;
      return '<label class="plan" data-i="' + i + '">' +
        (p.badge ? '<span class="badge' + (p.dark ? " dark" : "") + '">' + p.badge + "</span>" : "") +
        '<input type="radio" name="plan"><span class="radio"></span>' +
        '<span class="qty"><b>' + p.boxes + "</b>" + (p.boxes > 1 ? "tarros" : "tarro") + "</span>" +
        '<span><div class="pn">' + esc(p.name) + " de ZAFIR</div>" +
        (p.gift ? '<div class="pg">' + ico("gift") + "<span>+ " + esc(p.gift) + "</span></div>" : "") +
        (p.note ? '<div class="pd">' + p.note + "</div>" : "") +
        (save > 0 ? '<span class="save">' + ico("check") + "Ahorras " + fmt(save) + "</span>" : "") +
        "</span>" +
        '<span class="pr"><strong>' + fmt(p.price) + "</strong>" + (p.boxes > 1 ? "<span>" + fmt(p.price / p.boxes) + " c/tarro</span>" : "") + "</span></label>";
    }).join("");
  }

  function render() {''')
cambia('''"<li>" + ico("box") + "<span><b>" + plan.boxes + (plan.boxes > 1 ? " cajas" : " caja") + " ENERPLU</b> <em>· " + plan.tablets + " tabletas</em></span></li>" +''',
       '''"<li>" + ico("box") + "<span><b>" + plan.boxes + (plan.boxes > 1 ? " tarros" : " tarro") + " de ZAFIR</b></span></li>" +''')
cambia('''"<li>" + ico("bag") + "<span><b>Envío gratis</b> <em>· bolsa negra sellada, sin marcas por fuera</em></span></li>" +''',
       '''"<li>" + ico("bag") + "<span><b>Envío gratis</b> <em>· empaque discreto</em></span></li>";''')
cambia_re(r"\n\s*\(plan\.boxes > 1 \? \"<li>\" \+ ico\(\"shield\"\).*?: \"\"\);", "")
cambia('$("#sumName").textContent = plan.name + " · " + plan.tablets + " tabletas";', '$("#sumName").textContent = plan.name + " de ZAFIR";')
cambia('''<span>Ahorro vs ' + plan.boxes + " Básicos</span><span>-" + fmt(saveTxt)''', '''<span>Ahorro frente a comprar de a 1</span><span>-' + fmt(saveTxt)''')
cambia('''esc(plan.name) + " · " + plan.tablets + " tabletas</span><span>"''', '''esc(plan.name) + " de ZAFIR</span><span>"''')
cambia_re(r"\(mun \? '<div class=\"eta\">'.*?: \"\"\) \+\n", "")

# página de muestra: el pedido no sale del celular
cambia('  fetch(CFG.api + "?slug=" + CFG.slug + "&vista=0")', '  if (CFG.live) fetch(CFG.api + "?slug=" + CFG.slug + "&vista=0")')
cambia('  fetch(CFG.api + "?slug=" + CFG.slug).catch(function () {});', '  if (CFG.live) fetch(CFG.api + "?slug=" + CFG.slug).catch(function () {});')
cambia('lastChecked = p;\n', 'lastChecked = p;\n    if (!CFG.live) return;\n')
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
  window.ZF = { funnel: funnel, pixel: pixel, test: TEST, live: CFG.live, plan: function () { return plan; } };

  paintPlans(); render(); loadDraft(); syncSel();
})();
'''.replace("__DEPS__", json.dumps(deps, ensure_ascii=False, separators=(",", ":")))
cambia("\n  paintPlans(); render(); loadDraft();\n})();\n", LISTAS)
import sys
for m in re.finditer(r"(?i)enerplu", js): print("AVISO ENERPLU:", js[max(0,m.start()-80):m.start()+60].replace("\n"," "), file=sys.stderr)
assert "tableta" not in js
(PUB / "js" / "checkout-zf.js").write_text(js, encoding="utf-8")

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
html_cambia("Elige tu plan<small>Entre más cajas, menos pagas por cada tableta</small>", "Elige tu paquete<small>Entre más tarros lleves, menos pagas por cada uno</small>")
html_cambia('<span id="sumName">Plan Dominio Total</span><span id="sumSub">$129.900</span>', '<span id="sumName">2 tarros de ZAFIR</span><span id="sumSub">$113.250</span>')
html_cambia('<strong id="tot">$129.900</strong>', '<strong id="tot">$113.250</strong>')
html_re(r'\s*<div class="tr"><svg class="i"><use href="#shield"/></svg>Registro INVIMA[^\n]*\n\s*<div class="tr">[^\n]*Garantía Real 15 días</a></div>',
        '\n    <div class="tr"><svg class="i"><use href="#bag"/></svg>Empaque discreto</div>\n    <div class="tr"><svg class="i"><use href="#lock"/></svg>Tus datos están protegidos</div>')
html_re(r'<footer class="ft">.*?</footer>', '<footer class="ft"><p>ZAFIR · Pago contra entrega en Colombia.</p></footer>')
assert "ENERPLU" not in main and "INVIMA" not in main and "/garantia" not in main

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
.player{position:relative;border-radius:18px;overflow:hidden;background:#000;aspect-ratio:9/16;max-height:74vh;margin:0 auto;border:1px solid #2A2519;box-shadow:0 0 0 1px rgba(212,175,55,.12),0 30px 60px -30px rgba(212,175,55,.35)}
.player.h169{aspect-ratio:16/9}
.player video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;display:block}
.unmute{position:absolute;inset:0;border:0;background:rgba(0,0,0,.38);color:#fff;cursor:pointer;display:grid;place-items:center;font:inherit;padding:0}
.unmute span{display:flex;flex-direction:column;align-items:center;gap:10px;background:rgba(13,13,13,.86);border:1.5px solid var(--gold);border-radius:18px;padding:18px 22px;font:800 16px/1.2 var(--disp);animation:lat 1.6s ease-in-out infinite}
.unmute svg{width:38px;height:38px;stroke:var(--gold2);fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
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
@media (min-width:960px){.vsl{max-width:620px}.vsl h1{font-size:32px}.steps{max-width:1040px}}
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
    of.hidden=false; ver.hidden=false;
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
  v.addEventListener('loadedmetadata',function(){ if(v.videoWidth>v.videoHeight)pl.classList.add('h169'); });
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
    if(sonido&&t>=DELAY)abrir('video');
  });
  v.addEventListener('ended',function(){ abrir('fin'); });
  var ya=false; try{ya=localStorage.getItem('zf_oferta')==='1'}catch(e){}
  function inicio(){ if(q.get('oferta')==='1')abrir('link'); else if(ya)abrir('regreso'); cargar(); }
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
<title>ZAFIR | Información para hombres</title>
<meta name="description" content="Mira el video completo. Pago contra entrega en Colombia.">
<meta property="og:type" content="website">
<meta property="og:title" content="ZAFIR | Información para hombres">
<meta property="og:image" content="/og-negro.png">
<!-- ZAFIR: página con VSL + formulario contraentrega. Generada por tools/zafir_build.py (no editar a mano). __ESTADO__ -->
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://vz-d6192f8d-204.b-cdn.net" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=Inter:wght@400;500;600;700;800&display=swap">
<style>""" + css + EXTRA_CSS + """</style>
</head>
<body>

""" + sprite + """

<div id="tb" hidden style="background:#B42318;color:#fff;text-align:center;font:700 13px Inter,sans-serif;padding:8px">__AVISO__</div>
<input id="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">

<section class="vsl">
  <div class="zf-brand">ZAFIR</div>
  <h1>__TITULAR__</h1>
  <div class="player" id="pl">
    <video id="v" playsinline webkit-playsinline muted preload="auto" disablepictureinpicture controlslist="nodownload noplaybackrate"></video>
    <button class="unmute" id="un" type="button" aria-label="Activar el sonido"><span><svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>Toca para activar el sonido<small>El video ya empezó</small></span></button>
    <button class="pausa" id="pa" type="button" hidden>Toca para continuar</button>
    <div class="nv" id="nv" hidden>__SINVIDEO__</div>
    <div class="pbar"><i id="pb"></i></div>
  </div>
  <p class="lock" id="lk"><svg class="i"><use href="#lock"/></svg><span>Sigue viendo para desbloquear tu oferta</span></p>
  <div class="ver"><button class="btn" id="ver" type="button" hidden><span>VER MI OFERTA</span><svg class="i"><use href="#arrow"/></svg></button></div>
</section>

<div id="oferta" hidden>
<div class="steps"><div class="st on" id="s1"><i></i>1 · Tu paquete</div><div class="st" id="s2"><i></i>2 · Tus datos</div><div class="st" id="s3"><i></i>3 · Pago</div></div>
""" + main + """
</div>

<div class="ok" id="ok" hidden><div class="okc2" id="okBox" tabindex="-1"></div></div>

<script src="/js/checkout-zf.js" defer></script>
<script>""" + VSL_JS + """</script>
</body>
</html>
"""
PAGE = (PAGE.replace("__TITULAR__", TITULAR)
        .replace("__ESTADO__", "EN VIVO" if LIVE else "MUESTRA: no crea pedidos ni dispara el pixel")
        .replace("__SINVIDEO__", "No pudimos cargar el video. Recarga la página." if LIVE else "Aquí va el video de ZAFIR.<small>Falta el código de incrustar. Por eso la oferta se muestra de una vez.</small>")
        .replace("__AVISO__", "MODO PRUEBA: este pedido no se crea" if LIVE else "PÁGINA DE MUESTRA: todavía no crea pedidos"))
(PUB / "zafiro.html").write_text(PAGE, encoding="utf-8")
print("ok zafiro.html", len(PAGE), "· checkout-zf.js", len(js))
