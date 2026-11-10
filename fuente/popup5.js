/* Popup de 5% en la primera compra (cesar 2026-11-10: "quiero hacer esto mismo en ENERPLU", igual que Mg Collagen).
   Prueba "popup5" (N sin popup 20%, A 40%, B 40%), independiente de la prueba de página E-04 (sale por igual en "/" y en "/b"):
   A = "No te vayas": aparece al intentar salir (botón atrás, volver a la pestaña, cursor que sale por arriba). Cupón con reloj de 15 min.
   B = "Primera compra": aparece a los 8 s y deja una barra arriba.
   El descuento lo valida y lo aplica el CRM (discount_codes, checkout-native action "coupon"); aquí solo se muestra.
   Solo se ve en el resumen del formulario; se suma al descuento de pago anticipado. ?pop=A|B fuerza, ?pop=0 lo apaga. */
(function () {
  var CODE = 'ENERPLU5', PCT = 5, MIN_A = 15, SEG_B = 8, IMG = '/img/popup-enerplu.webp';
  var I = {
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    clk: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    chk: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="17.5" cy="17.5" r="1.5"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
    arr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var ss = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  var mmss = function (ms) { var s = Math.max(0, Math.round(ms / 1000)); return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2); };

  function init(h) {
    var qs = new URLSearchParams(location.search), f = (qs.get('pop') || '').toUpperCase();
    var forced = f === 'A' || f === 'B' || f === 'N' ? f : null;
    if (qs.get('pop') === '0') return;
    /* N = grupo sin popup (20%), para saber si el 5% de verdad sube pedidos; A y B 40% cada uno */
    var v = forced || ls.get('ep_pop_v');
    if (v !== 'A' && v !== 'B' && v !== 'N') { var r = Math.random(); v = r < 0.2 ? 'N' : r < 0.6 ? 'A' : 'B'; ls.set('ep_pop_v', v); }
    if (!ss.get('ep_pop_as')) { ss.set('ep_pop_as', '1'); h.funnel('ab_assign', { exp: 'popup5', v: v }); }
    if (v === 'N') return;

    /* cupón ya aceptado en esta sesión: se conserva al recargar */
    try { var c0 = JSON.parse(ss.get('ep_cup') || 'null'); if (c0 && (!c0.exp || c0.exp > Date.now())) var c0ok = c0; } catch (e) {}

    /* aviso de cupón aplicado, justo donde aterriza la persona (encima de "Tu pedido" o del formulario) */
    var note = null, ntick = null;
    function apply(c) {
      h.applyCoupon(c); clearInterval(ntick); if (note) { note.remove(); note = null; }
      if (!c) return;
      var at = document.querySelector('#tp-card') || document.querySelector('#ep-order form') || document.querySelector('#ep-order');
      if (!at) return;
      note = document.createElement('div'); note.className = 'epp-ok';
      note.innerHTML = I.chk + '<div><b>' + c.pct + '% de descuento aplicado</b><small>Código ' + c.code + ' · ya está en el total de tu pedido</small></div>' + (c.exp ? '<span class="epp-tm">' + I.clk + '<span data-tm></span></span>' : '');
      at.parentNode.insertBefore(note, at);
      if (c.exp) { var f = function () { var left = c.exp - Date.now(); if (left <= 0) { ss.set('ep_cup', 'null'); apply(null); return; } note.querySelector('[data-tm]').textContent = mmss(left); }; f(); ntick = setInterval(f, 1000); }
    }
    var seen = !forced && ls.get('ep_pop_seen') === '1', open = false, el = null, tick = null, expA = 0, pre = false;
    var typing = function () { var a = document.activeElement; return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
    if (typeof c0ok !== 'undefined') apply(c0ok);
    function preload() { if (pre) return; pre = true; new Image().src = IMG; }

    function bar() {
      if (v !== 'B' || bar.d) return; bar.d = 1;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'epp-bar';
      b.innerHTML = 'Primera compra · <b>' + PCT + '% con ' + CODE + '</b>';
      b.addEventListener('click', function () { accept('bar'); });
      document.body.insertBefore(b, document.body.firstChild);
    }
    function close(how) {
      if (!open) return; open = false; clearInterval(tick);
      document.documentElement.classList.remove('epp-lock');
      el.classList.remove('on'); var e = el; setTimeout(function () { e.remove(); }, 260);
      if (how) h.funnel('popup_close', { v: v, how: how });
      bar();
    }
    function accept(from) {
      h.funnel('popup_accept', { v: v, from: from });
      /* se aplica de una vez para no hacer esperar; el CRM lo valida en segundo plano y de nuevo al crear el pedido */
      var c = { code: CODE, pct: PCT, exp: v === 'A' ? (expA || Date.now() + MIN_A * 60000) : null, demo: !!h.test };
      ss.set('ep_cup', JSON.stringify(c)); apply(c);
      close(); h.goForm();
      if (h.test) return; /* vista de prueba: se muestra aunque el código aún no exista (no se manda al pedido) */
      h.api({ action: 'coupon', code: CODE, offer_key: h.selKey(), bump: h.bump() }).then(function (r) {
        if (r && r.status && r.status < 500 && !(r.j && r.j.success)) { ss.set('ep_cup', 'null'); apply(null); h.funnel('form_error', { server: 1, cupon: CODE }); }
      }, function () {});
    }
    function show(trig) {
      if (seen || open || h.ordered()) return false;
      seen = true; open = true; if (!forced) ls.set('ep_pop_seen', '1');
      preload();
      var A = v === 'A'; if (A) expA = Date.now() + MIN_A * 60000;
      el = document.createElement('div'); el.className = 'epp'; el.setAttribute('data-v', v);
      el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', PCT + '% de descuento en tu primera compra');
      el.innerHTML =
        '<div class="epp-card"><div class="epp-hero" style="background-image:url(' + IMG + ')"><span class="epp-mark"><i></i>ENERPLU</span><button type="button" class="epp-x" aria-label="Cerrar">' + I.x + '</button></div>' +
        '<div class="epp-body"><p class="epp-eye">' + (A ? 'Antes de irte' : 'Primera compra') + '</p>' +
        (A ? '<p class="epp-t">Pruébalo hoy con <em>' + PCT + '% de descuento</em></p><p class="epp-p">Tu primer pedido sale con <b>' + PCT + '% menos</b>. Lo pides ahora, llega en paquete discreto y <b>pagas al recibir</b>.</p>'
           : '<p class="epp-t">En tu primera compra, <em>' + PCT + '% de descuento</em></p><p class="epp-p">El descuento se aplica solo en tu pedido, <b>no tienes que escribir nada</b>. Si pagas ahora, se suma al descuento de pago anticipado.</p>') +
        '<div class="epp-cup"><span class="epp-pct">' + PCT + '<sup>%</sup></span><div class="epp-mid"><small>Tu código</small><b>' + CODE + '</b></div>' +
        (A ? '<span class="epp-tm">' + I.clk + '<span data-tm>' + mmss(MIN_A * 60000) + '</span></span>' : '<span class="epp-tm s">1.ª compra</span>') + '</div>' +
        '<button type="button" class="epp-go">' + (A ? 'Usar mi 5% ahora' : 'Aplicar mi 5%') + I.arr + '</button>' +
        '<ul class="epp-tr"><li>' + I.truck + 'Envío gratis</li><li>' + I.box + 'Paquete discreto</li><li>' + I.chk + 'Pagas al recibir</li></ul>' +
        '<button type="button" class="epp-no">' + (A ? 'No, gracias' : 'Seguir viendo') + '</button></div></div>';
      document.body.appendChild(el);
      document.documentElement.classList.add('epp-lock');
      requestAnimationFrame(function () { el.classList.add('on'); });
      el.querySelector('.epp-x').addEventListener('click', function () { close('x'); });
      el.querySelector('.epp-no').addEventListener('click', function () { close('no'); });
      el.querySelector('.epp-go').addEventListener('click', function () { accept('popup'); });
      el.addEventListener('click', function (e) { if (e.target === el) close('fuera'); });
      if (A) tick = setInterval(function () { var t = el.querySelector('[data-tm]'); if (t) t.textContent = mmss(expA - Date.now()); }, 1000);
      h.funnel('popup_view', { v: v, trig: trig });
      return true;
    }
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) close('esc'); });
    if (seen) { bar(); return; }

    if (v === 'A') {
      /* 1) Botón "atrás": se arma cuando ya mostró interés (bajó en la página o lleva 15 s).
            Chrome en celular ignora el "atrás" si la persona nunca tocó la página, así que el estado se guarda al primer toque. */
      var armed = false, ready = false, pushed = false;
      var active = function () { try { return !navigator.userActivation || navigator.userActivation.hasBeenActive; } catch (e) { return true; } };
      var push = function () {
        if (pushed || !ready || seen || !active()) return; pushed = true;
        try { history.pushState({ eppop: 1 }, ''); } catch (e) { return; }
        addEventListener('popstate', function onPop(e) {
          if (e.state && e.state.eppop) return;
          removeEventListener('popstate', onPop);
          show('atras');
        });
      };
      var arm = function () { if (armed) return; armed = true; ready = true; preload(); push(); };
      ['pointerdown', 'touchend', 'keydown'].forEach(function (ev) { addEventListener(ev, function () { setTimeout(push, 0); }, { passive: true }); });
      setTimeout(arm, 15000);
      var t0 = Date.now(), maxY = 0, lastY = 0, lastT = 0, upFrom = -1;
      addEventListener('scroll', function () {
        var d = document.documentElement, y = scrollY, now = Date.now();
        if ((y + innerHeight) / d.scrollHeight > 0.3) arm();
        /* 1b) Celular: venía leyendo abajo y sube rápido (gesto típico antes de salir). Mismas medidas que Mg:
               racha hacia arriba de más del 60% del alto de pantalla, habiendo bajado más de 1,2 pantallas y con 6 s en la página */
        if (y > maxY) maxY = y;
        if (y < lastY) {
          if (upFrom < 0 || now - lastT > 300) upFrom = lastY;
          if (now - t0 > 6000 && maxY > innerHeight * 1.2 && upFrom - y > innerHeight * 0.6 && !typing()) show('sube');
        } else upFrom = -1;
        lastY = y; lastT = now;
      }, { passive: true });
      /* 2) Se fue a otra app o pestaña y volvió (2 s o más por fuera) */
      var away = 0;
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { away = Date.now(); return; }
        if (away && Date.now() - away >= 2000 && !typing()) show('vuelve');
      });
      /* 3) Computador: el cursor sale por arriba */
      document.addEventListener('mouseout', function (e) { if (!e.relatedTarget && e.clientY <= 0 && !typing()) show('cursor'); });
    } else {
      setTimeout(preload, 2000);
      setTimeout(function go() { if (typing()) { setTimeout(go, 4000); return; } show('tiempo'); }, SEG_B * 1000);
    }
  }
  if (window.EP_POP) init(window.EP_POP); else addEventListener('ep:pop-ready', function () { init(window.EP_POP); }, { once: true });
})();
