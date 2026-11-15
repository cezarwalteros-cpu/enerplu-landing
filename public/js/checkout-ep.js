/* =========================================================
   ENERPLU · Checkout aparte (/checkout), diseño aprobado por cesar 15-11-2026
   (maqueta https://claude.ai/artifact/NsBELjAdZuqwEDDqM2KhCC, mismo esquema que mg-collagen.com/checkout).
   Backend: Edge Function checkout-native, slug "enerplu" (pedidos ENL-, CAPI, carritos, antifraude).
   - Precios, descuento por pago anticipado y total los calcula el servidor (checkout_pages).
   - Ciudad con buscador DANE y elección automática cuando hay una sola coincidencia (C313 / C320).
   - Revisión del celular (lista negra / pedido en 24 h), carrito abandonado, Pixel + CAPI (mismo event_id),
     embudo funnel-track (page = dominio + ruta, extra.ck = 1).
   - Pago: contraentrega (por defecto), Bold y transferencia Bancolombia, según la config del servidor.
   - ?plan=basico|dominio|elite preselecciona. ?ep_test=1 = el servidor valida pero NO crea pedido ni registra embudo.
   ========================================================= */
(function () {
  "use strict";
  var CFG = {
    api: "https://mqwscbpdozrdiqxofmod.supabase.co/functions/v1/checkout-native",
    funnel: "https://mqwscbpdozrdiqxofmod.supabase.co/functions/v1/funnel-track",
    slug: "enerplu",
    pixel: "1248121626590977"
  };
  var PLANS = [
    { key: "x1", id: "basico", name: "Plan Básico", boxes: 1, tablets: 10, price: 89900, extras: ["Sobre de lubricante"], note: "Para probar", img: "/img/ck/basico.jpg" },
    { key: "dominio", id: "dominio", name: "Plan Dominio Total", boxes: 2, tablets: 20, price: 129900, extras: ["Spray retardante 30 ml", "Sobre de lubricante"], gift: "Spray retardante", badge: "MÁS VENDIDO", img: "/img/ck/dominio.jpg" },
    { key: "elite", id: "elite", name: "Plan Élite", boxes: 4, tablets: 40, price: 159900, extras: ["Spray retardante 30 ml", "Sobre de lubricante"], gift: "Spray retardante", badge: "MEJOR PRECIO", dark: true, img: "/img/ck/elite.jpg" }
  ];

  var $ = function (s) { return document.querySelector(s); }, $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var fmt = function (n) { return "$" + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  var clean = function (v) { return String(v || "").replace(/\s+/g, " ").trim(); };
  var phone10 = function (v) { var d = String(v || "").replace(/\D/g, ""); if (d.length === 12 && d.indexOf("57") === 0) d = d.slice(2); return d; };
  var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var norm = function (s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); };
  var ico = function (n) { return '<svg class="i"><use href="#' + n + '"/></svg>'; };

  /* ---------- sesión, UTM y tracking (misma sesión ep_sid que las páginas de ENERPLU) ---------- */
  var qs = new URLSearchParams(location.search);
  var TEST = qs.get("ep_test") === "1";
  $("#tb").hidden = !TEST;
  var UTM = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "ttclid"].forEach(function (k) {
    var v = qs.get(k);
    try { if (v) sessionStorage.setItem("ep_ck_" + k, v); else v = sessionStorage.getItem("ep_ck_" + k); } catch (e) {}
    if (v) UTM[k] = v;
  });
  var SID = "";
  try { SID = sessionStorage.getItem("ep_sid") || ""; } catch (e) {}
  if (!SID) { SID = "ep" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem("ep_sid", SID); } catch (e) {} }
  var cookie = function (n) { var m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : null; };
  var tracking = function () { return Object.assign({}, UTM, { fbp: cookie("_fbp"), fbc: cookie("_fbc"), landing_url: location.href.split("#")[0].slice(0, 300), user_agent: navigator.userAgent.slice(0, 300) }); };

  if (!window.fbq) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", CFG.pixel); window.fbq("track", "PageView");
  }
  var pixel = function (ev, data, opts) { try { window.fbq && window.fbq("track", ev, data, opts || {}); } catch (e) {} };
  var PAGE = (location.host + location.pathname).slice(0, 300);
  function funnel(ev, extra) {
    if (TEST) return;
    var body = JSON.stringify({ sid: SID, ev: ev, page: PAGE, store: CFG.slug, utm_source: UTM.utm_source || null, utm_campaign: UTM.utm_campaign || null,
      utm_content: UTM.utm_content || null, utm_term: UTM.utm_term || null, extra: Object.assign({ ck: 1 }, extra || {}) });
    try { if (navigator.sendBeacon && navigator.sendBeacon(CFG.funnel, new Blob([body], { type: "text/plain" }))) return; } catch (e) {}
    try { fetch(CFG.funnel, { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(function () {}); } catch (e) {}
  }
  var api = function (body) {
    return fetch(CFG.api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({ slug: CFG.slug, session_id: SID }, body)) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j.status = j.status || r.status; return j; }); });
  };

  /* ---------- estado ---------- */
  var alias = { basico: "basico", "básico": "basico", x1: "basico", inicial: "basico", dominio: "dominio", elite: "elite", "élite": "elite" };
  var plan = PLANS.filter(function (p) { return p.id === alias[(qs.get("plan") || "").toLowerCase()]; })[0] || PLANS[1];
  var pay = "cod", city = null, prepaidCity = false, phoneBlock = null;
  var boldOn = true, transferOn = false, discount = 12000;
  var single = function () { return PLANS[0].price; };
  var disc = function () { return pay === "cod" ? 0 : discount; };
  var total = function () { return plan.price - disc(); };

  function paintPlans() {
    $("#plans").innerHTML = PLANS.map(function (p, i) {
      var save = single() * p.boxes - p.price;
      return '<label class="plan" data-i="' + i + '">' +
        (p.badge ? '<span class="badge' + (p.dark ? " dark" : "") + '">' + p.badge + "</span>" : "") +
        '<input type="radio" name="plan"><span class="radio"></span>' +
        '<span class="thumb"><img src="' + p.img + '" alt="" width="70" height="48" decoding="async"></span>' +
        '<span><div class="pn">' + esc(p.name.replace(/^Plan /, "")) + "</div>" +
        '<div class="pd">' + p.boxes + (p.boxes > 1 ? " cajas" : " caja") + " · " + p.tablets + " tabletas</div>" +
        (p.gift ? '<div class="pg">' + ico("gift") + "<span>+ " + esc(p.gift) + "</span></div>" : (p.note ? '<div class="pd">' + p.note + "</div>" : "")) +
        (save > 0 ? '<span class="save">' + ico("check") + "Ahorras " + fmt(save) + "</span>" : "") +
        "</span>" +
        '<span class="pr"><strong>' + fmt(p.price) + "</strong><span>" + fmt(p.price / p.tablets) + " c/tableta</span></span></label>";
    }).join("");
  }

  function render() {
    $$(".plan").forEach(function (l) { var on = PLANS[+l.getAttribute("data-i")] === plan; l.classList.toggle("sel", on); l.querySelector("input").checked = on; });
    var saveTxt = single() * plan.boxes - plan.price;
    $("#incl").innerHTML =
      "<li>" + ico("box") + "<span><b>" + plan.boxes + (plan.boxes > 1 ? " cajas" : " caja") + " ENERPLU</b> <em>· " + plan.tablets + " tabletas</em></span></li>" +
      plan.extras.map(function (x) { return "<li>" + ico("gift") + "<span><b>" + esc(x) + "</b> <em>· de regalo</em></span></li>"; }).join("") +
      "<li>" + ico("bag") + "<span><b>Envío gratis</b> <em>· bolsa negra sellada, sin marcas por fuera</em></span></li>" +
      (plan.boxes > 1 ? "<li>" + ico("shield") + '<span><b>Garantía Real 15 días</b> <em>· <a href="/garantia">ver condiciones</a></em></span></li>' : "");
    $("#sumName").textContent = plan.name + " · " + plan.tablets + " tabletas";
    $("#sumSub").textContent = fmt(plan.price);
    $("#sumGifts").innerHTML = plan.extras.map(function (x) { return '<div class="row g"><span>' + esc(x) + "</span><span>REGALO</span></div>"; }).join("") +
      (saveTxt > 0 ? '<div class="row g"><span>Ahorro vs ' + plan.boxes + " Básicos</span><span>-" + fmt(saveTxt) + "</span></div>" : "");
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
    $("#goSub").lastElementChild.textContent = pay === "cod" ? "Hoy no pagas nada · Envío gratis" : "Pago seguro · Envío gratis";
    check();
  }

  /* ---------- config real del servidor (precios y formas de pago) ---------- */
  fetch(CFG.api + "?slug=" + CFG.slug + "&vista=0").then(function (r) { return r.json(); }).then(function (j) {
    var c = j && j.config; if (!c) return;
    (c.offers || []).forEach(function (o) { var p = PLANS.filter(function (x) { return x.key === o.key; })[0]; if (p && o.price) p.price = +o.price; });
    var op = c.online_payment;
    boldOn = !!(op && op.live !== false && !op.prepaid_only);
    transferOn = !!c.transfer && !(op && op.prepaid_only);
    discount = boldOn ? Math.max(0, Number(op.discount) || 0) : (c.transfer ? Math.max(0, Number(c.transfer.discount) || 0) : 0);
    if ((pay === "bold" && !boldOn) || (pay === "transfer" && !transferOn)) pay = "cod";
    paintPlans(); render();
  }).catch(function () {});
  fetch(CFG.api + "?slug=" + CFG.slug).catch(function () {});   // "abrió el checkout" para el CRM
  funnel("page_view", { plan: plan.id });
  funnel("selector_view");

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
    name: function (v) { return clean(v).split(" ").length >= 2 && clean(v).length >= 5; },
    tel: function (v) { return /^3\d{9}$/.test(phone10(v)) && !phoneBlock; },
    city: function () { return !!city; },
    addr: function (v) { return clean(v).length >= 5; }
  };
  var MSG = { name: "Escribe nombre y apellido", tel: "Debe empezar por 3 y tener 10 números", city: "Escribe tu ciudad y elígela de la lista", addr: "Escribe la dirección o el punto de entrega" };
  var fieldOf = function (k) { return F[k].closest(".f"); };
  var hints = {}; Object.keys(F).forEach(function (k) { var h = fieldOf(k).querySelector(".hint"); hints[k] = h ? h.textContent : ""; });
  function mark(k, show) {
    var f = fieldOf(k), ok = RULES[k] ? RULES[k](F[k].value) : clean(F[k].value).length > 0, h = f.querySelector(".hint");
    f.classList.toggle("good", ok);
    var bad = show && !ok && (k === "city" || F[k].value);
    f.classList.toggle("bad", !!bad);
    if (h) h.textContent = bad ? (k === "tel" && phoneBlock ? phoneBlock : MSG[k]) : hints[k];
    return ok;
  }
  var missing = function () { return Object.keys(RULES).filter(function (k) { return !RULES[k](F[k].value); }); };
  function check() {
    var m = missing(), b = $("#go");
    var touched = Object.keys(RULES).some(function (k) { return clean(F[k].value); });
    $("#s2").classList.toggle("on", touched);
    $("#s3").classList.toggle("on", !m.length);
    b.classList.toggle("miss", !!m.length);
    $("#goTx").innerHTML = m.length ? "Faltan " + m.length + " " + (m.length > 1 ? "datos" : "dato") + " · <em>completa tu envío</em>"
      : pay === "cod" ? "PÍDELO YA - Pagas al recibir" : pay === "bold" ? "PAGAR " + fmt(total()) + " EN LÍNEA" : "PEDIR Y PAGAR POR TRANSFERENCIA";
  }
  var started = false, done1 = {};
  Object.keys(F).forEach(function (k) {
    var i = F[k];
    i.addEventListener("focus", function () {
      if (started) return; started = true;
      funnel("form_start", { field: k });
      pixel("InitiateCheckout", { value: plan.price, currency: "COP", num_items: plan.boxes, content_ids: ["enerplu-" + plan.id], content_type: "product" });
    });
    i.addEventListener("input", function () {
      if (k === "tel") { var d = i.value.replace(/\D/g, "").slice(0, 10); i.value = d.replace(/(\d{3})(\d{0,3})(\d{0,4})/, function (m, a, b, c) { return [a, b, c].filter(Boolean).join(" "); }); phoneBlock = null; errBox.classList.remove("show"); }
      if (k !== "city") { var ok = mark(k, false); if (ok && !done1[k]) { done1[k] = 1; funnel("form_field", { field: k }); } }
      check(); if (k === "tel" || k === "name") queueCart();
    });
    if (k !== "city") i.addEventListener("blur", function () { mark(k, true); });
  });

  /* revisión del celular (lista negra / pedido en las últimas 24 h) */
  var errBox = $("#err");
  function showErr(txt, j) {
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
    render();
  }
  function autoCity() {
    if (city || !items.length) return !!city;
    var typed = parts(F.city.value).q;
    if (cityQ && typed.indexOf(cityQ) === 0) typed = cityQ;
    var exact = items.filter(function (c) { return norm(c.municipio) === typed; });
    if (items.length === 1) { pickCity(items[0]); return true; }
    if (exact.length === 1) { pickCity(exact[0]); return true; }
    sug.hidden = false;
    fieldOf("city").querySelector(".hint").textContent = "Toca tu ciudad en la lista";
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

  /* ---------- carrito abandonado (en cuanto hay celular válido) ---------- */
  var cartTimer = null, cartKey = "", ordered = false;
  function queueCart() { clearTimeout(cartTimer); cartTimer = setTimeout(sendCart, 800); }
  function sendCart() {
    var p = phone10(F.tel.value);
    if (TEST || ordered || !/^3\d{9}$/.test(p)) return;
    var name = clean(F.name.value), key = [p, name, plan.key].join("|");
    if (key === cartKey) return; cartKey = key;
    api({ action: "cart", phone: p, name: name, offer_key: plan.key, bump: false, tracking: tracking() }).catch(function () {});
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
    var bad = missing();
    funnel("submit_click", { ok: !bad.length, pago: pay, plan: plan.id });
    if (bad.length) {
      funnel("form_error", { fields: bad, city: bad.indexOf("city") >= 0 ? String(F.city.value || "").slice(0, 40) : null, plan: plan.id, pago: pay });
      bad.forEach(function (k) { mark(k, true); });
      var f = fieldOf(bad[0]); f.classList.add("bad");
      f.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(function () { F[bad[0]].focus({ preventScroll: true }); }, 400);
      return;
    }
    sending = true; var b = $("#go"); b.disabled = true; $("#goTx").textContent = "Enviando tu pedido…";
    var nm = splitName(F.name.value), addr = clean(F.addr.value);
    var body = {
      action: "order", offer_key: plan.key, bump: false, upsell: false,
      customer: { first_name: nm.first, last_name: nm.last, phone: phone10(F.tel.value) },
      address: { department: city.departamento, city: city.municipio, address1: addr, additional: clean(F.opt.value) || "Sin barrio: confirmar por WhatsApp",
        notes: /\d/.test(addr) ? undefined : "Dirección sin número: confirmar punto de entrega por WhatsApp" },
      shipping_option: "standard", payment_method: pay, website: $("#hp").value, tracking: tracking()
    };
    if (pay === "bold") body.return_url = location.origin + location.pathname;
    if (TEST) body.dry_run = true;
    pixel("AddPaymentInfo", { value: total(), currency: "COP", content_ids: ["enerplu-" + plan.id], content_type: "product" });
    api(body).then(function (j) {
      if (j.success && j.payment_required) { ordered = true; return openBold(j); }
      if (!j.success) {
        var map = { full_name: "name", first_name: "name", last_name: "name", phone: "tel", city: "city", department: "city", address1: "addr" };
        var firstF = null;
        if (j.fields) Object.keys(j.fields).forEach(function (k) { var fk = map[k]; if (fk) { var f = fieldOf(fk); f.classList.add("bad"); var h = f.querySelector(".hint"); if (h) h.textContent = j.fields[k]; firstF = firstF || f; } });
        showErr((j.fields && j.fields[Object.keys(j.fields)[0]]) || j.error || j.message || "No pudimos registrar tu pedido. Intenta de nuevo.", j);
        funnel("form_error", { server: 1, fields: j.fields ? Object.keys(j.fields) : [], msg: String(errBox.textContent).slice(0, 120), status: j.status });
        (firstF || errBox).scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      ordered = true; clearTimeout(cartTimer);
      var tot = j.total_cop || total();
      if (!TEST && !j.dry_run && j.event_id) pixel("Purchase", { value: tot, currency: "COP", num_items: plan.boxes, content_ids: ["enerplu-" + plan.id], content_type: "product", order_id: j.order_number }, { eventID: j.event_id });
      funnel("order_ok", { plan: plan.id, pago: pay });
      showDone(j, { total: tot, paid: false });
    }).catch(function () {
      showErr("No pudimos registrar tu pedido. Revisa tu conexión e inténtalo de nuevo.");
      funnel("form_error", { server: 1, red: 1 });
    }).then(function () { sending = false; b.disabled = false; check(); });
  }

  /* ---------- gracias ---------- */
  function showDone(j, d) {
    var first = esc(clean(F.name.value || d.name || "").split(" ")[0]);
    var telRaw = phone10(F.tel.value) || d.phone || "", tel = telRaw.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
    var tr = pay === "transfer" && j.transfer, mun = city ? city.municipio : (d.city || "");
    var li = '<li><span>' + esc(plan.name) + " · " + plan.tablets + " tabletas</span><span>" + fmt(plan.price) + "</span></li>" +
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
      (tr ? "<p>Transfiere <b>" + fmt(d.total) + "</b> y envíanos el comprobante. Apenas lo verifiquemos, tu pedido sale a despacho.</p>" + trBox
          : "<p>Te escribimos al WhatsApp <b>" + esc(tel) + "</b> para confirmar tu envío. Ten tu celular a la mano.</p>") +
      '<ul class="okl">' + li + "</ul>" +
      (mun ? '<div class="eta">' + ico("cal") + "<span>Llega en 3 a 4 días hábiles a " + esc(mun) + "</span></div>" : "") +
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
    try { sessionStorage.setItem("ep_ck_pay", JSON.stringify({ ref: j.payment_ref, name: clean(F.name.value), phone: phone10(F.tel.value), plan: plan.id, city: city ? city.municipio : "" })); } catch (e) {}
    funnel("payment_start", { ref: j.payment_ref });
    if (j.payment && j.payment.simulated) { showDone(Object.assign({}, j, { order_number: "PRUEBA", dry_run: true }), { total: j.total_cop, paid: true }); return; }
    return loadBold().then(function () { new window.BoldCheckout(j.payment).open(); })
      .catch(function () { ordered = false; showErr("No pudimos abrir el pago en línea. Revisa tu conexión y toca el botón otra vez."); });
  }
  (function boldReturn() {
    var ref = qs.get("bold-order-id"); if (!ref) return;
    var saved = {}; try { saved = JSON.parse(sessionStorage.getItem("ep_ck_pay") || "{}"); } catch (e) {}
    if (saved.plan) plan = PLANS.filter(function (p) { return p.id === saved.plan; })[0] || plan;
    $("#okBox").innerHTML = "<h3>Confirmando tu pago…</h3><p>No cierres esta ventana.</p>"; $("#ok").hidden = false;
    var tries = 0;
    var fail = function (txt) { $("#okBox").innerHTML = "<h3>" + txt + "</h3><p>Puedes intentarlo de nuevo o elegir pagar al recibir.</p><button type=\"button\" id=\"okb\">Volver</button>"; $("#okb").onclick = function () { $("#ok").hidden = true; ordered = false; }; };
    var poll = function () {
      tries++;
      api({ action: "payment_status", payment_ref: ref }).then(function (r) {
        if (r.status === "approved" && r.order_number) {
          try { sessionStorage.removeItem("ep_ck_pay"); } catch (e) {}
          ordered = true;
          if (r.event_id) pixel("Purchase", { value: r.total_cop, currency: "COP", content_ids: ["enerplu-" + plan.id], content_type: "product", order_id: r.order_number }, { eventID: r.event_id });
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

  paintPlans(); render();
})();
