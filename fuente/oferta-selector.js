/* Selector de ofertas con el diseño del selector v13 (tarjetas horizontales).
   Reemplaza el dibujo del selector del formulario; la lógica (plan elegido, total, carrito, pedido) sigue igual.
   Precio = el del checkout (se actualiza solo). Tachado = precio de 1 caja × cajas. */
(function () {
  var R = window.EP_RENDER;
  if (!R) return;
  var LOOK = {
    dominio: { tag: "★ El más pedido", rec: true, inc: ["Retardante 30 ml <b>gratis</b>", "Obsequio Velvet <b>gratis</b>"], img: "https://cdn.shopify.com/s/files/1/0748/9418/0397/files/DOMINIO.webp?v=1793468717&width=700" },
    elite:   { tag: "Máximo ahorro", inc: ["Retardante 30 ml <b>gratis</b>", "Obsequio Velvet <b>gratis</b>"], img: "https://cdn.shopify.com/s/files/1/0748/9418/0397/files/ELITE.webp?v=1793468748&width=700" },
    inicial: { tag: "Para probar", inc: [], basic: true, img: "https://cdn.shopify.com/s/files/1/0748/9418/0397/files/BASICO.webp?v=1793468688&width=700" }
  };
  /* E-06 · Oferta A (cesar 2026-11-12): mismos planes y precios, sin tachados ni %, precio por tableta,
     una línea con lo que incluye cada plan. Solo en /oferta-a (window.EP_OFERTA_A). */
  var OFA = !!window.EP_OFERTA_A;
  if (OFA) {
    LOOK.dominio.tag = "El más pedido"; LOOK.dominio.incA = "Incluye spray retardante 30 ml + sachet";
    LOOK.elite.tag = "Mejor precio por tableta"; LOOK.elite.incA = "Incluye spray retardante 30 ml + sachet";
    LOOK.inicial.incA = "Incluye sachet · sin spray retardante";
    var derive0 = R.derive;   /* sin "precio de lista" inflado en el resumen ni en los textos de ahorro */
    R.derive = function (c, p) { var d = derive0(c, p); d.compare = p.price; d.save = 0; return d; };
  }
  R.selector = function (cfg, sel) {
    sel = sel || cfg.defaultPack;
    if (OFA) return R.ordered(cfg).map(function (p) {
      var L = LOOK[p.id] || { tag: "", img: "" }, on = p.id === sel;
      return '<label class="ep-sel-opt eph-card eph-c' + (L.rec ? ' rec' : '') + (L.basic ? ' is-basic' : '') + (on ? ' is-on' : '') + '" data-pack="' + p.id + '">' +
        '<input type="radio" name="ep-pack-order" value="' + p.id + '"' + (on ? ' checked' : '') + '>' +
        (L.tag ? '<span class="eph-tag">' + L.tag + '</span>' : '') +
        '<span class="eph-c-row">' +
          '<span class="eph-check" aria-hidden="true"></span>' +
          '<span class="eph-c-img"><img src="' + R.esc(L.img) + '" alt="' + R.esc(p.name) + ' ENERPLU" loading="' + (L.rec ? 'eager' : 'lazy') + '" decoding="async"></span>' +
          '<span class="eph-c-info">' +
            '<span class="eph-name">' + R.esc(p.name) + '</span>' +
            '<span class="eph-qty">' + p.boxes + (p.boxes > 1 ? ' cajas' : ' caja') + ' · ' + p.tablets + ' tabletas</span>' +
            '<span class="eph-unit">' + R.money(p.price / p.tablets) + ' por tableta</span>' +
          '</span>' +
          '<span class="eph-c-price"><span class="eph-price">' + R.money(p.price) + '</span></span>' +
        '</span>' +
        (L.incA ? '<span class="eph-c-gift eph-c-inc' + (L.basic ? ' is-miss' : '') + '"><span>' + R.esc(L.incA) + '</span></span>' : '') +
      '</label>';
    }).join('');
    return R.ordered(cfg).map(function (p) {
      var L = LOOK[p.id] || { tag: "", inc: [], img: "" };
      var was = cfg.singleBoxPrice * p.boxes, save = was - p.price, on = p.id === sel;
      var pct = was > 0 ? Math.round(save / was * 100) : 0;
      var gifts = L.inc.length ? '<span>🎁 <b>Gratis:</b> Retardante 30 ml + Velvet</span>' : '';
      return '<label class="ep-sel-opt eph-card eph-c' + (L.rec ? ' rec' : '') + (L.basic ? ' is-basic' : '') + (on ? ' is-on' : '') + '" data-pack="' + p.id + '">' +
        '<input type="radio" name="ep-pack-order" value="' + p.id + '"' + (on ? ' checked' : '') + '>' +
        (L.tag ? '<span class="eph-tag">' + L.tag + '</span>' : '') +
        '<span class="eph-c-row">' +
          '<span class="eph-check" aria-hidden="true"></span>' +
          '<span class="eph-c-img"><img src="' + R.esc(L.img) + '" alt="' + R.esc(p.name) + ' ENERPLU" loading="' + (L.rec ? 'eager' : 'lazy') + '" decoding="async"></span>' +
          '<span class="eph-c-info">' +
            '<span class="eph-name">' + R.esc(p.name) + '</span>' +
            '<span class="eph-qty">' + p.boxes + (p.boxes > 1 ? ' cajas' : ' caja') + ' · ' + p.tablets + ' tabletas</span>' +
            (p.tablets ? '<span class="eph-unit">' + R.money(p.price / p.tablets) + ' por ocasión</span>' : '') +   /* C-02: precio por uso */
          '</span>' +
          '<span class="eph-c-price">' +
            '<span class="eph-price">' + R.money(p.price) + '</span>' +
            (save > 0 ? '<span class="eph-was">' + R.money(was) + '</span>' : '') +
            (pct > 0 ? '<span class="eph-pct">-' + pct + '%</span>' : '') +
          '</span>' +
        '</span>' +
        (gifts ? '<span class="eph-c-gift">' + gifts + (save > 0 ? '<span class="eph-c-save">Ahorras ' + R.money(save) + '</span>' : '') + '</span>' : '') +
      '</label>';
    }).join('');
  };

  /* La barra fija ("VER OFERTAS") se oculta mientras la oferta o el formulario están en pantalla */
  var order = document.getElementById("ep-order");
  if (order && "IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      document.documentElement.classList.toggle("ep-in-order", en[0].isIntersecting);
    }, { rootMargin: "0px 0px -15% 0px" }).observe(order);
  }

  /* Botones de la landing ("Quiero…", "Ver ofertas", "Comprar"…) → bajan a las ofertas */
  var CTA = /quiero|ver ofertas|ofertas|elige|elegir|comprar|pedir|ordenar/i;
  document.addEventListener("click", function (e) {
    if (!e.isTrusted) return;
    var t = e.target && e.target.closest ? e.target.closest("a, button, .gp-button, [role=button]") : null;
    if (!t || t.closest(".ep-root") || t.closest(".ep-hc-sticky") || t.closest("#ep-hero-clean")) return;
    var href = t.getAttribute && (t.getAttribute("href") || "");
    if (href && !/^#|^javascript:/i.test(href) && !/\/products\/enerplu/i.test(href)) return;
    if (!CTA.test(t.textContent || "")) return;
    e.preventDefault(); e.stopPropagation();
    var box = document.getElementById("ep-offer-widget");
    if (box) window.scrollTo({ top: box.getBoundingClientRect().top + window.pageYOffset - 10, behavior: "smooth" });
  }, true);
})();
