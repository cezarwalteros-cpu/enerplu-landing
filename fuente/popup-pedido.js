/* E-03 · Ofertas + formulario solo en ventana emergente (popup), como Mg Collagen y el COD de Shopify. Prueba A/B 50/50 (2026-11-08).
   Idea de cesar: quitar el formulario de la página y dejar solo el popup.
   Variante B: la sección "ofertas + formulario" (#ep-order) sale de la página y vive en una ventana. En su lugar queda una
   tarjeta corta con la garantía y el botón "VER OFERTAS DISPONIBLES". Todos los botones de compra de la página
   ("PÍDELO YA", "VER OFERTAS", "QUIERO…") abren la ventana. Es el mismo <form>: mismos campos, validación, carrito y pedido.
   Variante A: la página de siempre. Forzar: ?ab3=A o ?ab3=B. Solo participa la página "/" (no /producto).
   Medición: funnel_events ab_assign {exp:'E03', v} por sesión, cruzado con checkout_attempts.session_id.
   Con la ventana cerrada queda fuera de la pantalla (no display:none), así "vio las ofertas" (selector_view) y los
   hitos ReachOffer/ReachForm solo cuentan cuando la persona abre la ventana. */
(function () {
  var MODE = window.EP_POPUP_MODE || 'off';   /* off | ab | all (lo pone build.py) */
  if (MODE === 'off') return;
  if (location.pathname !== '/' && location.pathname !== '/index.html' && !/\/public\/index\.html$/.test(location.pathname)) return;
  var test = /[?&]ep_test=1(&|$)/.test(location.search);
  var q = new URLSearchParams(location.search);
  var v = (q.get('ab3') || '').toUpperCase();
  if (v !== 'A' && v !== 'B') {
    if (MODE === 'all') v = 'B';
    else {
      try { v = localStorage.getItem('ep_e03') || ''; } catch (e) {}
      if (v !== 'A' && v !== 'B') { v = Math.random() < 0.5 ? 'A' : 'B'; try { localStorage.setItem('ep_e03', v); } catch (e) {} }
    }
  }
  function send(ev, extra) {
    if (test) return;
    var sid = ''; try { sid = sessionStorage.getItem('ep_sid') || ''; } catch (e) {}
    if (!sid) return;
    var b = JSON.stringify({ sid: sid, ev: ev, page: (location.host + location.pathname).slice(0, 300), store: 'enerplu', utm_source: q.get('utm_source'), utm_campaign: q.get('utm_campaign'), utm_content: q.get('utm_content'), utm_term: q.get('utm_term'), extra: extra || null });
    var U = 'https://mqwscbpdozrdiqxofmod.supabase.co/functions/v1/funnel-track';
    try { if (!(navigator.sendBeacon && navigator.sendBeacon(U, new Blob([b], { type: 'text/plain' })))) fetch(U, { method: 'POST', body: b, keepalive: true, headers: { 'Content-Type': 'text/plain' } }); } catch (e) {}
  }
  send('ab_assign', { exp: 'E03', v: v });
  if (v !== 'B') return;

  var order = document.getElementById('ep-order');
  var block = order && order.closest('.ep-root');
  if (!block) return;
  document.documentElement.classList.add('ep-pop-on');

  /* tarjeta que queda en la página, donde estaban las ofertas */
  var gar = block.querySelector('.eph-garantia'), bonus = block.querySelector('.eph-bonus');
  var teaser = document.createElement('div');
  teaser.className = 'ep-root ep-pop-teaser';
  teaser.setAttribute('data-ep-theme', 'negro');
  teaser.innerHTML =
    '<div class="ep-pop-teaser-in">' +
      '<h2>Tenemos 3 ofertas disponibles hoy</h2>' +
      '<p class="ep-pop-teaser-sub">🚚 Envío gratis · 💵 Pago al recibir · 📦 Discreto</p>' +
      (gar ? gar.outerHTML : '') + (bonus ? bonus.outerHTML : '') +
      '<button type="button" class="ep-pop-btn" data-pop-open="tarjeta">VER OFERTAS DISPONIBLES →<small>Pagas en efectivo al recibir</small></button>' +
    '</div>';
  block.parentNode.insertBefore(teaser, block);

  /* ventana */
  var pop = document.createElement('div');
  pop.className = 'ep-pop';
  pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'true'); pop.setAttribute('aria-label', 'Elige tu oferta y haz tu pedido');
  pop.setAttribute('aria-hidden', 'true');
  pop.innerHTML =
    '<div class="ep-pop-box">' +
      '<div class="ep-pop-head"><div><b>Elige tu oferta</b><span>💵 Pagas al recibir · 🚚 Envío gratis</span></div>' +
        '<button type="button" class="ep-pop-x" data-pop-close aria-label="Cerrar">✕</button></div>' +
      '<div class="ep-pop-body"></div>' +
    '</div>';
  document.body.appendChild(pop);
  var bodyEl = pop.querySelector('.ep-pop-body');
  bodyEl.appendChild(block);
  block.setAttribute('data-ep-theme', 'claro');   /* cesar 2026-11-08: la ventana va en fondo blanco (tema claro base del formulario) */

  var isOpen = false;
  function open(src) {
    if (isOpen) return;
    isOpen = true;
    pop.classList.add('is-open'); pop.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('ep-pop-lock');
    bodyEl.scrollTop = 0;
    try { window.fbq && window.fbq('trackCustom', 'PopupOpen', { from: src }); } catch (e) {}
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    pop.classList.remove('is-open'); pop.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('ep-pop-lock');
  }
  window.EP_POPUP = { open: open, close: close };

  /* Botones de compra de la página → abren la ventana. Se escucha en window (antes que los demás) sin cortar la
     propagación, para que el embudo siga registrando cta_click; los scrolls que hagan los otros scripts quedan detrás. */
  var CTA = /quiero|ofertas|elige|elegir|comprar|pedir|pídelo|pidelo|ordenar/i;
  window.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('a, button, .gp-button, [role=button]') : null;
    if (!t || t.closest('.ep-pop')) return;
    var href = t.getAttribute('href') || '';
    var hit = t.hasAttribute('data-pop-open') || t.hasAttribute('data-ep-go') || t.hasAttribute('data-ep-cta') ||
      /#ep-(offer-widget|order|offer)\b/.test(href) || t.id === 'enerplu-review-cta' ||
      ((!href || /^#|^javascript:/i.test(href) || /\/products\/enerplu/i.test(href)) && CTA.test(t.textContent || ''));
    if (!hit) return;
    e.preventDefault();
    open(t.getAttribute('data-pop-open') || (t.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30));
  }, true);
  pop.addEventListener('click', function (e) { if (e.target === pop || e.target.closest('[data-pop-close]')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  /* regreso desde Bold (?bold-order-id=…): el resultado del pago se pinta en el gracias, que está dentro de la ventana */
  if (q.get('bold-order-id')) open('bold');
})();
