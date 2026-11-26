/* ZAFIR · formulario contraentrega de la página con VSL. Generado por tools/zafir_build.py desde checkout-ep.js: no editar a mano. */
(function () {
  "use strict";
  var CFG = {
    api: "https://mqwscbpdozrdiqxofmod.supabase.co/functions/v1/checkout-native",
    funnel: "https://mqwscbpdozrdiqxofmod.supabase.co/functions/v1/funnel-track",
    slug: "zafir",
    pixel: "534952895765160",
    live: false
  };
  var PLANS = [{"key": "x1", "id": "x1", "name": "1 Botella de ZAFIR", "boxes": 1, "price": 73500, "was": 99900, "tag": "Ideal para probar", "extras": ["Obsequio sorpresa"], "gift": "Obsequio sorpresa"}, {"key": "x2", "id": "x2", "name": "2 Botellas de ZAFIR", "boxes": 2, "price": 116000, "was": 147000, "tag": "TRATAMIENTO RECOMENDADO 🔥", "hot": true, "extras": ["Obsequio sorpresa"], "gift": "Obsequio sorpresa"}, {"key": "x3", "id": "x3", "name": "3 Botellas de ZAFIR", "boxes": 3, "price": 147000, "was": 220500, "tag": "⭐ Más vendido – Ahorras $73.500", "extras": ["Obsequio sorpresa"], "gift": "Obsequio sorpresa"}];

  var $ = function (s) { return document.querySelector(s); }, $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var fmt = function (n) { return "$" + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  var clean = function (v) { return String(v || "").replace(/\s+/g, " ").trim(); };
  /* P0 (cesar 23-11): acepta 3001234567, 300 123 4567, +57 3001234567, 0057… y 0300…; siempre deja los 10 dígitos */
  var phone10 = function (v) { var d = String(v || "").replace(/\D/g, ""); if (d.indexOf("0057") === 0) d = d.slice(4); else if (d.length > 10 && d.indexOf("57") === 0) d = d.slice(2); if (d.length === 11 && d.charAt(0) === "0") d = d.slice(1); return d.slice(0, 10); };
  var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var norm = function (s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); };
  var ico = function (n) { return '<svg class="i"><use href="#' + n + '"/></svg>'; };

  /* ---------- sesión, UTM y tracking (misma sesión ep_sid que las páginas de ENERPLU) ---------- */
  var qs = new URLSearchParams(location.search);
  var TEST = qs.get("ep_test") === "1" || !CFG.live;
  $("#tb").hidden = !TEST;
  var UTM = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "ttclid"].forEach(function (k) {
    var v = qs.get(k);
    try { if (v) sessionStorage.setItem("zf_ck_" + k, v); else v = sessionStorage.getItem("zf_ck_" + k); } catch (e) {}
    if (v) UTM[k] = v;
  });
  var SID = "";
  try { SID = sessionStorage.getItem("zf_sid") || ""; } catch (e) {}
  if (!SID) { SID = "ep" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem("zf_sid", SID); } catch (e) {} }
  var cookie = function (n) { var m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : null; };
  var tracking = function () { return Object.assign({}, UTM, { fbp: cookie("_fbp"), fbc: cookie("_fbc"), landing_url: location.href.split("#")[0].slice(0, 300), user_agent: navigator.userAgent.slice(0, 300) }); };

  if (!window.fbq && !TEST) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", CFG.pixel); window.fbq("track", "PageView");
  }
  var pixel = function (ev, data, opts) { if (TEST) return; try { window.fbq && window.fbq("track", ev, data, opts || {}); } catch (e) {} };
  var PAGE = (location.host + location.pathname).slice(0, 300);
  function funnel(ev, extra) {
    if (TEST) return;
    var body = JSON.stringify({ sid: SID, ev: ev, page: PAGE, store: CFG.slug, utm_source: UTM.utm_source || null, utm_campaign: UTM.utm_campaign || null,
      utm_content: UTM.utm_content || null, utm_term: UTM.utm_term || null, extra: Object.assign({ ck: 1 }, extra || {}) });
    try { if (navigator.sendBeacon && navigator.sendBeacon(CFG.funnel, new Blob([body], { type: "text/plain" }))) return; } catch (e) {}
    try { fetch(CFG.funnel, { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(function () {}); } catch (e) {}
  }
  /* P0 (cesar 23-11): el pedido tiene límite de 25 s y lleva clave de idempotencia (un reintento nunca crea dos pedidos) */
  var api = function (body) {
    var ctl = body.action === "order" && window.AbortController ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, 25000) : 0;
    var opt = { method: "POST", keepalive: body.action === "cart", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({ slug: CFG.slug, session_id: SID }, body)) };
    if (ctl) opt.signal = ctl.signal;
    var done = function (x) { clearTimeout(t); return x; };
    return fetch(CFG.api, opt)
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j.status = j.status || r.status; return j; }); })
      .then(done, function (e) { clearTimeout(t); throw e; });
  };
  var newKey = function () { try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {} return "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12); };
  var IDEM = null;
  try { IDEM = sessionStorage.getItem("zf_ck_idem"); } catch (e) {}
  var setIdem = function (k) { IDEM = k; try { sessionStorage.setItem("zf_ck_idem", k); } catch (e) {} };
  if (!IDEM) setIdem(newKey());
  /* errores de JavaScript reales (navegador de Facebook / Instagram): quedan en el embudo para poder revisarlos */
  var jsErrs = 0;
  window.addEventListener("error", function (e) { if (jsErrs++ < 3) funnel("js_error", { msg: String((e && e.message) || "").slice(0, 160), src: String((e && e.filename) || "").slice(-60), line: e && e.lineno }); });

  /* ---------- estado ---------- */
  var alias = { "1": "x1", x1: "x1", "2": "x2", x2: "x2", "3": "x3", x3: "x3" };
  var plan = PLANS.filter(function (p) { return p.id === alias[(qs.get("plan") || "").toLowerCase()]; })[0] || PLANS[1];   // orden de cesar 15-11: Dominio, Élite, Básico
  var pay = "cod", city = null, prepaidCity = false, phoneBlock = null;
  var boldOn = false, transferOn = false, discount = 0;
  var single = function () { return PLANS.filter(function (p) { return p.id === "x1"; })[0].price; };
  var disc = function () { return pay === "cod" ? 0 : discount; };
  var bump = false, BUMP = 5000;
  var total = function () { return plan.price - disc() + (bump ? BUMP : 0); };

  function paintPlans() {
    $("#plans").innerHTML = PLANS.map(function (p, i) {
      return '<label class="plan' + (p.hot ? " hot" : "") + '" data-i="' + i + '"><input type="radio" name="plan">' +
        '<span class="ptag">' + esc(p.tag) + "</span>" +
        '<span class="pbody"><span class="radio"></span>' +
        '<img class="pim" src="/img/zafir/b' + p.boxes + '.png" alt="" width="72" height="72">' +
        '<span class="pm"><div class="pn">' + esc(p.name) + '</div><div class="pg">' + ico("gift") + "<span>" + esc(p.gift) + "</span></div></span>" +
        '<span class="pr"><s>ANTES ' + fmt(p.was) + "</s><small>AHORA</small><strong>" + fmt(p.price) + "</strong></span></span></label>";
    }).join("");
  }

  function render() {
    $$(".plan").forEach(function (l) { var on = PLANS[+l.getAttribute("data-i")] === plan; l.classList.toggle("sel", on); l.querySelector("input").checked = on; });
    var saveTxt = single() * plan.boxes - plan.price;
    $("#incl").innerHTML =
      "<li>" + ico("box") + "<span><b>" + plan.boxes + (plan.boxes > 1 ? " botellas" : " botella") + " de ZAFIR</b></span></li>" +
      plan.extras.map(function (x) { return "<li>" + ico("gift") + "<span><b>" + esc(x) + "</b> <em>· de regalo</em></span></li>"; }).join("") +
      "<li>" + ico("bag") + "<span><b>Envío gratis</b> <em>· empaque discreto</em></span></li>";
    $("#sumName").textContent = plan.name;
    $("#sumSub").innerHTML = "<s>ANTES " + fmt(plan.was) + "</s><b>AHORA " + fmt(plan.price) + "</b>";
    $("#sumGifts").innerHTML = plan.extras.map(function (x) { return '<div class="row g"><span>' + esc(x) + "</span><span>GRATIS</span></div>"; }).join("") + (bump ? '<div class="row"><span>Envío prioritario con seguro</span><span>' + fmt(BUMP) + "</span></div>" : "");
    $$(".pay").forEach(function (l) { var on = l.getAttribute("data-m") === pay; l.classList.toggle("sel", on); l.querySelector("input").checked = on; });
    $('.pay[data-m="bold"]').hidden = !boldOn;
    $('.pay[data-m="transfer"]').hidden = !transferOn;
    var cod = $('.pay[data-m="cod"]');
    cod.classList.toggle("off", prepaidCity);
    $("#codTx").textContent = prepaidCity ? "En " + city.municipio + " no tenemos pago al recibir. Paga en línea y te lo enviamos." : "Pagas en efectivo cuando el paquete llegue a tu puerta. Hoy no pagas nada.";
    $("#boldTag").textContent = $("#trTag").textContent = "-" + fmt(discount);
    $("#boldTag").hidden = $("#trTag").hidden = !discount;
    $("#rowDisc").hidden = !disc();
    $("#rowDisc").lastElementChild.textContent = "-" + fmt(disc());
    $("#tot").textContent = fmt(total());
    $("#sumNote").lastElementChild.textContent = pay === "cod" ? "Lo pagas cuando lo recibes" : pay === "bold" ? "Pago protegido por Bold" : "Transfieres y envías el comprobante por WhatsApp";
    $("#goSub").lastElementChild.textContent = pay === "cod" ? "Pago 100% seguro contra entrega. Pagas al recibir en la puerta de tu casa" : "Pago seguro · Envío gratis";
    check();
  }

  /* ---------- config real del servidor (precios y formas de pago) ---------- */
  if (CFG.live) fetch(CFG.api + "?slug=" + CFG.slug + "&vista=0").then(function (r) { return r.json(); }).then(function (j) {
    var c = j && j.config; if (!c) return;
    (c.offers || []).forEach(function (o) { var p = PLANS.filter(function (x) { return x.key === o.key; })[0]; if (p && o.price) p.price = +o.price; });
    var op = c.online_payment;
    boldOn = !!(op && op.live !== false && !op.prepaid_only);
    transferOn = !!c.transfer && !(op && op.prepaid_only);
    discount = boldOn ? Math.max(0, Number(op.discount) || 0) : (c.transfer ? Math.max(0, Number(c.transfer.discount) || 0) : 0);
    if ((pay === "bold" && !boldOn) || (pay === "transfer" && !transferOn)) pay = "cod";
    paintPlans(); render();
  }).catch(function () {});
  if (CFG.live) fetch(CFG.api + "?slug=" + CFG.slug).catch(function () {});   // "abrió el checkout" para el CRM
  funnel("page_view", { plan: plan.id });
  
  $("#plans").addEventListener("click", function (e) {
    var l = e.target.closest(".plan"); if (!l) return; e.preventDefault();
    var p = PLANS[+l.getAttribute("data-i")]; if (p === plan) return;
    plan = p; funnel("plan_select", { pack: p.id, where: "checkout" }); render(); queueCart();
  });
  $$(".pay").forEach(function (l) {
    l.addEventListener("click", function (e) {
      e.preventDefault(); var m = l.getAttribute("data-m");
      if (m === "cod" && prepaidCity) return;
      if (m !== pay) { pay = m; funnel("pay_select", { metodo: m }); render(); }
    });
  });

  /* ---------- campos ---------- */
  var F = { name: $("#n"), tel: $("#t"), city: $("#c"), addr: $("#a"), opt: $("#b") };
  var RULES = {
    /* P0 #1 (cesar 23-11): un solo nombre basta; el apellido ya no bloquea el pedido */
    name: function (v) { return /[A-Za-zÀ-ÿ]{2}/.test(clean(v)); },
    tel: function (v) { return /^3\d{9}$/.test(phone10(v)) && !phoneBlock; },
    city: function () { return !!city; },
    addr: function (v) { return clean(v).length >= 5; }
  };
  /* mensajes exactos de cesar (23-11) */
  var MSG = { name: "Escribe tu nombre para recibir el pedido", tel: "Revisa tu número de celular colombiano", city: "Selecciona tu ciudad de la lista", addr: "Escribe la dirección donde recibirás tu pedido" };
  var EMPTY = { name: MSG.name, tel: "Ingresa los 10 dígitos de tu celular", city: MSG.city, addr: MSG.addr };
  var LABEL = { name: "tu nombre", tel: "tu celular", city: "tu ciudad", addr: "tu dirección" };
  var telMsg = function () { return phoneBlock ? phoneBlock : phone10(F.tel.value).length < 10 ? EMPTY.tel : MSG.tel; };
  var fieldOf = function (k) { return F[k].closest(".f"); };
  var hints = {}; Object.keys(F).forEach(function (k) {
    if (!F[k]) return;
    var h = fieldOf(k).querySelector(".hint"); hints[k] = h ? h.textContent : "";
    /* el error queda unido a su campo para lectores de pantalla */
    if (h) { h.id = h.id || "h-" + k; h.setAttribute("aria-live", "polite"); F[k].setAttribute("aria-describedby", h.id); }
  });
  /* show: marcar si el dato está mal; force: marcar también si está vacío (al tocar el botón) */
  function mark(k, show, force) {
    var f = fieldOf(k), ok = RULES[k] ? RULES[k](F[k].value) : clean(F[k].value).length > 0, h = f.querySelector(".hint");
    var empty = !clean(F[k].value);
    f.classList.toggle("good", ok);
    var bad = show && !ok && (k === "city" || !empty || force);
    f.classList.toggle("bad", !!bad);
    if (bad) F[k].setAttribute("aria-invalid", "true"); else F[k].removeAttribute("aria-invalid");
    if (h) h.textContent = bad ? (k === "tel" ? telMsg() : empty ? EMPTY[k] : MSG[k]) : hints[k];
    return ok;
  }
  /* aviso junto al botón: todo toque en "Pedir" deja una reacción visible aunque el campo ya esté en pantalla */
  var missShown = false;
  function missMsg(bad) {
    if (!bad.length) { if (missShown) { errBox.classList.remove("show"); errBox.textContent = ""; missShown = false; } return; }
    var n = bad.map(function (k) { return LABEL[k]; });
    errBox.textContent = bad.length >= 4 ? "Completa tus datos de envío para hacer el pedido." : "Te falta " + (n.length > 1 ? n.slice(0, -1).join(", ") + " y " + n[n.length - 1] : n[0]) + ".";
    errBox.classList.add("show"); missShown = true;
  }
  var missing = function () { return Object.keys(RULES).filter(function (k) { return !RULES[k](F[k].value); }); };
  function check() {
    var m = missing(), b = $("#go");
    var touched = Object.keys(RULES).some(function (k) { return clean(F[k].value); });
    $("#s2").classList.toggle("on", touched);
    $("#s3").classList.toggle("on", !m.length);
    b.classList.toggle("miss", !!m.length);
    $("#goTx").innerHTML = pay === "cod" ? "PEDIR Y PAGAR AL RECIBIR" : pay === "bold" ? "PAGAR " + fmt(total()) + " EN LÍNEA" : "PEDIR Y PAGAR POR TRANSFERENCIA";
  }
  var started = false, done1 = {};
  Object.keys(F).forEach(function (k) {
    var i = F[k];
    i.addEventListener("focus", function () {
      if (started) return; started = true;
      funnel("form_start", { field: k });
      pixel("InitiateCheckout", { value: plan.price, currency: "COP", num_items: plan.boxes, content_ids: ["zafir-" + plan.id], content_type: "product" });
    });
    i.addEventListener("input", function () {
      if (k === "tel") { var d = phone10(i.value); i.value = d.replace(/(\d{3})(\d{0,3})(\d{0,4})/, function (m, a, b, c) { return [a, b, c].filter(Boolean).join(" "); }); phoneBlock = null; errBox.classList.remove("show"); }
      if (k !== "city") { var ok = mark(k, false); if (ok && !done1[k]) { done1[k] = 1; funnel("form_field", { field: k }); } }
      if (missShown) missMsg(missing());
      check(); queueCart(); saveDraft();
    });
    if (k !== "city") i.addEventListener("blur", function () { mark(k, true); });
  });

  /* revisión del celular (lista negra / pedido en las últimas 24 h) */
  var errBox = $("#err");
  function showErr(txt, j) {
    missShown = false;
    errBox.textContent = txt;
    var wa = j && j.recent_order ? String(j.whatsapp || "").replace(/\D/g, "") : "";
    if (wa) {
      var a = document.createElement("a"); a.target = "_blank"; a.rel = "noopener";
      a.href = "https://wa.me/" + wa + "?text=" + encodeURIComponent("Hola, ya hice mi pedido" + (j.order_number ? " " + j.order_number : "") + " y quiero aclarar algo.");
      a.innerHTML = ico("chat") + "Escribir por WhatsApp"; errBox.appendChild(a);
    }
    errBox.classList.add("show");
  }
  var lastChecked = "";
  F.tel.addEventListener("blur", function () {
    var p = phone10(F.tel.value);
    if (!/^3\d{9}$/.test(p) || p === lastChecked) return;
    lastChecked = p;
    if (!CFG.live) return;
    api({ action: "phone_check", phone: p }).then(function (j) {
      phoneBlock = j && (j.blocked || j.cod_allowed === false) ? (j.message || "No podemos tomar pedidos contraentrega con este número.") : null;
      if (phoneBlock) mark("tel", true);
      if (j && j.recent_order) showErr(j.message || j.error || "Ya tienes un pedido reciente con este número.", j);
      check();
    }).catch(function () {});
  });

  /* ciudad con buscador (municipios DANE del servidor). Igual que los formularios de ENERPLU (C320):
     se quita "Ciudad/Ciuda/Municipio" del inicio, y sin resultados se busca con menos palabras. */
  var sug = $("#sug"), items = [], cityTimer = null, cityReq = 0, cityQ = "";
  function parts(raw) {
    var s = String(raw || "").replace(/^\s*(ciudad\s+o\s+municipio|ciudad\s*[:\-\/,]|ciuda[sd]?\b(?!\s+bol)|municipio\b|mpio\b|mcpio\b)[\s:\-.]*/i, "");
    var cl = function (x) { return norm(x).replace(/\b(colombia|col|d c|dc)\b/g, " ").replace(/\s+/g, " ").trim(); };
    var ps = s.split(/[,\/|]/).filter(function (x) { return cl(x); });
    return { q: cl(ps[0]), dep: cl(ps.slice(1).join(" ")) };
  }
  function search(raw, cut) {
    var pr = parts(raw), id = ++cityReq;
    if (cut) { var w = pr.q.split(" "); pr.dep = (w.slice(w.length - cut).join(" ") + " " + pr.dep).trim(); pr.q = w.slice(0, w.length - cut).join(" "); }
    if (pr.q.length < 2) { items = []; sug.hidden = true; return Promise.resolve([]); }
    cityQ = pr.q;
    return fetch(CFG.api + "?q=" + encodeURIComponent(pr.q.slice(0, 40))).then(function (r) { return r.json(); }).then(function (j) {
      if (id !== cityReq) return items;
      var rows = (j && j.ciudades) || [];
      if (pr.dep && rows.length) {
        var f = rows.filter(function (c) { var d = norm(c.departamento); return d.indexOf(pr.dep) === 0 || pr.dep.indexOf(d) === 0 || (cut && pr.dep.indexOf(d) >= 0); });
        if (f.length) rows = f;
      }
      if (!rows.length && pr.q.indexOf(" ") > 0) return search(raw, (cut || 0) + 1);
      items = rows;
      sug.innerHTML = items.length ? items.slice(0, 6).map(function (c, i) { return '<button type="button" data-i="' + i + '">' + esc(c.municipio) + (c.departamento !== c.municipio ? " <em>/ " + esc(c.departamento) + "</em>" : "") + "</button>"; }).join("")
        : '<div class="none">No encontramos esa ciudad. Escribe el municipio; si vives en una vereda, el municipio al que pertenece.</div>';
      sug.hidden = false;
      if (!city && document.activeElement !== F.city) autoCity();   // escribió y salió antes de que llegara la lista
      return items;
    });
  }
  function pickCity(c) {
    city = c; F.city.value = c.municipio + (c.departamento !== c.municipio ? " / " + c.departamento : "");
    sug.hidden = true;
    prepaidCity = !!c.solo_pago_anticipado;
    if (prepaidCity && !boldOn && !transferOn) { city = null; prepaidCity = false; mark("city", true); fieldOf("city").querySelector(".hint").textContent = "En " + c.municipio + " no tenemos pago al recibir por ahora."; check(); return; }
    if (prepaidCity && pay === "cod") pay = boldOn ? "bold" : "transfer";
    mark("city", false); if (!done1.city) { done1.city = 1; funnel("form_field", { field: "city" }); }
    if (missShown) missMsg(missing());
    render(); queueCart(); saveDraft();
  }
  function autoCity() {
    if (city || !items.length) return !!city;
    var typed = parts(F.city.value).q;
    if (cityQ && typed.indexOf(cityQ) === 0) typed = cityQ;
    var exact = items.filter(function (c) { return norm(c.municipio) === typed; });
    if (items.length === 1) { pickCity(items[0]); return true; }
    if (exact.length === 1) { pickCity(exact[0]); return true; }
    sug.hidden = false;
    fieldOf("city").classList.add("bad");
    fieldOf("city").querySelector(".hint").textContent = "Selecciona tu ciudad de la lista";
    return false;
  }
  F.city.addEventListener("input", function () {
    city = null; if (prepaidCity) { prepaidCity = false; if (pay !== "cod") pay = "cod"; render(); }
    fieldOf("city").classList.remove("good", "bad");
    fieldOf("city").querySelector(".hint").textContent = hints.city;
    clearTimeout(cityTimer);
    if (parts(F.city.value).q.length < 2) { sug.hidden = true; items = []; check(); return; }
    var raw = F.city.value;
    cityTimer = setTimeout(function () { search(raw).catch(function () {}); }, 180);
    check();
  });
  var tapCity = function (e) { var b = e.target.closest("button[data-i]"); if (b) { e.preventDefault(); pickCity(items[+b.getAttribute("data-i")]); } };
  sug.addEventListener("mousedown", tapCity);
  sug.addEventListener("touchstart", tapCity, { passive: false });
  F.city.addEventListener("keydown", function (e) { if (e.key === "Enter" && items.length && !sug.hidden) { e.preventDefault(); pickCity(items[0]); } });
  F.city.addEventListener("blur", function () { setTimeout(function () { if (!city) autoCity(); if (city) return; if (!items.length || !F.city.value) sug.hidden = true; if (F.city.value) mark("city", true); }, 150); });
  document.addEventListener("click", function (e) { if (!sug.hidden && e.target !== F.city && !sug.contains(e.target) && !e.target.closest("#go")) sug.hidden = true; });
  /* si escribió y tocó Pedir sin que llegara la lista: se busca y se intenta elegir sola */
  function resolveCity() {
    if (city || !clean(F.city.value)) return Promise.resolve();
    return search(F.city.value).then(function () { autoCity(); }).catch(function () {});
  }

  /* P0 #7 (cesar 23-11): lo escrito se guarda en la pestaña y vuelve si la página se recarga o falla la conexión.
     Se borra al quedar hecho el pedido. */
  function saveDraft() {
    try { sessionStorage.setItem("zf_ck_draft", JSON.stringify({ n: F.name.value, t: F.tel.value, c: city, ct: F.city.value, a: F.addr.value, b: F.opt ? F.opt.value : "" })); } catch (e) {}
  }
  function clearDraft() { try { sessionStorage.removeItem("zf_ck_draft"); } catch (e) {} }
  function loadDraft() {
    var d = null; try { d = JSON.parse(sessionStorage.getItem("zf_ck_draft") || "null"); } catch (e) {}
    if (!d) return;
    if (d.n && !F.name.value) F.name.value = d.n;
    if (d.t && !F.tel.value) F.tel.value = d.t;
    if (d.a && !F.addr.value) F.addr.value = d.a;
    if (d.b && F.opt && !F.opt.value) F.opt.value = d.b;
    if (!F.city.value) { if (d.c && d.c.municipio) { done1.city = 1; pickCity(d.c); } else if (d.ct) F.city.value = d.ct; }
    ["name", "tel", "addr"].forEach(function (k) { if (clean(F[k].value)) { done1[k] = 1; mark(k, false); } });
    check();
  }

  /* ---------- carrito abandonado (en cuanto hay celular válido) ---------- */
  var cartTimer = null, cartKey = "", ordered = false;
  function queueCart() { clearTimeout(cartTimer); cartTimer = setTimeout(sendCart, 800); }
  function sendCart() {
    var p = phone10(F.tel.value);
    if (TEST || ordered || !/^3\d{9}$/.test(p)) return;
    /* todo lo que alcanzó a escribir va al carrito, para que la IA no se lo vuelva a pedir */
    var address = { city_text: clean(F.city.value).slice(0, 80), city: city ? city.municipio : "", department: city ? city.departamento : "", address1: clean(F.addr.value).slice(0, 160), additional: clean(F.opt ? F.opt.value : "").slice(0, 160) };
    var name = clean(F.name.value), key = JSON.stringify([p, name, plan.key, address]);
    if (key === cartKey) return; cartKey = key;
    api({ action: "cart", phone: p, name: name, offer_key: plan.key, bump: bump, tracking: tracking(), address: address }).catch(function () {});
  }
  window.addEventListener("pagehide", sendCart);

  /* ---------- enviar pedido ---------- */
  var sending = false;
  $("#go").addEventListener("click", function () {
    if (sending) return;
    errBox.classList.remove("show"); errBox.textContent = "";
    resolveCity().then(submit);
  });
  function splitName(full) { var w = clean(full).split(" "); return { first: w[0] || "", last: w.slice(1).join(" ") || "" }; }
  function submit() {
    if (sending) return;   /* varios toques seguidos: resolveCity es asíncrono y antes dejaba pasar cada toque como un envío */
    var bad = missing();
    funnel("submit_click", { ok: !bad.length, pago: pay, plan: plan.id });
    if (bad.length) {
      funnel("form_error", { fields: bad, city: bad.indexOf("city") >= 0 ? String(F.city.value || "").slice(0, 40) : null, plan: plan.id, pago: pay });
      bad.forEach(function (k) { mark(k, true, true); });
      missMsg(bad);
      var f = fieldOf(bad[0]); f.classList.add("bad");
      try { F[bad[0]].focus({ preventScroll: true }); } catch (e) { try { F[bad[0]].focus(); } catch (e2) {} }
      try { f.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) { try { f.scrollIntoView(); } catch (e2) {} }
      return;
    }
    missMsg([]);
    if (!CFG.live) { showDone({ order_number: "PRUEBA", dry_run: true }, { total: total(), paid: false }); return; }
    sending = true; var b = $("#go"); b.disabled = true; b.setAttribute("aria-busy", "true"); $("#goTx").textContent = "Enviando tu pedido…";
    var nm = splitName(F.name.value), addr = clean(F.addr.value);
    var body = {
      action: "order", offer_key: plan.key, bump: bump, upsell: false,
      customer: { first_name: nm.first, last_name: nm.last, phone: phone10(F.tel.value) },
      address: { department: city.departamento, city: city.municipio, address1: addr, additional: clean(F.opt.value) || "Sin barrio: confirmar por WhatsApp",
        notes: /\d/.test(addr) ? undefined : "Dirección sin número: confirmar punto de entrega por WhatsApp" },
      shipping_option: "standard", payment_method: pay, idempotency_key: IDEM, website: $("#hp").value, tracking: tracking()
    };
    if (pay === "bold") body.return_url = location.origin + location.pathname;
    if (TEST) body.dry_run = true;
    pixel("AddPaymentInfo", { value: total(), currency: "COP", content_ids: ["zafir-" + plan.id], content_type: "product" });
    api(body).then(function (j) {
      if (j.success && j.payment_required) { ordered = true; return openBold(j); }
      if (!j.success) {
        var map = { full_name: "name", first_name: "name", last_name: "name", phone: "tel", city: "city", department: "city", address1: "addr" };
        var firstF = null;
        if (j.fields) Object.keys(j.fields).forEach(function (k) { var fk = map[k]; if (fk) { var f = fieldOf(fk); f.classList.add("bad"); var h = f.querySelector(".hint"); if (h) h.textContent = j.fields[k]; firstF = firstF || f; } });
        showErr((j.fields && j.fields[Object.keys(j.fields)[0]]) || j.error || j.message || "No pudimos registrar tu pedido. Inténtalo nuevamente.", j);
        funnel("form_error", { server: 1, fields: j.fields ? Object.keys(j.fields) : [], msg: String(errBox.textContent).slice(0, 120), status: j.status });
        (firstF || errBox).scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (!j.order_number) { showErr("No pudimos registrar tu pedido. Inténtalo nuevamente."); funnel("form_error", { server: 1, sin_numero: 1, status: j.status }); return; }
      ordered = true; clearTimeout(cartTimer); clearDraft(); setIdem(newKey());
      var tot = j.total_cop || total();
      if (!TEST && !j.dry_run && j.event_id) pixel("Purchase", { value: tot, currency: "COP", num_items: plan.boxes, content_ids: ["zafir-" + plan.id], content_type: "product", order_id: j.order_number }, { eventID: j.event_id });
      funnel("order_ok", { plan: plan.id, pago: pay });
      showDone(j, { total: tot, paid: false });
    }).catch(function () {
      saveDraft();
      showErr("No pudimos enviar el pedido. Tus datos siguen guardados. Intenta nuevamente.");
      funnel("form_error", { server: 1, red: 1 });
    }).then(function () { sending = false; b.disabled = false; b.removeAttribute("aria-busy"); check(); });
  }

  /* ---------- gracias ---------- */
  function showDone(j, d) {
    var first = esc(clean(F.name.value || d.name || "").split(" ")[0]);
    var telRaw = phone10(F.tel.value) || d.phone || "", tel = telRaw.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
    var tr = pay === "transfer" && j.transfer, mun = city ? city.municipio : (d.city || "");
    var li = '<li><span>' + esc(plan.name) + "</span><span>" + fmt(plan.price) + "</span></li>" +
      plan.extras.map(function (x) { return "<li><span>" + esc(x) + "</span><span>Regalo</span></li>"; }).join("") +
      "<li><span>Envío</span><span>Gratis</span></li>" +
      (d.total < plan.price ? "<li><span>Descuento pago anticipado</span><span>-" + fmt(plan.price - d.total) + "</span></li>" : "") +
      '<li class="t"><span>' + (d.paid ? "Pagado en línea" : tr ? "Total a transferir" : "Pagas al recibir") + "</span><span>" + fmt(d.total) + "</span></li>";
    var trBox = "";
    if (tr) {
      var wa = String(tr.whatsapp || "").replace(/\D/g, "");
      var msg = "Hola, envío el comprobante de la transferencia del pedido " + (j.order_number || "") + " por " + fmt(d.total) + ".";
      trBox = '<ul class="okl">' +
        (tr.llave ? "<li><span>" + esc(tr.llave_label || "Llave Bancolombia") + "</span><b>" + esc(tr.llave) + "</b></li>" : "") +
        (tr.cuenta ? "<li><span>" + esc(tr.cuenta_label || "Cuenta Bancolombia") + "</span><b>" + esc(tr.cuenta) + "</b></li>" : "") +
        (tr.titular ? "<li><span>Titular</span><span>" + esc(tr.titular) + "</span></li>" : "") + "</ul>" +
        (wa ? '<p><a href="https://wa.me/' + wa + "?text=" + encodeURIComponent(msg) + '" target="_blank" rel="noopener" style="display:inline-flex;gap:8px;align-items:center;background:#16A34A;color:#fff;font-weight:800;text-decoration:none;padding:12px 16px;border-radius:12px">' + ico("chat") + "Enviar comprobante por WhatsApp</a></p>" : "");
    }
    $("#okBox").innerHTML =
      '<div class="ring">' + ico("check") + "</div>" +
      "<h3>" + (d.paid ? "¡Pago aprobado!" : "¡Pedido recibido" + (first ? ", " + first : "") + "!") + "</h3>" +
      (j.order_number ? '<span class="num2">Pedido ' + esc(j.order_number) + (j.dry_run ? " (prueba, no se creó)" : "") + "</span>" : "") +
      (!tr && !d.paid ? '<div class="pce"><div class="pch"><i></i>PAGO CONTRAENTREGA</div><p>Solo pagarás el pedido una vez que se entregue en tu domicilio.</p></div>' : "") + (tr ? "<p>Transfiere <b>" + fmt(d.total) + "</b> y envíanos el comprobante. Apenas lo verifiquemos, tu pedido sale a despacho.</p>" + trBox
          : "<p>Te escribimos al WhatsApp <b>" + esc(tel) + "</b> para confirmar tu envío. Ten tu celular a la mano.</p>") +
      '<ul class="okl">' + li + "</ul>" +
            '<button type="button" id="okb">Listo</button>';
    $("#ok").hidden = false;
    $("#okb").onclick = function () { $("#ok").hidden = true; };
  }

  /* ---------- Bold ---------- */
  var boldP = null;
  var loadBold = function () {
    if (window.BoldCheckout) return Promise.resolve();
    return boldP = boldP || new Promise(function (ok, ko) {
      var js = document.createElement("script"); js.src = "https://checkout.bold.co/library/boldPaymentButton.js";
      js.onload = function () { ok(); }; js.onerror = function () { boldP = null; ko(new Error("bold")); }; document.head.appendChild(js);
    });
  };
  function openBold(j) {
    try { sessionStorage.setItem("zf_ck_pay", JSON.stringify({ ref: j.payment_ref, name: clean(F.name.value), phone: phone10(F.tel.value), plan: plan.id, city: city ? city.municipio : "" })); } catch (e) {}
    funnel("payment_start", { ref: j.payment_ref });
    if (j.payment && j.payment.simulated) { showDone(Object.assign({}, j, { order_number: "PRUEBA", dry_run: true }), { total: j.total_cop, paid: true }); return; }
    return loadBold().then(function () { new window.BoldCheckout(j.payment).open(); })
      .catch(function () { ordered = false; showErr("No pudimos abrir el pago en línea. Revisa tu conexión y toca el botón otra vez."); });
  }
  (function boldReturn() {
    var ref = qs.get("bold-order-id"); if (!ref) return;
    var saved = {}; try { saved = JSON.parse(sessionStorage.getItem("zf_ck_pay") || "{}"); } catch (e) {}
    if (saved.plan) plan = PLANS.filter(function (p) { return p.id === saved.plan; })[0] || plan;
    $("#okBox").innerHTML = "<h3>Confirmando tu pago…</h3><p>No cierres esta ventana.</p>"; $("#ok").hidden = false;
    var tries = 0;
    var fail = function (txt) { $("#okBox").innerHTML = "<h3>" + txt + "</h3><p>Puedes intentarlo de nuevo o elegir pagar al recibir.</p><button type=\"button\" id=\"okb\">Volver</button>"; $("#okb").onclick = function () { $("#ok").hidden = true; ordered = false; }; };
    var poll = function () {
      tries++;
      api({ action: "payment_status", payment_ref: ref }).then(function (r) {
        if (r.status === "approved" && r.order_number) {
          try { sessionStorage.removeItem("zf_ck_pay"); } catch (e) {}
          ordered = true;
          if (r.event_id) pixel("Purchase", { value: r.total_cop, currency: "COP", content_ids: ["zafir-" + plan.id], content_type: "product", order_id: r.order_number }, { eventID: r.event_id });
          showDone(r, { total: r.total_cop, name: saved.name || "", phone: saved.phone || "", city: saved.city || "", paid: true }); return;
        }
        var final = /^(rejected|failed|voided)$/.test(r.status || "");
        if (!final && tries < 12) { setTimeout(poll, tries < 4 ? 2500 : 5000); return; }
        funnel("payment_result", { ref: ref, status: r.status || qs.get("bold-tx-status") || "unknown" });
        fail(final ? "El pago no se aprobó" : "Aún no vemos tu pago confirmado. Si ya pagaste, te escribimos por WhatsApp apenas Bold lo apruebe.");
      }).catch(function () { if (tries < 12) setTimeout(poll, 4000); else fail("No pudimos confirmar tu pago"); });
    };
    poll();
  })();

  /* ---------- departamento + ciudad en listas; "Mi municipio no aparece" abre el buscador de siempre ---------- */
  var DEPS = {"Antioquia":["Abejorral","Abriaquí","Alejandría","Amagá","Amalfi","Andes","Angelópolis","Angostura","Anorí","Anzá","Apartadó","Arboletes","Argelia","Armenia","Barbosa","Bello","Belmira","Betania","Betulia","Briceño","Buriticá","Cáceres","Caicedo","Caldas","Campamento","Cañasgordas","Caracolí","Caramanta","Carepa","Carolina del Príncipe","Caucasia","Chigorodó","Cisneros","Ciudad Bolívar","Cocorná","Concepción","Concordia","Copacabana","Dabeiba","Donmatías","Ebéjico","El Bagre","El Carmen de Viboral","El Peñol","El Retiro","El Santuario","Entrerríos","Envigado","Fredonia","Frontino","Giraldo","Girardota","Gómez Plata","Granada","Guadalupe","Guarne","Guatapé","Heliconia","Hispania","Itagüí","Ituango","Jardín","Jericó","La Ceja","La Estrella","La Pintada","La Unión","Liborina","Maceo","Marinilla","Medellín","Montebello","Murindó","Mutatá","Nariño","Nechí","Necoclí","Olaya","Peque","Pueblorrico","Puerto Berrío","Puerto Nare","Puerto Triunfo","Remedios","Rionegro","Sabanalarga","Sabaneta","Salgar","San Andrés de Cuerquia","San Carlos","San Francisco","San Jerónimo","San José de la Montaña","San Juan de Urabá","San Luis","San Pedro de los Milagros","San Pedro de Urabá","San Rafael","San Roque","San Vicente","Santa Bárbara","Santa Fe de Antioquia","Santa Rosa de Osos","Santo Domingo","Segovia","Sonsón","Sopetrán","Támesis","Tarazá","Tarso","Titiribí","Toledo","Turbo","Uramita","Urrao","Valdivia","Valparaíso","Vegachí","Venecia","Vigía del Fuerte","Yalí","Yarumal","Yolombó","Yondó","Zaragoza"],"Arauca":["Arauca","Arauquita","Cravo Norte","Fortul","Puerto Rondón","Saravena","Tame"],"Atlántico":["Baranoa","Barranquilla","Campo de la Cruz","Candelaria","Galapa","Juan de Acosta","Luruaco","Malambo","Manatí","Palmar de Varela","Piojó","Polonuevo","Ponedera","Puerto Colombia","Repelón","Sabanagrande","Sabanalarga","Santa Lucía","Santo Tomás","Soledad","Suán","Tubará","Usiacurí"],"Bogotá D.C.":["Bogotá D.C."],"Bolívar":["Achí","Altos del Rosario","Arenal","Arjona","Arroyohondo","Barranco de Loba","Brazuelo de Papayal","Calamar","Cantagallo","Cartagena de Indias","Cicuco","Clemencia","Córdoba","El Carmen de Bolívar","El Guamo","El Peñón","Hatillo de Loba","Magangué","Mahates","Margarita","María la Baja","Mompós","Montecristo","Morales","Norosí","Pinillos","Regidor","Río Viejo","San Cristóbal","San Estanislao","San Fernando","San Jacinto","San Jacinto del Cauca","San Juan Nepomuceno","San Martín de Loba","San Pablo","Santa Catalina","Santa Rosa","Santa Rosa del Sur","Simití","Soplaviento","Talaigua Nuevo","Tiquisio","Turbaco","Turbaná","Villanueva","Zambrano"],"Boyacá":["Almeida","Aquitania","Arcabuco","Belén","Berbeo","Betéitiva","Boavita","Boyacá","Briceño","Buenavista","Busbanzá","Caldas","Campohermoso","Cerinza","Chinavita","Chiquinquirá","Chíquiza","Chiscas","Chita","Chitaraque","Chivatá","Chivor","Ciénega","Cómbita","Coper","Corrales","Covarachía","Cubará","Cucaita","Cuítiva","Duitama","El Cocuy","El Espino","Firavitoba","Floresta","Gachantivá","Gámeza","Garagoa","Guacamayas","Guateque","Guayatá","Güicán","Iza","Jenesano","Jericó","La Capilla","La Uvita","La Victoria","Labranzagrande","Macanal","Maripí","Miraflores","Mongua","Monguí","Moniquirá","Motavita","Muzo","Nobsa","Nuevo Colón","Oicatá","Otanche","Pachavita","Páez","Paipa","Pajarito","Panqueba","Pauna","Paya","Paz del Río","Pesca","Pisba","Puerto Boyacá","Quípama","Ramiriquí","Ráquira","Rondón","Saboyá","Sáchica","Samacá","San Eduardo","San José de Pare","San Luis de Gaceno","San Mateo","San Miguel de Sema","San Pablo de Borbur","Santa María","Santa Rosa de Viterbo","Santa Sofía","Santana","Sativanorte","Sativasur","Siachoque","Soatá","Socha","Socotá","Sogamoso","Somondoco","Sora","Soracá","Sotaquirá","Susacón","Sutamarchán","Sutatenza","Tasco","Tenza","Tibaná","Tibasosa","Tinjacá","Tipacoque","Toca","Togüí","Tópaga","Tota","Tunja","Tununguá","Turmequé","Tuta","Tutazá","Úmbita","Ventaquemada","Villa de Leyva","Viracachá","Zetaquira"],"Caldas":["Aguadas","Anserma","Aranzazu","Belalcázar","Chinchiná","Filadelfia","La Dorada","La Merced","Manizales","Manzanares","Marmato","Marquetalia","Marulanda","Neira","Norcasia","Pácora","Palestina","Pensilvania","Riosucio","Risaralda","Salamina","Samaná","San José","Supía","Victoria","Villamaría","Viterbo"],"Caquetá":["Albania","Belén de los Andaquíes","Cartagena del Chairá","Curillo","El Doncello","El Paujil","Florencia","La Montañita","Milán","Morelia","Puerto Rico","San José del Fragua","San Vicente del Caguán","Solano","Solita","Valparaíso"],"Casanare":["Aguazul","Chámeza","Hato Corozal","La Salina","Maní","Monterrey","Nunchía","Orocué","Paz de Ariporo","Pore","Recetor","Sabanalarga","Sácama","San Luis de Palenque","Támara","Tauramena","Trinidad","Villanueva","Yopal"],"Cauca":["Almaguer","Argelia","Balboa","Bolívar","Buenos Aires","Cajibío","Caldono","Caloto","Corinto","El Tambo","Florencia","Guachené","Guapí","Inzá","Jambaló","La Sierra","La Vega","López de Micay","Mercaderes","Miranda","Morales","Padilla","Páez","Patía","Piamonte","Piendamó","Popayán","Puerto Tejada","Puracé","Rosas","San Sebastián","Santa Rosa","Santander de Quilichao","Silvia","Sotará","Suárez","Sucre","Timbío","Timbiquí","Toribío","Totoró","Villa Rica"],"Cesar":["Aguachica","Agustín Codazzi","Astrea","Becerril","Bosconia","Chimichagua","Chiriguaná","Curumaní","El Copey","El Paso","Gamarra","González","La Gloria","La Jagua de Ibirico","La Paz","Manaure Balcón del Cesar","Pailitas","Pelaya","Pueblo Bello","Río de Oro","San Alberto","San Diego","San Martín","Tamalameque","Valledupar"],"Córdoba":["Ayapel","Buenavista","Canalete","Cereté","Chimá","Chinú","Ciénaga de Oro","Cotorra","La Apartada","Lorica","Los Córdobas","Momil","Moñitos","Montelíbano","Montería","Planeta Rica","Pueblo Nuevo","Puerto Escondido","Puerto Libertador","Purísima","Sahagún","San Andrés de Sotavento","San Antero","San Bernardo del Viento","San Carlos","San José de Uré","San Pelayo","Tierralta","Tuchín","Valencia"],"Cundinamarca":["Agua de Dios","Albán","Anapoima","Anolaima","Apulo","Arbeláez","Beltrán","Bituima","Bogotá","Bojacá","Cabrera","Cachipay","Cajicá","Caparrapí","Cáqueza","Carmen de Carupa","Chaguaní","Chía","Chipaque","Choachí","Chocontá","Cogua","Cota","Cucunubá","El Colegio","El Peñón","El Rosal","Facatativá","Fómeque","Fosca","Funza","Fúquene","Fusagasugá","Gachalá","Gachancipá","Gachetá","Gama","Girardot","Granada","Guachetá","Guaduas","Guasca","Guataquí","Guatavita","Guayabal de Síquima","Guayabetal","Gutiérrez","Jerusalén","Junín","La Calera","La Mesa","La Palma","La Peña","La Vega","Lenguazaque","Machetá","Madrid","Manta","Medina","Mosquera","Nariño","Nemocón","Nilo","Nimaima","Nocaima","Pacho","Paime","Pandi","Paratebueno","Pasca","Puerto Salgar","Pulí","Quebradanegra","Quetame","Quipile","Ricaurte","San Antonio del Tequendama","San Bernardo","San Cayetano","San Francisco","San Juan de Rioseco","Sasaima","Sesquilé","Sibaté","Silvania","Simijaca","Soacha","Sopó","Subachoque","Suesca","Supatá","Susa","Sutatausa","Tabio","Tausa","Tena","Tenjo","Tibacuy","Tibirita","Tocaima","Tocancipá","Topaipí","Ubalá","Ubaque","Ubaté","Une","Útica","Venecia","Vergara","Vianí","Villagómez","Villapinzón","Villeta","Viotá","Yacopí","Zipacón","Zipaquirá"],"Guaviare":["Calamar","El Retorno","Miraflores","San José del Guaviare"],"Huila":["Acevedo","Agrado","Aipe","Algeciras","Altamira","Baraya","Campoalegre","Colombia","El Pital","Elías","Garzón","Gigante","Guadalupe","Hobo","Íquira","Isnos","La Argentina","La Plata","Nátaga","Neiva","Oporapa","Paicol","Palermo","Palestina","Pitalito","Rivera","Saladoblanco","San Agustín","Santa María","Suaza","Tarqui","Tello","Teruel","Tesalia","Timaná","Villavieja","Yaguará"],"La Guajira":["Albania","Barrancas","Dibulla","Distracción","El Molino","Fonseca","Hatonuevo","La Jagua del Pilar","Maicao","Manaure","Riohacha","San Juan del Cesar","Uribia","Urumita","Villanueva"],"Magdalena":["Algarrobo","Aracataca","Ariguaní","Cerro de San Antonio","Chibolo","Ciénaga","Concordia","El Banco","El Piñón","El Retén","Fundación","Guamal","Nueva Granada","Pedraza","Pijiño del Carmen","Pivijay","Plato","Pueblo Viejo","Remolino","Sabanas de San Ángel","Salamina","San Sebastián de Buenavista","San Zenón","Santa Ana","Santa Bárbara de Pinto","Santa Marta","Sitionuevo","Tenerife","Zapayán","Zona Bananera"],"Meta":["Acacías","Barranca de Upía","Cabuyaro","Castilla la Nueva","Cubarral","Cumaral","El Calvario","El Castillo","El Dorado","Fuente de Oro","Granada","Guamal","La Macarena","La Uribe","Lejanías","Mapiripán","Mesetas","Puerto Concordia","Puerto Gaitán","Puerto Lleras","Puerto López","Puerto Rico","Restrepo","San Carlos de Guaroa","San Juan de Arama","San Juanito","San Martín","Villavicencio","Vista Hermosa"],"Nariño":["Aldana","Ancuyá","Arboleda","Barbacoas","Belén","Buesaco","Chachagüí","Colón","Consacá","Contadero","Córdoba","Cuaspud","Cumbal","Cumbitara","El Charco","El Peñol","El Rosario","El Tablón","El Tambo","Francisco Pizarro","Funes","Guachucal","Guaitarilla","Gualmatán","Iles","Imués","Ipiales","La Cruz","La Florida","La Llanada","La Tola","La Unión","Leiva","Linares","Los Andes","Magüí Payán","Mallama","Mosquera","Nariño","Olaya Herrera","Ospina","Pasto","Policarpa","Potosí","Providencia","Puerres","Pupiales","Ricaurte","Roberto Payán","Samaniego","San Bernardo","San José de Albán","San Lorenzo","San Pablo","San Pedro de Cartago","Sandoná","Santa Bárbara","Santacruz","Sapuyes","Taminango","Tangua","Tumaco","Túquerres","Yacuanquer"],"Norte de Santander":["Ábrego","Arboledas","Bochalema","Bucarasica","Cáchira","Cácota","Chinácota","Chitagá","Convención","Cúcuta","Cucutilla","Duranía","El Carmen","El Tarra","El Zulia","Gramalote","Hacarí","Herrán","La Esperanza","La Playa de Belén","Labateca","Los Patios","Lourdes","Mutiscua","Ocaña","Pamplona","Pamplonita","Puerto Santander","Ragonvalia","Salazar de Las Palmas","San Calixto","San Cayetano","Santiago","Santo Domingo de Silos","Sardinata","Teorama","Tibú","Toledo","Villa Caro","Villa del Rosario"],"Putumayo":["Colón","Mocoa","Orito","Puerto Asís","Puerto Caicedo","Puerto Guzmán","Puerto Leguízamo","San Francisco","San Miguel","Santiago","Sibundoy","Valle del Guamuez","Villagarzón"],"Quindío":["Armenia","Buenavista","Calarcá","Circasia","Córdoba","Filandia","Génova","La Tebaida","Montenegro","Pijao","Quimbaya","Salento"],"Risaralda":["Apía","Balboa","Belén de Umbría","Dosquebradas","Guática","La Celia","La Virginia","Marsella","Mistrató","Pereira","Pueblo Rico","Quinchía","Santa Rosa de Cabal","Santuario"],"Santander":["Aguada","Albania","Aratoca","Barbosa","Barichara","Barrancabermeja","Betulia","Bolívar","Bucaramanga","Cabrera","California","Capitanejo","Carcasí","Cepitá","Cerrito","Charalá","Charta","Chima","Chipatá","Cimitarra","Concepción","Confines","Contratación","Coromoro","Curití","El Carmen de Chucurí","El Guacamayo","El Peñón","El Playón","El Socorro","Encino","Enciso","Florián","Floridablanca","Galán","Gámbita","Girón","Guaca","Guadalupe","Guapotá","Guavatá","Güepsa","Hato","Jesús María","Jordán","La Belleza","La Paz","Landázuri","Lebrija","Los Santos","Macaravita","Málaga","Matanza","Mogotes","Molagavita","Ocamonte","Oiba","Onzaga","Palmar","Palmas del Socorro","Páramo","Piedecuesta","Pinchote","Puente Nacional","Puerto Parra","Puerto Wilches","Rionegro","Sabana de Torres","San Andrés","San Benito","San Gil","San Joaquín","San José de Miranda","San Miguel","San Vicente de Chucurí","Santa Bárbara","Santa Helena del Opón","Simacota","Suaita","Sucre","Suratá","Tona","Valle de San José","Vélez","Vetas","Villanueva","Zapatoca"],"Sucre":["Buenavista","Caimito","Chalán","Colosó","Corozal","Coveñas","El Roble","Galeras","Guaranda","La Unión","Los Palmitos","Majagual","Morroa","Ovejas","Sampués","San Antonio de Palmito","San Benito Abad","San Juan de Betulia","San Marcos","San Onofre","San Pedro","Sincé","Sincelejo","Sucre","Tolú","Tolú Viejo"],"Tolima":["Alpujarra","Alvarado","Ambalema","Anzoátegui","Armero","Ataco","Cajamarca","Carmen de Apicalá","Casabianca","Chaparral","Coello","Coyaima","Cunday","Dolores","El Espinal","Falán","Flandes","Fresno","Guamo","Herveo","Honda","Ibagué","Icononzo","Lérida","Líbano","Mariquita","Melgar","Murillo","Natagaima","Ortega","Palocabildo","Piedras","Planadas","Prado","Purificación","Rioblanco","Roncesvalles","Rovira","Saldaña","San Antonio","San Luis","Santa Isabel","Suárez","Valle de San Juan","Venadillo","Villahermosa","Villarrica"],"Valle del Cauca":["Alcalá","Andalucía","Ansermanuevo","Argelia","Bolívar","Buenaventura","Buga","Bugalagrande","Caicedonia","Cali","Calima","Candelaria","Cartago","Dagua","El Águila","El Cairo","El Cerrito","El Dovio","Florida","Ginebra","Guacarí","Jamundí","La Cumbre","La Unión","La Victoria","Obando","Palmira","Pradera","Restrepo","Riofrío","Roldanillo","San Pedro","Sevilla","Toro","Trujillo","Tuluá","Ulloa","Versalles","Vijes","Yotoco","Yumbo","Zarzal"]};
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
