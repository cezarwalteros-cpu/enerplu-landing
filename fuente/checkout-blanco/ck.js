/* Checkout blanco: barra 1 Plan · 2 Entrega · 3 Pago. Solo pinta el avance; no toca el envío del pedido. */
(function () {
  var bar = document.querySelector('.ck3-bar'); if (!bar) return;
  var s = bar.querySelectorAll('span');
  var req = ['first_name', 'last_name', 'phone', 'city', 'address1'];
  function lleno() {
    return req.every(function (n) { var i = document.querySelector('.ck3 [name="' + n + '"]'); return i && i.value.trim().length > 1; });
  }
  function pinta() {
    var plan = !!document.querySelector('.ck3 .eph-card.is-on');
    var ent = lleno();
    s[0].className = plan ? 'is-done' : 'is-on';
    s[1].className = ent ? 'is-done' : (plan ? 'is-on' : '');
    s[2].className = ent ? 'is-on' : '';
  }
  document.addEventListener('input', pinta, true);
  document.addEventListener('change', pinta, true);
  document.addEventListener('click', function () { setTimeout(pinta, 0); }, true);
  setTimeout(pinta, 300);
})();
/* Plan elegido en la página anterior: /checkout-blanco?plan=basico|dominio|elite llega con ese plan ya marcado. */
(function () {
  var plan = (new URLSearchParams(location.search).get('plan') || '').toLowerCase();
  var id = { basico: 'inicial', inicial: 'inicial', dominio: 'dominio', elite: 'elite' }[plan];
  if (!id) return;
  var n = 0;
  (function marca() {
    var el = document.querySelector('input[name="ep-pack-order"][value="' + id + '"]');
    if (!el) { if (n++ < 20) setTimeout(marca, 150); return; }
    if (!el.checked) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); }
  })();
})();
