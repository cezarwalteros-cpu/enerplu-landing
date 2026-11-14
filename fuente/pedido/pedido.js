/* /pedido: "Volver" regresa a la página nueva con los mismos parámetros del anuncio. */
(function () {
  var a = document.querySelector('[data-pd-back]'); if (!a) return;
  var q = new URLSearchParams(location.search); q.delete('plan');
  var s = q.toString(); a.href = '/nueva' + (s ? '?' + s : '');
})();
