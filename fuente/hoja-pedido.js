/* E-02 · Formulario en ventana desde abajo ("hoja de pedido"), prueba A/B 50/50 (2026-11-08).
   Diagnóstico (2-7 nov): 4.302 vieron las ofertas, 1.363 tocaron "Quiero / Ver ofertas" y solo 184 escribieron el celular.
   El botón "Hacer mi pedido" queda ~2.200 px debajo de las ofertas.
   Variante B: con las ofertas en pantalla aparece una barra fija "Pedir <plan> →"; tocarla o tocar una tarjeta abre el
   formulario de siempre (los mismos campos, validación, carrito y pedido) en una ventana a pantalla completa con el botón
   de pedir siempre visible. No se crea un formulario nuevo: se mueve el mismo <form> a la ventana y se devuelve al cerrar.
   Variante A: la página de siempre. Forzar: ?ab2=A o ?ab2=B. Solo participa la página "/" (no /producto). */
(function () {
  var MODE = window.EP_HOJA_MODE || 'off';   /* off | ab | all (lo pone build.py) */
  if (MODE === 'off') return;
  if (location.pathname !== '/' && location.pathname !== '/index.html' && !/\/public\/index\.html$/.test(location.pathname)) return;
  var test = /[?&]ep_test=1(&|$)/.test(location.search);
  var q = new URLSearchParams(location.search);
  var v = (q.get('ab2') || '').toUpperCase();
  if (v !== 'A' && v !== 'B') {
    if (MODE === 'all') v = 'B';
    else {
      try { v = localStorage.getItem('ep_e02') || ''; } catch (e) {}
      if (v !== 'A' && v !== 'B') { v = Math.random() < 0.5 ? 'A' : 'B'; try { localStorage.setItem('ep_e02', v); } catch (e) {} }
    }
  }
  /* registra la variante en el embudo (funnel_events: ab_assign, extra {exp:'E02', v}) para cruzar con checkout_attempts.session_id */
  if (!test) {
    var sid = ''; try { sid = sessionStorage.getItem('ep_sid') || ''; } catch (e) {}
    if (sid) {
      var body = JSON.stringify({ sid: sid, ev: 'ab_assign', page: (location.host + location.pathname).slice(0, 300), store: 'enerplu', utm_source: q.get('utm_source'), utm_campaign: q.get('utm_campaign'), utm_content: q.get('utm_content'), utm_term: q.get('utm_term'), extra: { exp: 'E02', v: v } });
      var U = 'https://mqwscbpdozrdiqxofmod.supabase.co/functions/v1/funnel-track';
      try { if (!(navigator.sendBeacon && navigator.sendBeacon(U, new Blob([body], { type: 'text/plain' })))) fetch(U, { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }); } catch (e) {}
    }
  }
  if (v !== 'B') return;

  var form = document.querySelector('[data-ep-order]');
  var widget = document.getElementById('ep-offer-widget');
  if (!form || !widget) return;
  var home = form.parentNode, holder = document.createElement('div');
  holder.className = 'ep-hoja-holder';
  var R = window.EP_RENDER, C = window.EP_CONFIG;
  function pack() {
    var r = form.querySelector('input[name="ep-pack-order"]:checked');
    var id = r ? r.value : (C && C.defaultPack);
    var list = (C && C.packs) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0] || null;
  }
  function money(n) { return R && R.money ? R.money(n) : '$' + Math.round(n).toLocaleString('es-CO'); }

  /* ventana */
  var sheet = document.createElement('div');
  sheet.className = 'ep-root ep-hoja';
  sheet.setAttribute('data-ep-theme', 'negro');
  sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'Datos de tu pedido');
  sheet.hidden = true;
  sheet.innerHTML =
    '<div class="ep-hoja-back" data-hoja-close></div>' +
    '<div class="ep-hoja-panel ep-order eph-order">' +
      '<div class="ep-hoja-top"><b>Completa tu pedido</b><span>💵 Pagas al recibir · 🚚 Envío gratis</span>' +
        '<button type="button" class="ep-hoja-x" data-hoja-close aria-label="Cerrar">✕</button></div>' +
      '<div class="ep-hoja-body ep-wrap ep-wrap--form"></div>' +
    '</div>';
  document.body.appendChild(sheet);
  var bodyEl = sheet.querySelector('.ep-hoja-body');

  /* barra fija con las ofertas en pantalla */
  var bar = document.createElement('div');
  bar.className = 'ep-root ep-hoja-bar';
  bar.setAttribute('data-ep-theme', 'negro');
  bar.innerHTML = '<button type="button" class="ep-cta ep-hoja-bar-btn"><span class="ep-cta-label"><b data-hoja-bar-txt>Pedir este plan</b><small>Pagas en efectivo al recibir</small></span><span class="ep-cta-sep" aria-hidden="true"></span><span class="ep-cta-price" data-hoja-bar-price></span></button>';
  document.body.appendChild(bar);
  function paintBar() {
    var p = pack(); if (!p) return;
    bar.querySelector('[data-hoja-bar-txt]').textContent = 'Pedir ' + p.name + ' →';
    bar.querySelector('[data-hoja-bar-price]').textContent = money(p.price);
  }
  paintBar();
  var inView = false;
  function showBar() { bar.classList.toggle('is-on', inView && sheet.hidden && !form.hidden); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { inView = en[0].isIntersecting; showBar(); }, { threshold: 0.15 }).observe(widget);
  }

  var lastY = 0;
  function open(src) {
    if (!sheet.hidden || form.hidden) return;
    lastY = window.pageYOffset;
    holder.style.height = form.offsetHeight + 'px';
    home.insertBefore(holder, form);
    bodyEl.appendChild(form);
    sheet.hidden = false;
    document.documentElement.classList.add('ep-hoja-open');
    bodyEl.scrollTop = 0;
    showBar();
    send('hoja_open', { from: src, plan: (pack() || {}).id });
    try { window.fbq && window.fbq('trackCustom', 'HojaOpen', { from: src }); } catch (e) {}
  }
  function close(scrollBack) {
    if (sheet.hidden) return;
    home.insertBefore(form, holder);
    if (holder.parentNode) holder.parentNode.removeChild(holder);
    sheet.hidden = true;
    document.documentElement.classList.remove('ep-hoja-open');
    if (scrollBack) window.scrollTo(0, lastY);
    showBar();
  }
  function send(ev, extra) {
    if (test) return;
    var sid = ''; try { sid = sessionStorage.getItem('ep_sid') || ''; } catch (e) {}
    if (!sid) return;
    var b = JSON.stringify({ sid: sid, ev: ev, page: (location.host + location.pathname).slice(0, 300), store: 'enerplu', utm_source: q.get('utm_source'), utm_campaign: q.get('utm_campaign'), utm_content: q.get('utm_content'), utm_term: q.get('utm_term'), extra: extra || null });
    try { navigator.sendBeacon && navigator.sendBeacon('https://mqwscbpdozrdiqxofmod.supabase.co/functions/v1/funnel-track', new Blob([b], { type: 'text/plain' })); } catch (e) {}
  }

  bar.addEventListener('click', function () { open('barra'); });
  sheet.addEventListener('click', function (e) { if (e.target.closest('[data-hoja-close]')) close(true); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(true); });
  /* tocar una tarjeta de oferta en la página: se marca el plan y se abre la ventana */
  form.addEventListener('click', function (e) {
    if (!sheet.hidden) return;
    var card = e.target.closest && e.target.closest('.eph-card');
    if (!card) return;
    setTimeout(function () { open('tarjeta'); }, 220);
  });
  form.addEventListener('change', function (e) { if (e.target && e.target.name === 'ep-pack-order') paintBar(); });
  document.addEventListener('change', function (e) { if (e.target && /^ep-pack/.test(e.target.name || '')) setTimeout(paintBar, 0); });

  /* pedido creado: el formulario se oculta y aparece el gracias (fuera del form) → se cierra la ventana y se muestra el gracias */
  new MutationObserver(function () {
    if (form.hidden) {
      close(false); showBar();
      var t = document.querySelector('[data-ep-thanks]');
      if (t) t.scrollIntoView({ block: 'start' });
    }
  }).observe(form, { attributes: true, attributeFilter: ['hidden'] });
})();
