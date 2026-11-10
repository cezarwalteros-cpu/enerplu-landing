/* HERO v2: galería deslizable con miniaturas + selector de planes del hero.
   Los radios se llaman ep-pack-hero: el formulario (app.js) ya los escucha y elige ese mismo plan abajo (setPack 'hero').
   Precios: los de EP_CONFIG, que el formulario actualiza con los del checkout; aquí se repintan cuando cambian. */
(function () {
  var hero = document.getElementById("ep-hero-clean");
  var C = window.EP_CONFIG, R = window.EP_RENDER;
  if (!hero || !hero.classList.contains("hv") || !C || !R) return;

  /* galería */
  var main = hero.querySelector(".hv-main"), thumbs = hero.querySelectorAll(".hv-thumbs button");
  function mark(i) { thumbs.forEach(function (b, j) { b.classList.toggle("is-on", i === j); }); }
  thumbs.forEach(function (b, i) {
    b.addEventListener("click", function () { main.scrollTo({ left: i * main.clientWidth, behavior: "smooth" }); mark(i); });
  });
  var tm;
  main.addEventListener("scroll", function () {
    clearTimeout(tm);
    tm = setTimeout(function () { mark(Math.round(main.scrollLeft / Math.max(1, main.clientWidth))); }, 60);
  }, { passive: true });

  /* planes */
  function pack(id) { var r = null; C.packs.forEach(function (p) { if (p.id === id) r = p; }); return r; }
  function current() {
    var on = document.querySelector("#ep-order .ep-sel-opt.is-on");
    var chk = hero.querySelector('input[name="ep-pack-hero"]:checked');
    return (on && on.getAttribute("data-pack")) || (chk && chk.value) || C.defaultPack;
  }
  var cta = hero.querySelector("[data-hv-cta]");
  function paint() {
    var sel = current();
    hero.querySelectorAll(".hv-plan").forEach(function (el) {
      var p = pack(el.getAttribute("data-pack")); if (!p) return;
      var on = p.id === sel, inp = el.querySelector("input");
      el.classList.toggle("is-on", on); if (inp) inp.checked = on;
      var was = C.singleBoxPrice * p.boxes;
      var q = function (s) { return el.querySelector(s); };
      if (q(".hv-price")) q(".hv-price").textContent = R.money(p.price);
      if (q(".hv-was")) q(".hv-was").textContent = R.money(was);
      if (q(".hv-off")) q(".hv-off").textContent = Math.floor((1 - p.price / was) * 100) + "% OFF";
      if (q(".hv-unit")) q(".hv-unit").textContent = R.money(p.price / p.tablets) + " c/tableta";
    });
    var p = pack(sel);
    if (cta && p) cta.innerHTML = "Quiero el " + R.esc(p.name) + " · " + R.money(p.price) + " →<small>Pagas en efectivo al recibir · envío gratis</small>";
  }
  hero.addEventListener("change", function (e) { if (e.target && e.target.name === "ep-pack-hero") setTimeout(paint, 0); });
  var list = document.querySelector('#ep-order [data-ep-render="selector"]');
  if (list && "MutationObserver" in window) {
    new MutationObserver(function () { paint(); }).observe(list, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
  }
  paint();
})();
