/* /octubre · réplica de la página de octubre (selector en la página + formulario en ventana, estilo Releasit).
   Es el mismo <form> de siempre (mismos campos, validación, ciudad, pago, bump, upsell, carrito y pedido): aquí solo se
   cambia cómo se ve y dónde vive. Nada de esto está en la página principal. */
(function () {
  var order = document.getElementById('ep-order');
  var block = order && order.closest('.ep-root');
  if (!block) return;
  var q = new URLSearchParams(location.search);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var ICON = {
    user: '<svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5z"/></svg>',
    wa: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 1-2.3.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.3.3c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.4z"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.500a2.5 2.5 0 0 1 0 5z"/></svg>'
  };

  /* ---- ventana ---- */
  var pop = document.createElement('div');
  pop.className = 'ep-pop oc-pop';
  pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'true'); pop.setAttribute('aria-label', 'Haz tu pedido'); pop.setAttribute('aria-hidden', 'true');
  pop.innerHTML = '<div class="ep-pop-box oc-box"><div class="ep-pop-head"><img src="/img/oct-logo.webp" alt="Men Booster · ENERPLU" width="110" height="78">' +
    '<button type="button" class="ep-pop-x" data-pop-close aria-label="Cerrar">✕</button></div><div class="ep-pop-body"></div></div>';
  document.body.appendChild(pop);
  var bodyEl = $('.ep-pop-body', pop);
  bodyEl.appendChild(block);
  block.setAttribute('data-ep-theme', 'claro');
  var plans = $('.ep-plans', block);
  if (plans) plans.removeAttribute('id');   /* el id #ep-offer-widget queda en el selector de la página (los botones suben ahí) */

  var form = $('form[data-ep-order]', block);
  var fs = $('.ep-of-block', form);

  /* ---- "USTED SELECCIONÓ" + resumen ---- */
  var sel = document.createElement('div');
  sel.className = 'oc-sel';
  sel.innerHTML = '<h3>USTED SELECCIONÓ:</h3>' +
    '<div class="oc-row"><span class="oc-thumb"><img alt="" data-oc-img><b>1</b></span><span class="oc-nm"><span class="oc-name" data-ep-bind="name">Plan</span><small class="oc-incl" data-oc-inc></small></span><span class="oc-price" data-ep-bind="price"></span></div>' +
    '<div class="oc-sum"><div><span>Subtotal</span><b data-ep-bind="price"></b></div><div><span>Envío</span><b data-oc-ship>Gratis</b></div><div class="oc-line"><span>Total</span><b data-ep-bind="total"></b></div></div>' +
    '<h3 class="oc-h1">1- Ingrese sus datos para el envío</h3>';
  form.insertBefore(sel, form.firstChild);
  function thumb() {
    var im = $('.ep-sel-opt.is-on .eph-c-img img', document);
    var t = $('[data-oc-img]', sel);
    if (im && t && t.getAttribute('src') !== im.getAttribute('src')) t.setAttribute('src', im.getAttribute('src'));
  }
  function ship() {
    var el = $('[data-oc-ship]', sel), on = $('[data-ep-render="shipping"] input:checked', form);
    if (!el) return;
    var m = on && on.closest('label') && /\$\s*[\d.]+/.exec(on.closest('label').textContent);
    el.textContent = m ? m[0].replace(/\s+/g, '') : 'Gratis';
  }
  function inc() {
    var el = $('[data-oc-inc]', sel), r = $('input[name="ep-pack-order"]:checked', form), C = window.EP_CONFIG;
    if (!el || !r || !C) return;
    var pk = (C.packs || []).filter(function (x) { return x.id === r.value; })[0]; if (!pk) return;
    var parts = [pk.boxes + (pk.boxes > 1 ? ' cajas' : ' caja') + ' / ' + pk.tablets + ' TABLETAS'];
    (pk.gifts || []).forEach(function (g) { if (/spray/i.test(g)) parts.push('Spray retardante 30ml'); else if (pk.id === 'inicial') parts.push(g); });
    var t = parts.join(' - ') + (pk.id === 'inicial' ? '' : ' - Obsequio + 3 guías digitales');
    if (el.textContent !== t) el.textContent = t;
  }
  setInterval(inc, 400);
  document.addEventListener('change', function () { setTimeout(function () { thumb(); ship(); inc(); }, 30); });
  setTimeout(thumb, 400); setTimeout(thumb, 1500);

  /* ---- un solo campo "Nombre y apellido" (se reparte en los dos campos que usa el pedido) ---- */
  var fFirst = $('#ep-f-first'), fLast = $('#ep-f-last');
  var grid = $('.ep-of-grid', fs);
  var one = document.createElement('div');
  one.className = 'ep-f oc-name-f';
  one.innerHTML = '<label for="ep-oc-name">Nombre Y Apellido Completos</label><div class="oc-ig"><span class="oc-ic">' + ICON.user + '</span>' +
    '<input id="ep-oc-name" type="text" autocomplete="name" autocapitalize="words" maxlength="120" placeholder="Nombre y Apellido Completo"></div>';
  grid.parentNode.insertBefore(one, grid);
  var e1 = $('[data-ep-err="first_name"]', grid), e2 = $('[data-ep-err="last_name"]', grid);
  if (e1) one.appendChild(e1); if (e2) one.appendChild(e2);
  var oneIn = $('#ep-oc-name', one);
  function setVal(el, v) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
  function splitName() {
    var v = oneIn.value.replace(/\s+/g, ' ').trim(), i = v.indexOf(' ');
    setVal(fFirst, i < 0 ? v : v.slice(0, i)); setVal(fLast, i < 0 ? '' : v.slice(i + 1));
  }
  oneIn.addEventListener('input', splitName);
  oneIn.addEventListener('blur', splitName);
  function joinName() { if (!oneIn.value && (fFirst.value || fLast.value)) oneIn.value = (fFirst.value + ' ' + fLast.value).trim(); }
  setTimeout(joinName, 300);
  fFirst.removeAttribute('required'); fLast.removeAttribute('required');

  /* ---- etiquetas, textos de ejemplo e iconos del formulario de octubre ---- */
  function field(id) { return document.getElementById(id); }
  function wrapIcon(input, ic) {
    if (!input || input.parentNode.classList.contains('oc-ig')) return;
    var w = document.createElement('div'); w.className = 'oc-ig';
    var s = document.createElement('span'); s.className = 'oc-ic'; s.innerHTML = ic;
    input.parentNode.insertBefore(w, input); w.appendChild(s); w.appendChild(input);
  }
  function label(id, txt, req) {
    var l = $('label[for="' + id + '"]', form); if (!l) return;
    l.innerHTML = txt + (req ? '<span class="oc-req">*</span>' : '');
  }
  var phone = field('ep-f-phone'), addr = field('ep-f-addr'), add = field('ep-f-add'), city = field('ep-f-city');
  label('ep-oc-name', 'Nombre Y Apellido Completos', true);
  label('ep-f-phone', 'Teléfono', true); if (phone) { phone.placeholder = 'Teléfono con WhatsApp'; var pw = phone.parentNode; pw.classList.remove('ep-f-phone'); pw.classList.add('oc-ig'); var ps = document.createElement('span'); ps.className = 'oc-ic'; ps.innerHTML = ICON.wa; pw.insertBefore(ps, pw.firstChild); var old = $('span[aria-hidden]', pw); if (old && old !== ps) old.remove(); }
  label('ep-f-addr', 'Dirección Completa', true); if (addr) { addr.placeholder = 'ejemplo: CARRERA 12 # 34 - 56 SUR'; wrapIcon(addr, ICON.pin); }
  label('ep-f-add', 'Referencia, Barrio o Observaciones <span style="font-weight:700">(opcional)</span>'); if (add) { add.placeholder = 'Barrio/Unidad/Conjunto/Edificio/torre'; wrapIcon(add, ICON.pin); }
  label('ep-f-city', 'Ciudad o Municipio / Departamento', true); if (city) city.placeholder = 'Escribe tu ciudad o municipio';
  var order_ = { 'oc-name-f': 1 };
  [['.oc-name-f', 1], ['#ep-f-phone', 2], ['#ep-f-addr', 3], ['#ep-f-add', 4], ['.ep-f--city', 5], ['[data-ep-email-row]', 6]].forEach(function (r) {
    var el = r[0].charAt(0) === '#' ? (field(r[0].slice(1)) && field(r[0].slice(1)).closest('.ep-f')) : $(r[0], fs);
    if (el) el.style.order = r[1];
  });

  /* ---- títulos numerados como en Releasit ---- */
  var lg1 = $('[data-ep-ship-block] .ep-of-legend', form), lg2 = $('[data-ep-pay-block] .ep-of-legend', form);
  if (lg1) lg1.textContent = '2- Método de envío';
  if (lg2) lg2.textContent = '3- Método de pago';

  /* ---- botón verde: REALIZAR PEDIDO - Por $X / Pago Contra-Entrega ---- */
  var btn = $('[data-ep-submit]', form), lab = btn && $('.ep-cta-label b', btn);
  if (lab) {
    var busy = false;
    var map = function () {
      var t = lab.textContent.trim(), n = null;
      if (t === 'Confirmar mi pedido') n = 'REALIZAR PEDIDO'; else if (t === 'Pagar mi pedido') n = 'PAGAR MI PEDIDO';
      if (n !== null) { if (t !== n) lab.textContent = n; lab.setAttribute('data-oc', '1'); btn.removeAttribute('data-oc-busy'); }
      else if (t !== 'REALIZAR PEDIDO' && t !== 'PAGAR MI PEDIDO') { lab.removeAttribute('data-oc'); btn.setAttribute('data-oc-busy', '1'); }
    };
    new MutationObserver(map).observe(lab, { childList: true, characterData: true, subtree: true });
    map();
    var sub = $('[data-ep-cta-sub]', btn);
    if (sub) new MutationObserver(function () { if (sub.textContent === 'Pagas en efectivo al recibir') sub.textContent = 'Pago Contra-Entrega'; }).observe(sub, { childList: true, characterData: true, subtree: true });
    if (sub && sub.textContent === 'Pagas en efectivo al recibir') sub.textContent = 'Pago Contra-Entrega';
  }

  /* ---- reseñas cortas y sello debajo del botón ---- */
  var tail = document.createElement('div');
  tail.innerHTML = '<div class="oc-quotes"><div class="st">★★★★★</div><p data-oc-q></p></div><img class="oc-seal" src="/img/oct-sello.webp" alt="Satisfacción garantizada · 100% compra segura" width="150" height="116">';
  form.appendChild(tail);
  var QS = ['“5 minutos son reales. Sin taquicardia.” - Carlos D.', '“Mi segunda caja ya con Invima, llegó discreta.” - Mauricio L.', '“Llegó rápido y en empaque sellado.” - Andrés M.'];
  var qi = 0, qe = $('[data-oc-q]', tail);
  (function rot() { qe.textContent = QS[qi++ % QS.length]; setTimeout(rot, 3500); })();

  /* ---- abrir / cerrar ---- */
  var isOpen = false;
  function open(src) {
    if (isOpen) return; isOpen = true;
    pop.classList.add('is-open'); pop.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('ep-pop-lock');
    bodyEl.scrollTop = 0; thumb(); joinName();
    try { window.fbq && window.fbq('trackCustom', 'PopupOpen', { from: src }); } catch (e) {}
  }
  function close() {
    if (!isOpen) return; isOpen = false;
    pop.classList.remove('is-open'); pop.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('ep-pop-lock');
  }
  window.EP_POPUP = { open: open, close: close };
  pop.addEventListener('click', function (e) { if (e.target === pop || e.target.closest('[data-pop-close]')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  /* ---- selector de ofertas de la página de Shopify (v7): elegir tarjeta = elegir plan; el botón abre la ventana ---- */
  var IDS = ['inicial', 'dominio', 'elite'];
  var CTAS = ['PEDIR EL PLAN BÁSICO', 'PEDIR MI PLAN DOMINIO TOTAL', 'PEDIR MI PLAN ÉLITE'];
  function pick(i) {
    var cards = document.querySelectorAll('#ep-offers .ep-card');
    cards.forEach(function (c, k) { c.classList.toggle('selected', k === i); });
    var c = cards[i], pr = c && c.querySelector('.ep-price');
    var b = document.getElementById('ep-btn-cta'); if (b) b.textContent = CTAS[i];
    var bp = document.getElementById('ep-btn-price'); if (bp && pr) bp.textContent = pr.textContent;
    var r = $('input[name="ep-pack-order"][value="' + IDS[i] + '"]', form);
    if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
    setTimeout(function () { thumb(); ship(); }, 40);
  }
  function goOffers() {
    var box = document.getElementById('ep-offer-widget'), nav = document.getElementById('ep-navbar-fixed');
    var navH = nav && getComputedStyle(nav).display !== 'none' ? nav.offsetHeight : 0;
    if (box) window.scrollTo({ top: box.getBoundingClientRect().top + window.pageYOffset - navH - 10, behavior: 'smooth' });
  }
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest || t.closest('.ep-pop')) return;
    var card = t.closest('#ep-offers .ep-card');
    if (card) { pick([].indexOf.call(document.querySelectorAll('#ep-offers .ep-card'), card)); return; }
    if (t.closest('#ep-checkout-btn')) { e.preventDefault(); open('selector'); return; }
    /* botones de la página (barra de arriba, hero, testimonios, reseñas, barra fija): bajan a las ofertas, nunca salen de la página */
    var btn = t.closest('#go-plan-dominio, #go-plan-dominio-nav, .ep-navbar-fixed-btn, .ep-hero-clean-btn, .ep-wa-ss-cta, .enerplu-review-cta, .oc-sticky-btn');
    if (btn) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); goOffers(); }
  }, true);
  pick(1);

  /* ---- barra fija "VER OFERTAS DISPONIBLES": aparece al bajar y se esconde cuando ya se ven las ofertas o está abierta la ventana ---- */
  var st = document.createElement('div');
  st.className = 'oc-sticky';
  st.innerHTML = '<button type="button" class="oc-sticky-btn">VER OFERTAS DISPONIBLES</button>';
  document.body.appendChild(st);
  var offersSeen = false;
  function stick() { st.classList.toggle('is-on', window.pageYOffset > 350 && !offersSeen && !isOpen); }
  var ow = document.getElementById('ep-offer-widget');
  if (ow && 'IntersectionObserver' in window) new IntersectionObserver(function (en) { offersSeen = en[0].isIntersecting; stick(); }).observe(ow);
  window.addEventListener('scroll', stick, { passive: true });
  window.addEventListener('resize', stick);
  setInterval(stick, 500);

  /* ---- bajo "Ahorras $12.000": "Pagas $X" = el precio de la oferta elegida ya con el descuento (cesar 2026-11-10) ---- */
  var payR = window.EP_RENDER;
  function num(t) { return parseInt(String(t || '').replace(/[^\d]/g, ''), 10) || 0; }
  function payTotals() {
    var tot = $('.oc-sel [data-ep-bind="total"]', form); if (!tot || !payR) return;
    var on = $('input[name="ep-pay"]:checked', form), online = on && on.value !== 'cod';
    form.querySelectorAll('.ep-pay-save').forEach(function (sv) {
      var disc = num((sv.textContent || '').replace(/Pagas.*$/, ''));
      if (!disc) return;
      var total = num(tot.textContent), pay = online ? total : total - disc;
      var el = sv.querySelector('.oc-pay-total');
      var txt = 'Pagas ' + payR.money(pay);
      if (!el) { el = document.createElement('b'); el.className = 'oc-pay-total'; sv.appendChild(document.createElement('br')); sv.appendChild(el); }
      if (el.textContent !== txt) el.textContent = txt;
    });
  }
  /* logos oficiales dentro de la tarjeta de Bold: slider oficial (cesar 2026-11-10) */
  /* "+ 3 guías digitales" en las tarjetas del selector (Dominio y Élite), discreto */
  function guias() {
    document.querySelectorAll('#ep-offers .ep-card').forEach(function (c) {
      if (c.querySelector('.oc-guias')) return;
      var bonus = c.querySelector('.ep-line--bonus'); if (!bonus) return;
      var d = document.createElement('div'); d.className = 'ep-line oc-guias';
      d.innerHTML = '<span class="ep-ico">📘</span><span>+ 3 guías digitales de regalo</span>';
      bonus.parentNode.insertBefore(d, bonus.nextSibling);
    });
  }
  setInterval(guias, 800);
  var boldBox = null;
  function boldSlider() {
    var inp = form.querySelector('input[name="ep-pay"][value="bold"]'); if (!inp) return;
    var row = inp.closest('.ep-pay-opt') || inp.parentNode; if (!row || row.querySelector('.oc-bold-slider')) return;
    /* la tarjeta se vuelve a pintar al cambiar ciudad/plan: se conserva la misma caja y se reubica */
    if (!boldBox) {
      boldBox = document.createElement('div'); boldBox.className = 'oc-bold-slider';
      var sc = document.createElement('script'); sc.async = true; sc.src = 'https://bold.co/library/ui-kit.js?type=slider';
      boldBox.appendChild(sc);
    }
    (row.querySelector('.ep-ship-main') || row).appendChild(boldBox);
  }
  function transLogos() {
    var inp = form.querySelector('input[name="ep-pay"][value="transfer"]'); if (!inp) return;
    var row = inp.closest('.ep-pay-opt') || inp.parentNode; if (!row || row.querySelector('.oc-tr-logos')) return;
    var box = document.createElement('div'); box.className = 'oc-tr-logos';
    box.innerHTML = '<img src="/img/pay-bancolombia.webp" alt="Bancolombia" height="22"><img src="/img/pay-breb.webp" alt="Bre-B" height="20">';
    (row.querySelector('.ep-ship-main') || row).appendChild(box);
  }
  setInterval(function () { payTotals(); boldSlider(); transLogos(); }, 350);
  document.addEventListener('change', function () { setTimeout(payTotals, 60); });

  /* ---- logos de medios de pago: una sola vez, después del botón y solo cuando se paga en línea ----
     Antes salían dos veces (las etiquetas de texto debajo del botón + el sello); ahora se usa solo el kit oficial de Bold y
     el bloque conserva la lógica de la página: aparece cuando el cliente elige pagar en línea (o la ciudad es solo prepago). */
  var payBlock = $('[data-ep-pay-block]', form), logos = $('[data-ep-pay-logos]', form);
  if (payBlock && logos) {
    var pills = $('.ep-pay-logos', logos); if (pills) pills.remove();
    var cap = $('p', logos); if (cap) cap.textContent = 'Medios de pago aceptados';
    var kit = document.createElement('div'); kit.id = 'bold-kit'; kit.className = 'oc-bold-kit';
    logos.insertBefore(kit, $('small', logos));
    /* queda donde estaba: justo después del botón (cesar 2026-11-10) */
    var sc = document.createElement('script'); sc.async = true; sc.src = 'https://bold.co/library/ui-kit.js?theme=light&target=bold-kit';
    document.head.appendChild(sc);
  }
  if (q.get('bold-order-id')) open('bold');
})();
