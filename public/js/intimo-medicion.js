/* Medición de Bienestar Íntimo (tienda /bienestarintimo y checkout /pedido-intimo):
   píxel de Meta de ENERPLU, Clarity y embudo del CRM (funnel-track). Con ?ep_test=1 no mide nada.
   Uso: epTrack(eventoMeta, datos) · epSend(eventoEmbudo, extra) · epClarity(evento) · epTag(clave, valor) */
(function () {
  var noop = function () {};
  window.epTrack = window.epSend = window.epClarity = window.epTag = noop;
  if (/[?&]ep_test=1(&|$)/.test(location.search)) return;
  var me = document.currentScript, pagina = (me && me.getAttribute('data-pagina')) || 'intimo';

  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '1248121626590977'); fbq('track', 'PageView');
  (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "aj18t0em8h");

  window.epTrack = function (ev, data) { try { fbq('track', ev, data || {}); } catch (e) {} };
  window.epClarity = function (ev) { try { window.clarity('event', ev); } catch (e) {} };
  window.epTag = function (k, v) { try { if (v != null && v !== '') window.clarity('set', k, String(v).slice(0, 200)); } catch (e) {} };

  // Embudo del CRM. Tienda propia ("enerplu-intimo") para no mezclar estas visitas con el embudo de ENERPLU.
  var U = 'https://mqwscbpdozrdiqxofmod.supabase.co/functions/v1/funnel-track', q = new URLSearchParams(location.search), sent = {}, sid;
  var UNA_VEZ = { page_view: 1, selector_view: 1, scroll_50: 1, scroll_90: 1, form_start: 1 };
  try { sid = sessionStorage.getItem('ep_sid'); if (!sid) { sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); sessionStorage.setItem('ep_sid', sid); } }
  catch (e) { sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  window.epSend = function (ev, extra) {
    if (UNA_VEZ[ev]) { if (sent[ev]) return; sent[ev] = 1; }
    var body = JSON.stringify({ sid: sid, ev: ev, page: location.host + location.pathname, store: 'enerplu-intimo',
      utm_source: q.get('utm_source'), utm_campaign: q.get('utm_campaign'), utm_content: q.get('utm_content'), utm_term: q.get('utm_term'), extra: extra || null });
    try { if (navigator.sendBeacon && navigator.sendBeacon(U, new Blob([body], { type: 'text/plain' }))) return; } catch (e) {}
    try { fetch(U, { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }); } catch (e) {}
  };

  epSend('page_view');
  epTag('pagina', pagina); epTag('anuncio', q.get('utm_term')); epTag('campana', q.get('utm_campaign')); epTag('conjunto', q.get('utm_content')); epTag('fuente', q.get('utm_source')); epTag('sid', sid);

  // Profundidad de lectura
  var raf = 0;
  addEventListener('scroll', function () {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () { var h = document.documentElement, m = h.scrollHeight - innerHeight, r = m > 0 ? scrollY / m : 1; if (r >= .5) epSend('scroll_50'); if (r >= .9) epSend('scroll_90'); });
  }, { passive: true });

  // "En línea ahora" del CRM: latido cada 30 s con la página a la vista y aviso al salir (no se guardan en el embudo).
  setInterval(function () { if (document.visibilityState === 'visible') epSend('ping'); }, 30000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') epSend('salida'); });
})();
