/* =====================================================================
   ENERPLU PDP — runtime
   - Pinta packs, galería y reseñas desde EP_CONFIG (también se usa en build)
   - Estado único del pack seleccionado, sincronizado en hero, oferta,
     sticky y Product List nativo de Funnelish
   - Rutas de compra: funnelish | redirect | demo (nunca simula pedidos)
   - Eventos custom deduplicados (fbq + dataLayer)
   ===================================================================== */
(function (global) {
  'use strict';

  /* ---------------- render (puro, sin DOM) ---------------- */
  var R = {};
  R.ico = function (n) { return '<svg class="ep-ico" aria-hidden="true"><use href="#ep-i-' + n + '"/></svg>'; };
  R.money = function (n) { return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  R.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  R.short = function (p) { return p.name.replace(/^Plan\s+/i, ''); };
  R.derive = function (cfg, p) {
    var compare = p.boxes * cfg.singleBoxPrice;
    return { compare: compare, save: compare - p.price, per: Math.round(p.price / p.tablets) };
  };
  R.extraGifts = function (p) { return p.gifts.filter(function (g) { return !/lubricante/i.test(g); }); };
  R.sig = function (cfg) {
    var s = JSON.stringify([cfg.packs, cfg.displayOrder, cfg.gallery, cfg.reviews, cfg.chats, cfg.discreetQuotes, cfg.reviewsInitial, cfg.singleBoxPrice, cfg.defaultPack, cfg.media, !!cfg.showMediaSlots]);
    var h = 0; for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
    return String(h >>> 0);
  };
  R.badge = function (p) {
    if (!p.badge) return '';
    return '<span class="ep-badge' + (p.badgeAlt ? ' ep-badge--alt' : '') + '">' + R.esc(p.badge) + '</span>';
  };
  /* planes en el orden de pantalla (displayOrder); funnelishIndex y el checkout no cambian */
  R.ordered = function (cfg) {
    var ord = cfg.displayOrder || [], out = [];
    ord.forEach(function (id) { cfg.packs.forEach(function (p) { if (p.id === id) out.push(p); }); });
    cfg.packs.forEach(function (p) { if (out.indexOf(p) < 0) out.push(p); });
    return out;
  };
  R.basePer = function (cfg) {
    var min = null; cfg.packs.forEach(function (p) { if (min === null || p.tablets < min.tablets) min = p; });
    return min ? Math.round(min.price / min.tablets) : 0;
  };
  R.perNote = function (cfg, p) {
    var base = R.basePer(cfg), per = Math.round(p.price / p.tablets);
    if (!base || per >= base) return '';
    if (per * 2 <= base) return 'Menos de la mitad por tableta que el Básico';
    return Math.round((1 - per / base) * 100) + ' % menos por tableta que el Básico';
  };

  R.packsCompact = function (cfg) {
    return R.ordered(cfg).map(function (p, i) {
      var d = R.derive(cfg, p), on = p.id === cfg.defaultPack, extra = R.extraGifts(p);
      return '<label class="ep-pack' + (on ? ' is-on' : '') + (p.lite ? ' ep-pack--lite' : '') + '" data-pack="' + p.id + '">' + R.badge(p) +
        '<input type="radio" name="ep-pack-hero" value="' + p.id + '"' + (on ? ' checked' : '') + '>' +
        '<span class="ep-pack-dot" aria-hidden="true"></span>' +
        '<span class="ep-pack-info"><span class="ep-pack-name">' + R.esc(R.short(p)) + '</span>' +
        '<span class="ep-pack-units">' + p.boxes + (p.boxes > 1 ? ' cajas' : ' caja') + ' · ' + p.tablets + ' tabletas</span>' +
        (extra.length ? '<span class="ep-pack-gift">' + R.ico('gift') + R.esc(extra.join(' + ')) + ' de regalo</span>' : '') +
        ((p.missing || []).length ? '<span class="ep-pack-miss">' + R.esc(p.missing.join(' · ')) + '</span>' : '') +
        '</span><span class="ep-pack-price"><b>' + R.money(p.price) + '</b>' +
        (d.save > 0 ? '<s>' + R.money(d.compare) + '</s>' : '') +
        '<small>' + R.money(d.per) + ' c/u</small></span></label>';
    }).join('');
  };

  /* ---- material visual ---- */
  R.m = function (cfg, key) { var m = (cfg.media || {})[key]; return m && m.src ? m : null; };
  R.slot = function (cfg, key, cls) {   /* espacio vacío: solo en la vista previa */
    var m = (cfg.media || {})[key];
    if (!cfg.showMediaSlots || !m) return '';
    return '<span class="ep-slot ' + (cls || '') + '"><svg class="ep-ico" aria-hidden="true"><use href="#ep-i-camera"/></svg><b>Falta foto</b><small>' + R.esc(m.shot) + '</small></span>';
  };
  R.img = function (cfg, key, alt, cls, w) {
    var m = R.m(cfg, key);
    if (m) return '<img class="' + (cls || '') + '" src="' + R.esc(R.cdn(cfg, m.src, w || 800)) + '" alt="' + R.esc(alt || '') + '" loading="lazy" decoding="async">';
    return R.slot(cfg, key, cls);
  };
  /* Cloudinary: formato y calidad automáticos + ancho justo para cada uso */
  R.cdn = function (cfg, url, w) {
    if (!cfg.cdnOptimize || !url || url.indexOf('res.cloudinary.com/') < 0 || url.indexOf('/upload/') < 0) return url;
    return url.replace('/upload/', '/upload/' + (w ? 'w_' + w + '/' : '') + 'f_auto/q_auto/');   /* transformaciones encadenadas con / (sin comas: Vite/Bolt rompe las comas dentro de srcset) */
  };
  R.isImg = function (url) { return /\.(webp|jpe?g|png|avif|gif)(\?|$)/i.test(url || ''); };
  R.hasAny = function (cfg, keys) { return keys.some(function (k) { return R.m(cfg, k) || cfg.showMediaSlots; }); };

  R.video = function (cfg) {
    var m = R.m(cfg, 'video');
    if (m && R.isImg(m.src)) return '<img class="ep-video-img" src="' + R.esc(R.cdn(cfg, m.src, 720)) + '" alt="Así llega ENERPLU: bolsa negra sellada y la caja" loading="lazy" decoding="async">';
    if (m) return '<video class="ep-video-el" muted playsinline loop preload="none" data-ep-autoplay' + (m.poster ? ' poster="' + R.esc(m.poster) + '"' : '') +
      ' aria-label="Video: así llega y así es ENERPLU"><source src="' + R.esc(m.src) + '" type="video/mp4"></video>';
    return R.slot(cfg, 'video', 'ep-slot--tall');
  };

  R.steps = function (cfg) {
    var steps = [
      ['step1', 'Mastica una tableta', 'De 5 a 15 minutos antes del encuentro. No necesitas agua.'],
      ['step2', 'Déjala bajo la lengua', 'Espera a que se disuelva por completo antes de tragar.'],
      ['step3', 'Sigue con tu noche', 'Una tableta por ocasión. No la tomes todos los días.']
    ];
    var photo = R.hasAny(cfg, ['step1', 'step2', 'step3']);
    return '<ol class="ep-steps' + (photo ? ' ep-steps--photo' : '') + '">' + steps.map(function (st, i) {
      return '<li class="ep-step">' + (photo ? '<span class="ep-step-media">' + R.img(cfg, st[0], st[1]) + '</span>' : '') +
        '<span class="ep-step-n" aria-hidden="true">' + (i + 1) + '</span><div><h3>' + st[1] + '</h3><p>' + st[2] + '</p></div></li>';
    }).join('') + '</ol>';
  };

  R.formula = function (cfg) {
    var ingr = [
      ['maca', 'sprout', 'Maca negra', 'Raíz de los Andes peruanos, usada por generaciones para la energía y la vitalidad masculina.'],
      ['ginseng', 'leaf', 'Ginseng', 'Planta adaptógena asociada con energía, resistencia y menos fatiga.'],
      ['arginina', 'drop', 'L‑arginina', 'Aminoácido que el cuerpo usa para producir óxido nítrico, relacionado con la circulación.'],
      ['magnesio', 'atom', 'Glicinato de magnesio', 'Forma de magnesio bien tolerada que apoya la función muscular y nerviosa.'],
      ['inositol', 'flask', 'Inositol', 'Compuesto que participa en la señalización de las células y el equilibrio del organismo.']
    ];
    var center = R.img(cfg, 'formula', 'Tableta de ENERPLU', 'ep-formula-img', 840);
    return (center ? '<div class="ep-formula-hero">' + center + '</div>' : '') +
      '<ul class="ep-ingr">' + ingr.map(function (g) {
        var pic = R.m(cfg, g[0]) ? R.img(cfg, g[0], g[2], '', 160) : (cfg.showMediaSlots ? R.slot(cfg, g[0], 'ep-slot--mini') : '<svg class="ep-ico" aria-hidden="true"><use href="#ep-i-' + g[1] + '"/></svg>');
        return '<li><span class="ep-ingr-ico' + (R.m(cfg, g[0]) || cfg.showMediaSlots ? ' has-photo' : '') + '">' + pic + '</span><div><h3>' + g[2] + '</h3><p>' + g[3] + '</p></div></li>';
      }).join('') + '</ul>';
  };

  R.compareMedia = function (cfg) {
    if (!R.hasAny(cfg, ['compareUs', 'compareThem'])) return '';
    return '<div class="ep-cmp-media">' +
      '<figure class="is-us">' + R.img(cfg, 'compareUs', 'ENERPLU, tabletas masticables') + '<figcaption>' + R.ico('check') + 'ENERPLU</figcaption></figure>' +
      '<figure class="is-them">' + R.img(cfg, 'compareThem', 'Cápsulas comunes') + '<figcaption>' + R.ico('x') + 'Cápsula común</figcaption></figure></div>';
  };

  R.pkg = function (cfg) {
    return R.m(cfg, 'package') ? R.img(cfg, 'package', 'Bolsa negra sellada como llega el pedido', 'ep-pkg-img')
      : (cfg.showMediaSlots ? R.slot(cfg, 'package') : '<div class="ep-bag" aria-hidden="true"></div>');
  };

  /* tarjetas de la oferta: cada una compra su propio plan (sin selección intermedia) */
  R.cards = function (cfg) {
    return R.ordered(cfg).map(function (p) {
      var d = R.derive(cfg, p), featured = p.id === cfg.defaultPack, note = R.perNote(cfg, p);
      var li = function (ic, t, cls) { return '<li class="ep-card-li' + (cls ? ' ' + cls : '') + '">' + R.ico(ic) + '<span>' + t + '</span></li>'; };
      var items = li('tablet', p.tablets + ' tabletas ENERPLU (' + p.boxes + (p.boxes > 1 ? ' cajas' : ' caja') + ')');
      p.gifts.forEach(function (g) { items += li('gift', R.esc(g) + ' de regalo'); });
      (p.missing || []).forEach(function (m) { items += li('x', R.esc(m), 'is-missing'); });
      if (p.shipping) items += li('truck', R.esc(p.shipping));
      items += li('cash', 'Pago contra entrega');
      var media = (!p.lite && p.flatlay && (R.m(cfg, p.flatlay) || cfg.showMediaSlots)) ? '<div class="ep-card-media">' + R.img(cfg, p.flatlay, 'Lo que recibes en el ' + p.name) + '</div>' : '';
      var btnLabel = p.lite ? 'Pedir solo 1 caja' : 'Pedir ' + R.esc(R.short(p));
      return '<article class="ep-card' + (featured ? ' is-featured' : '') + (p.lite ? ' ep-card--lite' : '') + '" id="ep-card-' + p.id + '" data-pack="' + p.id + '" aria-label="' + R.esc(p.name) + '">' + R.badge(p) +
        media +
        '<div class="ep-card-top"><h3 class="ep-card-name">' + R.esc(R.short(p)) + '</h3><span class="ep-card-units">' + p.boxes + (p.boxes > 1 ? ' cajas · ' : ' caja · ') + p.tablets + ' tabletas</span></div>' +
        '<div class="ep-card-pricebox"><div class="ep-card-price"><b>' + R.money(p.price) + '</b>' + (d.save > 0 ? '<s>' + R.money(d.compare) + '</s>' : '') + '</div>' +
        (d.save > 0 ? '<span class="ep-card-save">Ahorras ' + R.money(d.save) + '</span>' : '') +
        '<span class="ep-card-per">' + R.money(d.per) + ' por tableta' + (note ? ' · <b>' + note + '</b>' : '') + '</span></div>' +
        '<ul class="ep-card-list">' + items + '</ul>' +
        '<button type="button" class="ep-cta ep-card-cta' + (p.lite ? ' ep-cta--ghost' : '') + '" data-ep-cta="offer" data-ep-plan="' + p.id + '">' +
          '<span class="ep-cta-label"><b>' + btnLabel + '</b><small>Pagas al recibir</small></span><span class="ep-cta-sep" aria-hidden="true"></span><span class="ep-cta-price">' + R.money(p.price) + '</span></button>' +
        '<p class="ep-error" data-ep-error hidden></p>' +
        '</article>';
    }).join('');
  };

  /* ---- versión con formulario en la página ---- */
  R.packOf = function (cfg, id) { for (var i = 0; i < cfg.packs.length; i++) if (cfg.packs[i].id === id) return cfg.packs[i]; return cfg.packs[0]; };
  R.selector = function (cfg, sel) {
    sel = sel || cfg.defaultPack;
    return R.ordered(cfg).map(function (p) {
      var d = R.derive(cfg, p), on = p.id === sel, extra = R.extraGifts(p);
      var thumb = p.flatlay && R.m(cfg, p.flatlay) ? '<span class="ep-sel-thumb"><img src="' + R.esc(R.cdn(cfg, R.m(cfg, p.flatlay).src, 200)) + '" alt="" loading="lazy" decoding="async"></span>' : '';
      var inc = [p.tablets + ' tabletas'].concat(p.gifts.map(function (g) { return g; }));
      if (p.shipping) inc.push(p.shipping);
      return '<label class="ep-sel-opt' + (on ? ' is-on' : '') + (p.lite ? ' ep-sel-opt--lite' : '') + '" data-pack="' + p.id + '">' + R.badge(p) +
        '<input type="radio" name="ep-pack-order" value="' + p.id + '"' + (on ? ' checked' : '') + '>' +
        '<span class="ep-pack-dot" aria-hidden="true"></span>' +
        '<span class="ep-sel-main"><span class="ep-sel-name">' + R.esc(R.short(p)) + '</span>' +
          '<span class="ep-sel-units">' + p.boxes + (p.boxes > 1 ? ' cajas' : ' caja') + ' · ' + p.tablets + ' tabletas</span>' +
          (extra.length ? '<span class="ep-sel-gift">' + R.ico('gift') + R.esc(extra.join(' + ')) + ' de regalo</span>' : '') +
          ((p.missing || []).length ? '<span class="ep-sel-miss">' + R.esc(p.missing.join(' · ')) + '</span>' : '') +
        '</span>' +
        '<span class="ep-sel-price"><b>' + R.money(p.price) + '</b>' + (d.save > 0 ? '<s>' + R.money(d.compare) + '</s>' : '') + '<small>' + R.money(d.per) + ' c/u</small></span>' +
        '<span class="ep-sel-more">' + thumb + '<span class="ep-sel-inc"><b>Incluye:</b> ' + R.esc(inc.join(' · ')) + '</span>' +
          (d.save > 0 ? '<span class="ep-sel-save">Ahorras ' + R.money(d.save) + '</span>' : '') + '</span>' +
        '</label>';
    }).join('');
  };
  /* empujón dinámico: muestra cuánto más cuesta subir al siguiente plan y qué gana */
  R.nudge = function (cfg, id) {
    var p = R.packOf(cfg, id), byT = cfg.packs.slice().sort(function (a, b) { return a.tablets - b.tablets; });
    var next = null; byT.forEach(function (x) { if (!next && x.tablets > p.tablets) next = x; });
    if (!next) {
      var d = R.derive(cfg, p);
      return '<p class="ep-nudge-in is-best">' + R.ico('check') + '<span><b>Elegiste el mejor precio:</b> ' + R.money(d.per) + ' por tableta' + (d.save > 0 ? '. Ahorras ' + R.money(d.save) + ' frente a ' + p.boxes + ' cajas sueltas.' : '.') + '</span></p>';
    }
    var diff = next.price - p.price, gain = R.extraGifts(next).filter(function (g) { return R.extraGifts(p).indexOf(g) < 0; });
    var more = next.tablets === p.tablets * 2 ? 'el doble (' + next.tablets + ' tabletas)' : next.tablets + ' tabletas en vez de ' + p.tablets;
    var txt = p.lite
      ? '<b>Por solo ' + R.money(diff) + ' más</b> te llevas ' + more + (gain.length ? ' y el <b>' + R.esc(gain.join(' + ').replace(/^S/, 's')) + ' de regalo</b>' : '') + '.'
      : '¿Para varios meses? <b>' + R.esc(R.short(next)) + ': ' + next.tablets + ' tabletas por ' + R.money(diff) + ' más</b>, a ' + R.money(R.derive(cfg, next).per) + ' c/u.';
    return '<p class="ep-nudge-in' + (p.lite ? ' is-strong' : '') + '">' + R.ico(p.lite ? 'gift' : 'zap') + '<span>' + txt + '</span>' +
      '<button type="button" class="ep-nudge-btn" data-ep-upgrade="' + next.id + '">' + (p.lite ? 'Cambiar a ' : 'Pasar a ') + R.esc(R.short(next)) + '</button></p>';
  };
  /* gracias: fecha según el envío elegido (aprobado por cesar 2026-11-08). Express = despacho el mismo día si se confirma antes de las 2:00 p. m. */
  R.thanksEta = function (cfg, city, express, after) {
    if (express) return '<div class="ep-thanks-eta is-express">' + R.ico('zap') + '<span><b>Envío EXPRESS asegurado</b> a ' + R.esc(city) + ': llega <b>' + R.delivery(cfg, null, true) + '</b>.' +
      '<small>Sale con prioridad el mismo día que confirmas (antes de las 2:00 p. m.)' + (after ? ', ' + after : '') + '. En bolsa negra sellada.</small></span></div>';
    return '<p class="ep-sum-eta">' + R.ico('truck') + '<span>Envío estándar a ' + R.esc(city) + ': llega <b>' + R.delivery(cfg) + '</b> (3 a 4 días hábiles' + (after ? ', ' + after : '') + ') en bolsa negra sellada.</span></p>';
  };
  R.shipping = function (cfg, opt) {
    var ex = cfg.checkout.express, days = cfg.checkout.deliveryDays || [3, 4];
    var row = function (val, name, price, text) {
      return '<label class="ep-ship-opt' + (opt === val ? ' is-on' : '') + '"><input type="radio" name="ep-ship" value="' + val + '"' + (opt === val ? ' checked' : '') + '>' +
        '<span class="ep-pack-dot" aria-hidden="true"></span><span class="ep-ship-main"><b>' + R.esc(name) + '</b><small>' + R.esc(text) + '</small></span><span class="ep-ship-price">' + price + '</span></label>';
    };
    return row('standard', 'Estándar', 'Gratis', 'Llega en ' + days[0] + ' a ' + days[1] + ' días hábiles') +
      (ex ? row('priority', ex.title || 'Express', '+' + R.money(ex.price), ex.text || '') : '');
  };
  /* forma de pago: contra entrega (por defecto), Bold y transferencia/llave Bancolombia */
  R.logos = function (list) {
    return '<span class="ep-pay-logos">' + list.map(function (k) { return '<span class="ep-pay-logo is-' + k[0] + '">' + k[1] + '</span>'; }).join('') + '</span>';
  };
  R.pay = function (cfg, opt, prepaidCity) {
    var co = cfg.checkout, disc = prepaidCity ? 0 : (co.payDiscount || 0);
    var save = disc ? '<span class="ep-ship-price ep-pay-save">Ahorras<br>' + R.money(disc) + '</span>' : '<span></span>';
    var row = function (val, name, text, extra, right, off) {
      return '<label class="ep-ship-opt ep-pay-opt' + (opt === val ? ' is-on' : '') + (off ? ' is-off' : '') + '"><input type="radio" name="ep-pay" value="' + val + '"' + (opt === val ? ' checked' : '') + (off ? ' disabled' : '') + '>' +
        '<span class="ep-pack-dot" aria-hidden="true"></span><span class="ep-ship-main"><b>' + name + '</b><small>' + text + '</small>' + (extra || '') + '</span>' + right + '</label>';
    };
    return row('cod', 'Pagar al recibir (Contraentrega)', prepaidCity ? 'No disponible en tu municipio.' : 'Pagas en efectivo cuando llega tu pedido.', '', '<span></span>', prepaidCity) +
      (co.payBold ? row('bold', 'Pagar ahora con tarjeta, PSE o Nequi', 'Pago seguro con Bold. Tu pedido pasa directo a despacho.',
        R.logos([['visa', 'VISA'], ['mc', 'Mastercard'], ['pse', 'PSE'], ['nequi', 'Nequi']]), save) : '') +
      (co.payTransfer ? row('transfer', 'Transferencia o llave Bancolombia', 'Te damos los datos al terminar y nos envías el comprobante por WhatsApp.',
        R.logos([['bc', 'Bancolombia']]), save) : '');
  };
  R.bump = function (cfg, on) {
    var b = cfg.checkout.bump;
    if (!b) return '';
    return '<label class="ep-bump' + (on ? ' is-on' : '') + '"><input type="checkbox" name="ep-bump"' + (on ? ' checked' : '') + '>' +
      (b.image ? '<span class="ep-bump-img' + (b.contain ? ' is-contain' : '') + '"><img src="' + R.esc(R.cdn(cfg, b.image, 200)) + '" alt="" loading="lazy" decoding="async"></span>' : '') +
      '<span class="ep-bump-main">' + (b.tag ? '<span class="ep-bump-tag">' + R.esc(b.tag) + '</span>' : '') + '<span class="ep-bump-head"><span class="ep-bump-box" aria-hidden="true">' + R.ico('check') + '</span><b>Sí, agregar ' + R.esc(b.title) + '</b></span>' +
      '<span class="ep-bump-price"><b>+' + R.money(b.price) + '</b>' + (b.compare > b.price ? '<s>' + R.money(b.compare) + '</s>' : '') + '</span>' +
      '<small>' + R.esc(b.text || '') + '</small></span></label>';
  };
  R.dayList = function (cfg, now, express) {   /* fecha estimada: días hábiles (lun–vie, sin festivos) en hora de Colombia; express = 2 a 3 */
    var hol = cfg.checkout.holidays || [], days = express ? (cfg.checkout.expressDays || [2, 3]) : (cfg.checkout.deliveryDays || [3, 4]);
    var t = new Date((now || Date.now()) - 5 * 3600e3), d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())), out = [], n = 0;
    while (out.length < 2) {
      d = new Date(d.getTime() + 864e5);
      var wd = d.getUTCDay(), iso = d.toISOString().slice(0, 10);
      if (wd === 0 || wd === 6 || hol.indexOf(iso) >= 0) continue;
      n++;
      if (n === days[0] || n === days[1]) out.push(new Date(d.getTime()));
    }
    return out;
  };
  R.delivery = function (cfg, now, express) {
    var W = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'], M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    var ds = R.dayList(cfg, now, express), a = ds[0], b = ds[1];
    var f = function (x, withMonth) { return W[x.getUTCDay()] + ' ' + x.getUTCDate() + (withMonth ? ' de ' + M[x.getUTCMonth()] : ''); };
    return 'entre el ' + f(a, a.getUTCMonth() !== b.getUTCMonth()) + ' y el ' + f(b, true);
  };
  R.totals = function (cfg, st) {
    var p = R.packOf(cfg, st.pack), d = R.derive(cfg, p), b = st.bump && cfg.checkout.bump ? cfg.checkout.bump : null;
    var ship = st.ship === 'priority' && cfg.checkout.express ? cfg.checkout.express.price : 0;
    var save = Math.max(0, d.save) + (b && b.compare > b.price ? b.compare - b.price : 0);
    var sub = p.price + (b ? b.price : 0), cup = st.cup ? Math.min(sub, Math.round(sub * st.cup / 100)) : 0;
    var base = sub + ship, disc = Math.max(0, Math.min(st.disc || 0, p.price, sub - cup));
    return { p: p, d: d, b: b, ship: ship, disc: disc, cup: cup, save: save + disc + cup, total: base - disc - cup };
  };
  R.summary = function (cfg, st, now) {
    var t = R.totals(cfg, st), line = function (name, val, cls) { return '<li' + (cls ? ' class="' + cls + '"' : '') + '><span>' + name + '</span><span>' + val + '</span></li>'; };
    var h = line(R.esc(t.p.name) + ' <small>' + t.p.tablets + ' tabletas</small>', (t.d.save > 0 ? '<s>' + R.money(t.d.compare) + '</s> ' : '') + R.money(t.p.price));
    t.p.gifts.forEach(function (g) { h += line(R.esc(g), 'Regalo', 'is-gift'); });
    if (t.b) h += line(R.esc(t.b.title), R.money(t.b.price));
    h += line('Envío' + (t.ship ? ' express' : ''), t.ship ? R.money(t.ship) : 'Gratis', t.ship ? '' : 'is-gift');
    if (t.cup) h += line('Descuento primera compra ' + st.cup + '%' + (st.cupCode ? ' <small>' + R.esc(st.cupCode) + '</small>' : ''), '−' + R.money(t.cup), 'is-gift is-cup');
    if (t.disc) h += line('Descuento pago anticipado', '−' + R.money(t.disc), 'is-gift');
    var label = st.pay === 'transfer' ? 'Total a transferir' : st.pay ? 'Total a pagar en línea' : 'Total a pagar al recibir';
    var eta = st.pay === 'transfer' ? ' Sale a despacho apenas verifiquemos tu transferencia.' : st.pay ? ' Ya pagado, sale directo a despacho.' : ' Pagas en efectivo cuando lo recibes.';
    return '<p class="ep-sum-title">Resumen de tu pedido</p><ul class="ep-sum-list">' + h + '</ul>' +
      '<div class="ep-sum-total"><span>' + label + '</span><b>' + R.money(t.total) + '</b></div>' +
      (t.save > 0 ? '<p class="ep-sum-save">Ahorras ' + R.money(t.save) + ' en este pedido</p>' : '') +
      '<p class="ep-sum-eta">' + R.ico('truck') + '<span>Si pides hoy, llega <b>' + R.delivery(cfg, now, !!t.ship) + '</b>' + (t.ship ? ' con envío express' : '') + '.' + eta + '</span></p>';
  };

  R.fallback = function (cfg, slideIndex, label) {
    var boxes = 1;
    cfg.packs.forEach(function (p) { if (p.slide === slideIndex) boxes = p.boxes; });
    var b = ''; for (var i = 0; i < Math.min(boxes, 4); i++) b += '<span class="ep-box">ENERPLU</span>';
    return '<div class="ep-slide-fallback ep-lamina" aria-hidden="true"><div class="ep-packshot"><div class="ep-boxes">' + b + '</div><small>' + R.esc(label || '') + '</small></div></div>';
  };

  R.lamina = function (kind) {
    if (kind === 'sublingual') {
      return '<div class="ep-lamina"><div class="ep-tablet" aria-hidden="true"></div><h3>Se mastica y se deja bajo la lengua</h3>' +
        '<div class="ep-timeline" aria-label="Masticas, esperas de 5 a 15 minutos, listo"><span>Masticas</span><i></i><span>5–15 min</span><i></i><span>Listo</span></div></div>';
    }
    if (kind === 'discreto') {
      return '<div class="ep-lamina"><div class="ep-bag" aria-hidden="true"></div><h3>Llega en bolsa negra sellada</h3><p>La etiqueta solo lleva tus datos de entrega.</p></div>';
    }
    return '<div class="ep-lamina"><h3>Maca negra · Ginseng · L‑arginina · Magnesio · Inositol</h3></div>';
  };

  R.gallery = function (cfg) {
    var n = cfg.gallery.length, slides = '', thumbs = '';
    cfg.gallery.forEach(function (s, i) {
      var inner = s.type === 'img'
        ? '<img src="' + R.esc(R.cdn(cfg, s.src, 1080)) + '" sizes="(min-width: 960px) 560px, 100vw" srcset="' + R.esc(R.cdn(cfg, s.src, 600)) + ' 600w, ' + R.esc(R.cdn(cfg, s.src, 1080)) + ' 1080w" alt="' + R.esc(s.alt) + '" width="1080" height="1080" decoding="async"' + (i === 0 ? ' fetchpriority="high"' : ' loading="lazy"') + '>' + R.fallback(cfg, i, s.label)
        : R.lamina(s.card);
      slides += '<figure class="ep-slide" role="group" aria-roledescription="imagen" aria-label="' + (i + 1) + ' de ' + n + '">' + inner + '</figure>';
      var t = s.type === 'img'
        ? '<img src="' + R.esc(R.cdn(cfg, s.src, 160)) + '" alt="" loading="lazy" width="120" height="120"><span class="ep-thumb-fb">' + R.ico('package') + '</span>'
        : R.ico(s.card === 'discreto' ? 'lock' : 'tablet');
      thumbs += '<button type="button" class="ep-thumb" data-ep-thumb="' + i + '" aria-label="Ver imagen ' + (i + 1) + ': ' + R.esc(s.label) + '"' + (i === 0 ? ' aria-current="true"' : '') + '>' + t + '</button>';
    });
    return '<div class="ep-gal-track" data-ep-track tabindex="0" aria-label="Desliza para ver más imágenes">' + slides + '</div>' +
      '<div class="ep-gal-thumbs">' + thumbs + '</div>';
  };

  R.chatCard = function (r) {
    var initial = R.esc((r.name || '?').trim().charAt(0).toUpperCase());
    var head = '<span class="ep-chat-bar"><span class="ep-chat-av" aria-hidden="true">' + initial + '</span>' +
      '<span class="ep-chat-who"><b>' + R.esc(r.name) + '</b>' + (r.city ? '<small>' + R.esc(r.city) + '</small>' : '') + '</span>' +
      '<svg class="ep-ico ep-chat-wa" aria-hidden="true"><use href="#ep-i-chat"/></svg></span>';
    var body;
    if (r.image) {
      body = '<span class="ep-chat-shot"><img src="' + R.esc(r.image) + '" alt="' + R.esc(r.alt || ('Mensaje de ' + r.name)) + '" loading="lazy" decoding="async"></span>';
    } else {
      body = '<span class="ep-chat-body">' + (r.messages || []).map(function (m) {
        return '<span class="ep-bubble">' + R.esc(m) + '<span class="ep-bubble-meta">' + R.esc(r.time || '') +
          '<svg class="ep-ico" aria-hidden="true"><use href="#ep-i-check"/></svg><svg class="ep-ico" aria-hidden="true"><use href="#ep-i-check"/></svg></span></span>';
      }).join('') + '</span>';
    }
    return '<article class="ep-chat" aria-label="Mensaje de ' + R.esc(r.name) + (r.city ? ', ' + R.esc(r.city) : '') + '">' + head + body + '</article>';
  };
  R.chats = function (cfg) {
    var list = cfg.chats || [];
    var cards = list.map(R.chatCard).join('');
    var dur = Math.max(20, list.length * (cfg.chatsSpeed || 7));
    return '<div class="ep-chat-viewport" data-ep-marquee tabindex="0" aria-label="Mensajes de clientes, desliza para ver más">' +
      '<div class="ep-chat-track" style="--ep-dur:' + dur + 's"><div class="ep-chat-group">' + cards + '</div></div></div>';
  };

  /* ---- reseñas ---- */
  R.stats = function (cfg) {
    var list = cfg.reviews || [], n = list.length, sum = 0, dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    list.forEach(function (r) { var k = Math.max(1, Math.min(5, Math.round(r.rating || 5))); sum += k; dist[k]++; });
    var avg = n ? sum / n : 0;
    return { n: n, avg: avg, avgTxt: avg.toFixed(1).replace('.', ','), dist: dist };
  };
  R.stars = function (value, cls) {
    var pct = Math.max(0, Math.min(100, value / 5 * 100)), s = '';
    for (var i = 0; i < 5; i++) s += R.ico('star');
    return '<span class="ep-stars ' + (cls || '') + '" role="img" aria-label="' + String(value).replace('.', ',') + ' de 5 estrellas">' +
      '<span class="ep-stars-bg" aria-hidden="true">' + s + '</span><span class="ep-stars-fg" aria-hidden="true" style="width:' + pct.toFixed(1) + '%">' + s + '</span></span>';
  };
  R.rating = function (cfg) {
    var st = R.stats(cfg);
    if (!st.n) return '';
    return R.stars(st.avg) + '<b>' + st.avgTxt + '</b><span>' + st.n + ' reseñas</span>';
  };
  R.reviewCard = function (r, i, hidden) {
    var initial = R.esc((r.name || '?').trim().charAt(0).toUpperCase());
    var meta = [r.age ? r.age + ' años' : '', r.city || ''].filter(Boolean).map(R.esc).join(' · ');
    return '<article class="ep-rv-card"' + (hidden ? ' hidden data-ep-rv-hidden' : '') + '>' +
      '<div class="ep-rv-top">' + R.stars(r.rating || 5) + (r.uso ? '<span class="ep-rv-uso">' + R.ico('timer') + R.esc(r.uso) + '</span>' : '') + '</div>' +
      '<p class="ep-rv-text">' + R.esc(r.text) + '</p>' +
      (r.photo ? '<button type="button" class="ep-rv-thumb" data-ep-rv-open="' + i + '" aria-label="Ver foto de ' + R.esc(r.name) + '"><img src="' + R.esc(r.photo) + '" alt="" loading="lazy" decoding="async" width="88" height="88"></button>' : '') +
      '<div class="ep-rv-who"><span class="ep-rv-av" aria-hidden="true">' + initial + '</span><span><b>' + R.esc(r.name) + '</b>' + (meta ? '<small>' + meta + '</small>' : '') + '</span></div>' +
      '</article>';
  };
  R.reviews = function (cfg) {
    var list = cfg.reviews || [], st = R.stats(cfg), first = cfg.reviewsInitial || 6;
    if (!st.n) return '';
    var bars = [5, 4, 3, 2, 1].map(function (k) {
      var pct = st.n ? Math.round(st.dist[k] / st.n * 100) : 0;
      return '<li><span>' + k + R.ico('star') + '</span><span class="ep-rv-bar"><i style="width:' + pct + '%"></i></span><span class="ep-rv-bar-n">' + st.dist[k] + '</span></li>';
    }).join('');
    var photos = '';
    list.forEach(function (r, i) {
      if (r.photo) photos += '<button type="button" class="ep-rv-photo" data-ep-rv-open="' + i + '" aria-label="Ver foto y reseña de ' + R.esc(r.name) + '"><img src="' + R.esc(r.photo) + '" alt="" loading="lazy" decoding="async" width="120" height="120"></button>';
    });
    var cards = list.slice(0, first).map(function (r, i) { return R.reviewCard(r, i, false); }).join('');   /* el resto se pinta al tocar "Ver más" */
    var shown = Math.min(first, st.n);
    return '<div class="ep-rv-summary">' +
        '<div class="ep-rv-score"><b>' + st.avgTxt + '</b>' + R.stars(st.avg, 'ep-stars--lg') + '<span>Basado en ' + st.n + ' reseñas</span></div>' +
        '<ul class="ep-rv-bars" aria-label="Reseñas por estrellas">' + bars + '</ul>' +
      '</div>' +
      (photos ? '<div class="ep-rv-photos-wrap"><p class="ep-rv-label">Fotos de clientes</p><div class="ep-rv-photos">' + photos + '</div></div>' : '') +
      '<div class="ep-rv-list">' + cards + '</div>' +
      (st.n > shown ? '<div class="ep-rv-more-wrap"><p class="ep-rv-count" aria-live="polite">Mostrando <span data-ep-rv-shown>' + shown + '</span> de ' + st.n + '</p>' +
        '<button type="button" class="ep-rv-more" data-ep-rv-more>Ver más reseñas</button></div>' : '');
  };
  R.quotes = function (cfg) {
    var names = cfg.discreetQuotes || [], list = cfg.reviews || [];
    return names.map(function (n) {
      var r = null; list.forEach(function (x) { if (!r && x.name === n) r = x; });
      if (!r) return '';
      return '<figure class="ep-quote">' + R.stars(r.rating || 5) + '<blockquote>' + R.esc(r.text) + '</blockquote><figcaption>' + R.esc(r.name) + (r.city ? ' · ' + R.esc(r.city) : '') + '</figcaption></figure>';
    }).join('');
  };

  global.EP_RENDER = R;
  if (typeof document === 'undefined') return;   // build en Node

  /* ---------------- runtime ---------------- */
  var C = global.EP_CONFIG;
  if (!C) { console.error('EP: falta EP_CONFIG'); return; }
  var qs = function (s, r) { return (r || document).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var state = { pack: C.defaultPack };
  var once = {};
  var galleries = [];

  function packById(id) { for (var i = 0; i < C.packs.length; i++) if (C.packs[i].id === id) return C.packs[i]; return C.packs[0]; }

  /* tracking: un eventID por disparo; eventos "once" se disparan una sola vez por carga */
  function track(name, data, onlyOnce) {
    if (onlyOnce) { if (once[name]) return; once[name] = true; }
    var full = (C.tracking.prefix || 'EP_') + name;
    var id = full + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    data = data || {};
    sendPixel(['trackCustom', full, data, { eventID: id }]);
    try { (global.dataLayer = global.dataLayer || []).push(Object.assign({ event: full, ep_event_id: id }, data)); } catch (e) {}
  }
  /* si el pixel todavía no cargó, los eventos esperan en cola (hasta 10 s) en vez de perderse */
  var pixelQueue = [], pixelTimer = 0, pixelWait = 0;
  function sendPixel(args) {
    if (typeof global.fbq === 'function') { try { global.fbq.apply(global, args); } catch (e) {} return; }
    pixelQueue.push(args);
    if (pixelTimer) return;
    pixelTimer = setInterval(function () {
      pixelWait += 250;
      if (typeof global.fbq === 'function') {
        clearInterval(pixelTimer); pixelTimer = 0;
        pixelQueue.splice(0).forEach(function (a) { try { global.fbq.apply(global, a); } catch (e) {} });
      } else if (pixelWait >= 10000) { clearInterval(pixelTimer); pixelTimer = 0; pixelQueue = []; }
    }, 250);
  }
  /* TikTok: eventos estándar del pixel (solo si la página cargó ttq; sin pixel de TikTok no hace nada).
     Mismo event_id que la Events API del servidor en la compra → TikTok la cuenta una vez. */
  function ttTrack(name, data, eventId) {
    if (!global.ttq || typeof global.ttq.track !== 'function') return;
    try { global.ttq.track(name, data || {}, eventId ? { event_id: eventId } : undefined); } catch (e) {}
  }
  function ttData(p, value) { return { contents: [{ content_id: 'enerplu-' + p.id, content_type: 'product', content_name: p.name, quantity: 1, price: p.price }], content_type: 'product', value: value || p.price, currency: 'COP' }; }
  function ttSha(v) {
    if (!v || !global.crypto || !global.crypto.subtle || !global.TextEncoder) return Promise.resolve(null);
    return global.crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    }, function () { return null; });
  }
  function payload(p) { return { plan: p.id, plan_name: p.name, value: p.price, currency: 'COP', num_items: p.boxes, content_ids: ['enerplu-' + p.id] }; }

  /* render en runtime solo si la config cambió desde el build (evita parpadeo/CLS) */
  function renderInto(sel, html, sig) {
    qsa(sel).forEach(function (el) { if (el.getAttribute('data-ep-sig') !== sig) { el.innerHTML = html; el.setAttribute('data-ep-sig', sig); } });
  }
  function renderAll() {
    qsa('.ep-root').forEach(function (r) { r.setAttribute('data-ep-theme', C.theme || 'claro'); });
    var sig = R.sig(C);
    renderInto('[data-ep-render="compact"]', R.packsCompact(C), sig);
    renderInto('[data-ep-render="cards"]', R.cards(C), sig);
    renderInto('[data-ep-render="selector"]', R.selector(C), sig);
    renderInto('[data-ep-render="steps"]', R.steps(C), sig);
    renderInto('[data-ep-render="formula"]', R.formula(C), sig);
    renderInto('[data-ep-render="compare-media"]', R.compareMedia(C), sig);
    renderInto('[data-ep-render="package"]', R.pkg(C), sig);
    renderInto('[data-ep-render="video"]', R.video(C), sig);
    qsa('[data-ep-video-section]').forEach(function (s) { s.hidden = !(R.m(C, 'video') || C.showMediaSlots); });
    renderInto('[data-ep-gallery]', R.gallery(C), sig);
    var hasReviews = (C.reviews || []).length > 0, hasChats = (C.chats || []).length > 0;
    qsa('[data-ep-reviews]').forEach(function (s) { s.hidden = !hasReviews; });
    qsa('[data-ep-rating]').forEach(function (s) { s.hidden = !hasReviews; });
    qsa('[data-ep-chats]').forEach(function (s) { s.hidden = !hasChats; });
    if (hasReviews) {
      renderInto('[data-ep-reviews-list]', R.reviews(C), sig);
      renderInto('[data-ep-rating]', R.rating(C), sig);
      renderInto('[data-ep-render="quotes"]', R.quotes(C), sig);
    }
    if (hasChats) renderInto('[data-ep-chats-list]', R.chats(C), sig);
    qsa('[data-ep-invima]').forEach(function (el) { el.textContent = C.invima; });
    var fp = packById(C.defaultPack), fx = R.extraGifts(fp);
    qsa('[data-ep-bind="featured-name"]').forEach(function (el) { el.textContent = R.short(fp) + (fp.badge ? ' · ' + fp.badge : ''); });
    qsa('[data-ep-bind="featured-price"]').forEach(function (el) { el.textContent = R.money(fp.price) + (fx.length ? ' · ' + fx[0].replace(/ \d+ ml$/, '') + ' de regalo' : ''); });
    qsa('[data-ep-bind="delivery"]').forEach(function (el) { el.textContent = C.deliveryText; });
    qsa('[data-ep-bind="prepaid"]').forEach(function (el) { el.textContent = C.prepaidOnlyZones; });
    qsa('[data-ep-links]').forEach(function (nav) {
      var h = '';
      if (C.links.privacy) h += '<a href="' + R.esc(C.links.privacy) + '">Política de privacidad</a>';
      if (C.links.terms) h += '<a href="' + R.esc(C.links.terms) + '">Términos y condiciones</a>';
      nav.innerHTML = h; nav.hidden = !h;
    });
  }

  /* ---------------- estado del pack ---------------- */
  function swapPlanSlide(p) {
    var idx = -1; (C.gallery || []).forEach(function (g, i) { if (g.planSlide && idx < 0) idx = i; });
    if (idx < 0) return;
    var m = p.galleryMedia ? R.m(C, p.galleryMedia) : null, src = m ? m.src : C.gallery[idx].src;
    qsa('[data-ep-gallery]').forEach(function (gal) {
      var fig = qsa('.ep-slide', gal)[idx], th = qsa('[data-ep-thumb]', gal)[idx];
      var img = fig && qs('img', fig);
      if (img && img.getAttribute('data-src-base') !== src) {
        img.setAttribute('data-src-base', src);
        img.removeAttribute('srcset');
        img.src = R.cdn(C, src, 1080);
        img.alt = 'Lo que recibes en el ' + p.name;
        fig.classList.remove('is-fail');
      }
      var ti = th && qs('img', th);
      if (ti) { ti.src = R.cdn(C, src, 160); th.classList.remove('is-fail'); }
    });
  }
  function setPack(id, source) {
    var p = packById(id);
    var changed = state.pack !== p.id;
    state.pack = p.id;
    qsa('input[name="ep-pack-hero"], input[name="ep-pack-offer"], input[name="ep-pack-order"]').forEach(function (inp) { inp.checked = inp.value === p.id; });
    qsa('.ep-pack[data-pack], .ep-sel-opt[data-pack]').forEach(function (el) { el.classList.toggle('is-on', el.getAttribute('data-pack') === p.id); });
    qsa('[data-ep-bind="price"]').forEach(function (el) { el.textContent = R.money(p.price); });
    qsa('[data-ep-bind="name"]').forEach(function (el) { el.textContent = p.name; });
    qsa('[data-ep-bind="checkout-url"]').forEach(function (el) { el.textContent = withParams(p.redirectUrl || C.checkout.url || '', p); });
    swapPlanSlide(p);
    if (source === 'hero' && typeof p.slide === 'number') galleries.forEach(function (g) { g.goTo(p.slide); });
    if (source && changed) track('SelectPack', Object.assign(payload(p), { source: source }));
    if (C.checkout.mode === 'funnelish' && Native.ready) Native.select(p);
    if (C.checkout.mode === 'inline') Order.update(source);
    hideErrors();
  }

  function bindPacks() {
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t && (t.name === 'ep-pack-hero' || t.name === 'ep-pack-offer' || t.name === 'ep-pack-order')) setPack(t.value, t.name === 'ep-pack-hero' ? 'hero' : t.name === 'ep-pack-order' ? 'order' : 'offer');
    });
  }

  /* ---------------- Funnelish: Product List nativo ---------------- */
  var Native = {
    ready: false, items: [], radios: [], tries: 0,
    cfg: function () { return C.checkout.funnelish; },
    find: function () {
      var f = this.cfg();
      this.items = qsa(f.itemSelector);
      this.radios = qsa(f.radioSelector);
      return this.items.length || this.radios.length;
    },
    init: function () {
      var self = this, f = this.cfg();
      (function poll() {
        self.tries++;
        var count = self.find();
        if (count >= C.packs.length) {
          self.ready = true;
          console.info('EP: Product List nativo encontrado (' + self.items.length + ' items / ' + self.radios.length + ' radios)');
          self.items.forEach(function (it, i) { console.info('EP: nativo ' + i + ' → pid=' + it.getAttribute('data-pid') + ' "' + (it.textContent || '').trim().slice(0, 60) + '"'); });
          if (count !== C.packs.length) console.warn('EP: hay ' + count + ' productos nativos y ' + C.packs.length + ' packs. Revisa funnelishIndex en EP_CONFIG.');
          if (f.hideNativeList && count === C.packs.length) self.hide();
          self.select(packById(state.pack));
          return;
        }
        if (self.tries < f.maxRetries) return setTimeout(poll, 400);
        console.warn('EP: no se encontró el Product List nativo. Se deja visible para que el cliente elija ahí.');
      })();
    },
    hide: function () {
      var f = this.cfg(), first = this.items[0] || this.radios[0];
      var list = first && (first.closest(f.listSelector) || first.parentElement);
      if (list) list.classList.add('ep-native-hidden');
    },
    reveal: function () { qsa('.ep-native-hidden').forEach(function (el) { el.classList.remove('ep-native-hidden'); }); },
    select: function (p) {
      var f = this.cfg(), idx = p.funnelishIndex;
      if (!this.items.length && !this.radios.length) this.find();
      var item = this.items[idx];
      if (item) {
        var radio = qs('input[type="radio"]', item);
        if (radio && radio.checked) return true;
        var target = qs(f.clickSelector, item) || item;   // Alpine escucha el click en el label/.pl-inner, no en el input
        var sx = global.scrollX, sy = global.scrollY;      // el label enfoca el radio oculto: evitamos saltos de scroll
        target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: global }));
        if (radio && document.activeElement === radio) radio.blur();
        if (global.scrollY !== sy || global.scrollX !== sx) global.scrollTo(sx, sy);
        if (radio && !radio.checked) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); radio.dispatchEvent(new Event('input', { bubbles: true })); }
        this.items.forEach(function (it) { it.classList.remove('selected'); });
        item.classList.add('selected');
        return true;
      }
      var r = this.radios[idx];
      if (r) {
        r.checked = true;
        ['click', 'change', 'input'].forEach(function (ev) { r.dispatchEvent(new Event(ev, { bubbles: true })); });
        return true;
      }
      return false;
    }
  };

  /* ---------------- ruta de compra ---------------- */
  function hideErrors() { qsa('[data-ep-error]').forEach(function (e) { e.hidden = true; }); }
  function showError(btn, msg) {
    var box = btn && btn.parentElement ? qs('[data-ep-error]', btn.parentElement) : null;
    if (box) { box.textContent = msg; box.hidden = false; }
  }
  function scrollToCheckout() {
    var a = qs(C.checkout.anchor);
    if (!a) return false;
    a.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    return true;
  }
  function withParams(url, p) {
    try {
      var u = new URL(url, global.location.href), cur = new URLSearchParams(global.location.search);
      cur.forEach(function (v, k) { if (!u.searchParams.has(k)) u.searchParams.set(k, v); });
      u.searchParams.set(C.checkout.planParam || 'plan', p.checkoutPlan || p.id);
      return u.toString();
    } catch (e) { return url; }
  }
  function goCheckout(btn, source) {
    var plan = btn && btn.getAttribute('data-ep-plan');
    if (plan) setPack(plan, source);   /* botón de tarjeta: compra exactamente ese plan */
    var p = packById(state.pack);
    track('ClickCTA', Object.assign(payload(p), { source: source }));
    var mode = C.checkout.mode;
    if (mode === 'inline') {   /* versión con formulario: baja al pedido con el plan ya marcado */
      Funnel.send('plan_click', { from: source, plan: p.checkoutPlan || p.id });
      Order.loadConfig();
      var box = qs('#ep-order');
      if (box) scrollToEl(box);
      return;
    }
    if (C.tracking.fireStandardEvents) sendPixel(['track', 'InitiateCheckout', payload(p)]);

    if (mode === 'redirect') {
      var base = p.redirectUrl || C.checkout.url;
      if (!base) { showError(btn, 'Este plan no tiene enlace de pago configurado.'); console.error('EP: falta checkout.url'); return; }
      var dest = withParams(base, p);
      qsa('[data-ep-cta]').forEach(function (b) { b.setAttribute('aria-busy', 'true'); });
      /* pequeña espera para que el pixel alcance a salir antes de cambiar de página */
      setTimeout(function () { global.location.assign(dest); }, 180);
      return;
    }
    if (mode === 'funnelish') {
      var ok = Native.select(p);
      if (!ok) {
        Native.reveal();
        showError(btn, 'Elige tu plan en el formulario de abajo para completar el pedido.');
        console.error('EP: no se pudo seleccionar el producto nativo idx=' + p.funnelishIndex);
      }
    }
    if (!scrollToCheckout()) { showError(btn, 'No encontramos el formulario de pedido en esta página.'); console.error('EP: no existe ' + C.checkout.anchor); }
  }
  /* ---------------- embudo propio (funnel-track): mismos eventos que mide el CRM ---------------- */
  var Funnel = {
    sid: '', page: '', on: false, sent: {},
    init: function () {
      this.on = !!C.checkout.funnelApi && !Order.test;
      this.sid = Order.sid; this.page = (global.location.host + global.location.pathname).slice(0, 300);
      if (C.checkout.funnelLite) return;   /* la página ya trae su propio script de embudo: aquí solo se envían los eventos del formulario */
      this.send('page_view');
      var self = this, raf = 0;
      var tick = function () {
        var h = document.documentElement, max = h.scrollHeight - global.innerHeight, r = max > 0 ? global.scrollY / max : 1;
        if (r >= .5) self.send('scroll_50', null, true);
        if (r >= .9) self.send('scroll_90', null, true);
      };
      global.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }, { passive: true });
      var sel = qs('[data-ep-render="selector"]');
      if (sel && 'IntersectionObserver' in global) {
        var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { self.send('selector_view', null, true); io.disconnect(); } }); }, { threshold: .4 });
        io.observe(sel);
      }
    },
    send: function (ev, extra, onlyOnce) {
      if (!this.on) return;
      if (onlyOnce) { if (this.sent[ev]) return; this.sent[ev] = true; }
      var q = new URLSearchParams(global.location.search);
      var body = JSON.stringify({ sid: this.sid, ev: ev, page: this.page, store: C.checkout.slug, utm_source: q.get('utm_source'), utm_campaign: q.get('utm_campaign'), utm_content: q.get('utm_content'), utm_term: q.get('utm_term'), extra: extra || null });
      try {
        if (navigator.sendBeacon && navigator.sendBeacon(C.checkout.funnelApi, new Blob([body], { type: 'text/plain' }))) return;
      } catch (e) {}
      try { fetch(C.checkout.funnelApi, { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(function () {}); } catch (e) {}
    }
  };

  /* ---------------- pedido en la página (checkout-native) ---------------- */
  var Order = {
    st: { bump: false, ship: 'standard', pay: 'cod', city: null, phoneMsg: '', phoneBlock: false, lastPhone: '' },
    form: null, done: false, sending: false, test: false, sid: '', cfgState: '', started: false, touched: {},
    init: function () {
      var f = qs('[data-ep-order]'); if (!f) return;
      this.form = f;
      this.test = /[?&]ep_test=1(&|$)/.test(global.location.search) || !!C.checkout.forceTest;
      /* VISTA PREVIA (no está en vivo): upsell del spray solo para un plan + texto nuevo del bump. Solo se activa en la página de prueba. */
      if (global.EP_PREVIEW_UPSELL) {
        this.test = true;
        C.checkout.upsell = global.EP_PREVIEW_UPSELL.upsell || null;
        if (C.checkout.bump && global.EP_PREVIEW_UPSELL.bump) Object.assign(C.checkout.bump, global.EP_PREVIEW_UPSELL.bump);
      }
      var tb = qs('[data-ep-test]'); if (tb) tb.hidden = !this.test;
      /* referidos: ?ref=CODIGO (se guarda 30 días por si vuelve sin el enlace) */
      this.ref = this.refCode();
      var rb = qs('[data-ep-ref]'); if (rb) rb.hidden = !this.ref;
      try { this.sid = sessionStorage.getItem('ep_sid') || ''; } catch (e) {}
      if (!this.sid) { this.sid = 'ep' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem('ep_sid', this.sid); } catch (e) {} }
      this.t0 = Date.now();
      this.paint(); this.bind();
      var bq = new URLSearchParams(global.location.search), bref = bq.get('bold-order-id');
      if (bref) this.payResume(bref, bq.get('bold-tx-status'));
      var self = this, sec = qs('#ep-order');
      if (sec && 'IntersectionObserver' in global) {   /* la configuración real se pide cuando el cliente se acerca al formulario */
        var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { self.loadConfig(); io.disconnect(); } }); }, { rootMargin: '900px 0px' });
        io.observe(sec);
      } else this.loadConfig();
    },
    el: function (name) { return this.form ? this.form.elements[name] : null; },
    paint: function () {
      renderInto('[data-ep-render="shipping"]', R.shipping(C, this.st.ship), 'x' + Math.random());
      var sb = qs('[data-ep-ship-block]'); if (sb) sb.hidden = !C.checkout.express;
      renderInto('[data-ep-render="bump"]', R.bump(C, this.st.bump), 'x' + Math.random());
      this.paintPay();
      this.update();
    },
    payChoice: function () { return !C.checkout.payPrepaid && !!(C.checkout.payBold || C.checkout.payTransfer); },
    paintPay: function () {
      var on = this.payChoice(), c = this.st.city, pre = !!(c && c.prepaid);
      var blk = qs('[data-ep-pay-block]'); if (blk) blk.hidden = !on;
      if (on) renderInto('[data-ep-render="pay"]', R.pay(C, this.method(), pre), 'x' + Math.random());
      var d = C.checkout.payDiscount || 0, hint = qs('[data-ep-pay-hint]');
      if (hint) { hint.hidden = !on || !d; hint.innerHTML = 'Paga al recibir, o paga ahora y ahorra <b>' + R.money(d) + '</b>'; }
      var lg = qs('[data-ep-pay-logos]'); if (lg) lg.hidden = !on;
    },
    update: function (source) {
      if (!this.form) return;
      var m = this.method(), cp = this.coupon(), st = { pack: state.pack, bump: this.st.bump, ship: this.st.ship, disc: this.discount(), pay: m === 'cod' ? '' : m, cup: cp ? cp.pct : 0, cupCode: cp ? cp.code : '' };
      var t = R.totals(C, st);
      var n = qs('[data-ep-nudge]'); if (n) n.innerHTML = R.nudge(C, state.pack);
      var sm = qs('[data-ep-summary]'); if (sm) sm.innerHTML = R.summary(C, st);
      qsa('[data-ep-bind="total"]').forEach(function (el) { el.textContent = R.money(t.total); });
      var x = R.extraGifts(t.p);
      qsa('[data-ep-bind="featured-name"]').forEach(function (el) { el.textContent = R.short(t.p) + (t.p.badge ? ' · ' + t.p.badge : ''); });
      qsa('[data-ep-bind="featured-price"]').forEach(function (el) { el.textContent = R.money(t.p.price) + (x.length ? ' · ' + x[0].replace(/ \d+ ml$/, '') + ' de regalo' : ''); });
      if (source && source !== 'hero') Funnel.send('plan_select', { plan: t.p.checkoutPlan || t.p.id, from: source });
      if (source) this.queueCart();
    },
    /* ---- configuración real del checkout (precios, bump, express, textos) ---- */
    loadConfig: function () {
      var self = this;
      if (this.cfgState) return; this.cfgState = 'loading';
      this.api('GET', '?slug=' + encodeURIComponent(C.checkout.slug) + '&pp=1').then(function (r) {
        var c = r.j && r.j.config; if (!c) { self.cfgState = ''; return; }
        self.cfgState = 'ok';
        var changed = false;
        (c.offers || []).forEach(function (o) {
          C.packs.forEach(function (p) { if (p.offerKey === o.key && o.price && p.price !== o.price) { p.price = o.price; changed = true; } });
        });
        if (c.order_bump) {
          var b = C.checkout.bump || {};
          b.price = c.order_bump.price; b.compare = c.order_bump.compare_at_price || 0; if (c.order_bump.image_url && !(global.EP_PREVIEW_UPSELL && (global.EP_PREVIEW_UPSELL.bump || {}).image)) b.image = c.order_bump.image_url;
          C.checkout.bump = b;
        } else C.checkout.bump = null;
        /* upsell: solo se ofrece si el CRM lo tiene configurado, y al precio del CRM (lo que de verdad se cobra) */
        if (C.checkout.upsell) {
          if (c.upsell && c.upsell.price) { C.checkout.upsell.price = c.upsell.price; if (c.upsell.compare_at_price) C.checkout.upsell.compare = c.upsell.compare_at_price; }
          else C.checkout.upsell = null;
        }
        if (c.priority_shipping) C.checkout.express = { price: c.priority_shipping.price, title: c.priority_shipping.title || 'Express', text: c.priority_shipping.description || '' };
        else { C.checkout.express = null; self.st.ship = 'standard'; }
        if (c.thank_you_title) C.checkout.thanksTitle = c.thank_you_title;
        if (c.thank_you_text) C.checkout.thanksText = c.thank_you_text;
        C.checkout.online = !!c.online_payment;
        /* Bold solo para ciudades sin contra entrega (Chocó, Amazonas…): se paga aquí mismo */
        C.checkout.payPrepaid = !!(c.online_payment && c.online_payment.live && c.online_payment.prepaid_only);
        /* pago anticipado con descuento para todo el país: Bold + transferencia (online_payment.prepaid_only = false) */
        C.checkout.payBold = !!(c.online_payment && c.online_payment.live && !c.online_payment.prepaid_only);
        C.checkout.payTransfer = !C.checkout.payPrepaid && !!c.transfer;
        C.checkout.payDiscount = C.checkout.payBold ? (c.online_payment.discount || 0) : (c.transfer ? c.transfer.discount || 0 : 0);
        self.payMode();
        if (changed) {
          var sig = 'live' + Date.now();
          renderInto('[data-ep-render="compact"]', R.packsCompact(C), sig);
          renderInto('[data-ep-render="selector"]', R.selector(C, state.pack), sig);
          setPack(state.pack, null);
          console.info('EP: precios actualizados desde el checkout');
        }
        self.paint();
      }, function () { self.cfgState = ''; });
    },
    api: function (method, qsPart, body, keep) {
      var ctrl = global.AbortController ? new AbortController() : null, timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : 0;
      var opt = { method: method, signal: ctrl ? ctrl.signal : undefined };
      if (body) { opt.body = JSON.stringify(body); opt.headers = { 'Content-Type': 'application/json' }; if (keep) opt.keepalive = true; }
      return fetch(C.checkout.api + (qsPart || ''), opt).then(function (res) {
        clearTimeout(timer);
        return res.json().catch(function () { return {}; }).then(function (j) { return { status: res.status, ok: res.ok, j: j || {} }; });
      }, function (e) { clearTimeout(timer); throw e; });
    },
    refCode: function () {
      var ok = function (v) { return /^[A-Za-z0-9]{4,20}$/.test(String(v || '')) ? String(v).toUpperCase() : ''; };
      var r = ok(new URLSearchParams(global.location.search).get('ref'));
      try {
        if (r) localStorage.setItem('ep_ref', JSON.stringify({ c: r, t: Date.now() }));
        else {
          var s = JSON.parse(localStorage.getItem('ep_ref') || 'null');
          if (s && s.c && Date.now() - s.t < 30 * 864e5) r = ok(s.c);
        }
      } catch (e) {}
      return r;
    },
    tracking: function () {
      var q = new URLSearchParams(global.location.search), t = {};
      if (this.ref) t.ref = this.ref;
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'ttclid'].forEach(function (k) { var v = q.get(k); if (v) t[k] = v; });
      var ck = function (n) { var m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; };
      t.ttp = ck('_ttp');
      t.fbp = ck('_fbp'); t.fbc = ck('_fbc') || (t.fbclid ? 'fb.1.' + this.t0 + '.' + t.fbclid : null);
      t.landing_url = global.location.href.slice(0, 300); t.user_agent = (navigator.userAgent || '').slice(0, 300);
      return t;
    },
    phone: function () {
      var i = this.el('phone'); if (!i) return '';
      var v = String(i.value || '').replace(/\D/g, '');
      if (v.indexOf('0057') === 0) v = v.slice(4);
      else if (v.length > 10 && v.indexOf('57') === 0) v = v.slice(2);
      if (v.length === 11 && v.charAt(0) === '0') v = v.slice(1);   /* 0300… */
      return v.slice(0, 10);
    },
    validPhone: function (v) { return /^3\d{9}$/.test(v); },
    /* ---- carrito abandonado: el bot de recuperación le escribe si no termina ---- */
    queueCart: function () {
      var self = this; clearTimeout(this.cartTimer);
      if (this.test || this.done) return;
      this.cartTimer = setTimeout(function () {
        var ph = self.phone(); if (!self.validPhone(ph) || self.st.phoneBlock || self.done) return;
        var nm = ((self.el('first_name').value || '') + ' ' + (self.el('last_name').value || '')).trim();
        self.api('POST', '', { action: 'cart', slug: C.checkout.slug, phone: ph, name: nm, offer_key: packById(state.pack).offerKey, bump: !!self.st.bump, session_id: self.sid, tracking: self.tracking() }, true).catch(function () {});
      }, 1500);
    },
    checkPhone: function () {
      var self = this, ph = this.phone();
      if (!this.validPhone(ph) || ph === this.st.lastPhone) return;
      this.st.lastPhone = ph;
      this.api('POST', '', { action: 'phone_check', slug: C.checkout.slug, phone: ph }).then(function (r) {
        if (self.phone() !== ph) return;
        var j = r.j || {};
        self.st.phoneBlock = !!(j.blocked || j.cod_allowed === false);
        self.st.phoneMsg = self.st.phoneBlock ? (j.message || 'No podemos tomar pedidos contra entrega con este número.') : '';
        self.st.recent = j.recent_order ? { n: j.order_number || '', wa: j.whatsapp || '' } : null;
        self.err('phone', self.st.phoneMsg);
        if (self.st.phoneBlock) track('PhoneBlocked', { recent: !!j.recent_order }); else self.queueCart();
      }, function () {});
    },
    /* ---- ciudad con autocompletado ----
       - lo que va después de una coma o "/" se usa para filtrar por departamento ("Itagüí, Antioquia", "Yopal / Casanare")
       - "Colombia" y "D.C." no cuentan ("Bogotá, Colombia")
       - corregimientos, localidades y comunas conocidas llevan a su municipio ("San Antonio de Prado" → Medellín) */
    cityParts: function (raw) {
      var parts = String(raw || '').split(/[,\/|]/);
      var clean = function (x) { return R.norm(x).replace(/\b(colombia|col|d c|dc)\b/g, ' ').replace(/\s+/g, ' ').trim(); };
      return { q: clean(parts[0]), dep: clean(parts.slice(1).join(' ')) };
    },
    cityAliases: function (q) {
      if (q.length < 3) return [];
      var out = [];
      (C.checkout.cityAliases || []).forEach(function (a) {
        var n = R.norm(a[0].replace(/\(.*?\)/g, ' '));   /* lo que va entre paréntesis solo aclara, no se busca */
        if (n.indexOf(q) === 0 || (q.length >= 4 && n.indexOf(' ' + q) >= 0)) out.push({ municipio: a[1], departamento: a[2], alias: a[0], solo_pago_anticipado: false });
      });
      return out.slice(0, 4);
    },
    citySearchNow: function (raw) {
      var self = this, pr = this.cityParts(raw), seq = (this.citySeq = (this.citySeq || 0) + 1);
      clearTimeout(this.cityTimer);
      if (pr.q.length < 2) { this.cityList([], ''); return Promise.resolve([]); }
      var aliases = this.cityAliases(pr.q);
      return this.api('GET', '?q=' + encodeURIComponent(pr.q.slice(0, 40))).then(function (r) {
        var rows = (r.j && r.j.ciudades) || [];
        if (pr.dep) {   /* escribió el departamento: se queda con los que coinciden */
          var f = rows.filter(function (c) { var d = R.norm(c.departamento); return d.indexOf(pr.dep) === 0 || pr.dep.indexOf(d) === 0; });
          if (f.length) rows = f;
        }
        var all = aliases.concat(rows.filter(function (c) { return !aliases.some(function (a) { return a.municipio === c.municipio && a.departamento === c.departamento && !a.alias; }); }));
        if (!all.length && pr.q.length >= 4 && C.checkout.cityFuzzyApi) {   /* mal escrito: se sugieren los más parecidos */
          return fetch(C.checkout.cityFuzzyApi, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: C.checkout.publicKey }, body: JSON.stringify({ q: pr.q }) })
            .then(function (r) { return r.ok ? r.json() : []; }, function () { return []; })
            .then(function (list) {
              var fz = (Array.isArray(list) ? list : []).map(function (c) { return { municipio: c.municipio, departamento: c.departamento, solo_pago_anticipado: !!c.solo_pago_anticipado, fuzzy: true }; });
              if (seq === self.citySeq) self.cityList(fz, String(raw || '').trim());
              return fz;
            });
        }
        if (seq === self.citySeq) self.cityList(all, String(raw || '').trim());
        return all;
      }, function () {
        if (seq === self.citySeq) self.cityList(aliases, String(raw || '').trim());
        return aliases;
      });
    },
    citySearch: function () {
      var self = this, raw = this.el('city').value;
      clearTimeout(this.cityTimer);
      if (this.cityParts(raw).q.length < 2) { this.cityList([], ''); return; }
      this.cityTimer = setTimeout(function () { self.cityPending = self.citySearchNow(raw); }, 200);
    },
    cityList: function (rows, q) {
      var list = qs('#ep-f-city-list'), inp = this.el('city'); if (!list) return;
      this.cityRows = rows; this.cityIdx = -1;
      if (!rows.length) {
        list.innerHTML = q ? '<li class="ep-city-empty" role="presentation">No encontramos “' + R.esc(q) + '”. Escribe el municipio; si vives en un corregimiento o vereda, escribe el municipio al que pertenece.</li>' : '';
        list.hidden = !q; inp.setAttribute('aria-expanded', q ? 'true' : 'false'); return;
      }
      list.innerHTML = (rows[0].fuzzy ? '<li class="ep-city-empty" role="presentation">¿Quisiste decir…?</li>' : '') + rows.map(function (c, i) {
        return '<li role="option" id="ep-city-' + i + '" data-i="' + i + '">' +
          (c.alias ? '<span class="ep-city-alias">' + R.esc(c.alias) + '</span>' : '') +
          '<span class="ep-city-name"><b>' + R.esc(c.municipio) + '</b>' + (c.departamento !== c.municipio ? '<em> / ' + R.esc(c.departamento) + '</em>' : '') + '</span></li>';
      }).join('');
      list.hidden = false; inp.setAttribute('aria-expanded', 'true');
    },
    cityPick: function (i) {
      var c = (this.cityRows || [])[i]; if (!c) return;
      var inp = this.el('city'), list = qs('#ep-f-city-list');
      this.st.city = { municipio: c.municipio, departamento: c.departamento, prepaid: !!c.solo_pago_anticipado };
      inp.value = c.municipio + (c.departamento !== c.municipio ? ' / ' + c.departamento : ''); this.cityLabel = inp.value;
      list.hidden = true; inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant');
      var add = this.el('additional');
      if (c.alias && add && !String(add.value || '').trim()) add.value = c.alias;   /* el corregimiento o la localidad quedan en "barrio y detalles" */
      this.cityShow(); this.payMode();
      this.err('city', this.cityProblem());
    },
    cityShow: function () {   /* confirmación bajo el campo: Itagüí / Antioquia, con el departamento en rojo */
      var box = qs('[data-ep-city-ok]', this.form), c = this.st.city;
      if (!box) return;
      var pay = this.payOnline();
      box.innerHTML = c && (!c.prepaid || pay || this.method() !== 'cod') ? R.ico('pin') + '<span>Enviamos a <b>' + R.esc(c.municipio) + '</b>' + (c.departamento !== c.municipio ? '<em> / ' + R.esc(c.departamento) + '</em>' : '') +
        (c && c.prepaid && (pay || this.method() !== 'cod') ? '. Allí no hay pago contra entrega: ' + (this.payChoice() ? '<b>paga ahora</b> con Bold o transferencia.' : '<b>pagas en línea con Bold</b> (tarjeta, PSE o Nequi).') : '') + '</span>' : '';
      box.hidden = !(c && (!c.prepaid || pay || this.method() !== 'cod'));
    },
    /* escribió la ciudad y no tocó la lista: se elige sola si hay una coincidencia clara */
    cityAuto: function () {
      var rows = this.cityRows || [], pr = this.cityParts(this.el('city').value);
      if (!pr.q) return false;
      var base = function (x) { return R.norm(x).replace(/\b(d c|dc)\b/g, ' ').replace(/\s+/g, ' ').trim(); };
      var exact = rows.filter(function (c) { return c.alias ? base(c.alias.replace(/\(.*?\)/g, ' ')) === pr.q : base(c.municipio) === pr.q; });
      this.cityFuzzy = !!(rows[0] && rows[0].fuzzy);
      if (this.cityFuzzy) { this.cityAmbiguous = false; return false; }   /* una sugerencia por parecido nunca se elige sola: la confirma el cliente */
      var pick = exact.length === 1 ? exact[0] : (rows.length === 1 ? rows[0] : null);
      this.cityAmbiguous = !pick && rows.length > 1;   /* varios posibles (ej. "La Unión"): el cliente elige en la lista */
      if (pick) { this.cityPick(rows.indexOf(pick)); return true; }
      return false;
    },
    cityResolve: function () {
      var self = this, inp = this.el('city');
      if (this.st.city || !String(inp.value || '').trim()) return Promise.resolve();
      return this.citySearchNow(inp.value).then(function () { self.cityAuto(); var list = qs('#ep-f-city-list'); if (list) { list.hidden = !!self.st.city || !(self.cityRows || []).length; inp.setAttribute('aria-expanded', list.hidden ? 'false' : 'true'); } });
    },
    cityProblem: function () {
      var c = this.st.city; if (!c || !c.prepaid || this.method() !== 'cod') return '';
      return 'En ' + c.municipio + ' no tenemos pago contra entrega por ahora, así que no podemos enviarte este pedido.';
    },
    /* ---- pago en línea con Bold (solo ciudades sin contra entrega) ---- */
    payOnline: function () { return this.method() === 'bold'; },
    /* forma de pago real: en municipios sin contra entrega se pasa sola a Bold o transferencia */
    method: function () {
      var c = this.st.city, pre = !!(c && c.prepaid), co = C.checkout;
      if (co.payPrepaid) return pre ? 'bold' : 'cod';
      var m = this.st.pay || 'cod';
      if ((m === 'bold' && !co.payBold) || (m === 'transfer' && !co.payTransfer)) m = 'cod';
      if (pre && m === 'cod') m = co.payBold ? 'bold' : co.payTransfer ? 'transfer' : 'cod';
      return m;
    },
    /* el descuento no aplica en municipios de solo pago anticipado (igual que el servidor) */
    /* cupón del popup de 5% (fuente/popup5.js): lo valida y lo aplica el CRM; aquí solo se muestra y se manda el código */
    coupon: function () { var c = this.st.coupon; if (c && c.exp && c.exp < Date.now()) { this.st.coupon = c = null; } return c || null; },
    discount: function () { var c = this.st.city; return this.method() !== 'cod' && !(c && c.prepaid) ? (C.checkout.payDiscount || 0) : 0; },
    payMode: function () {
      if (!this.form) return;
      var on = this.payOnline(), row = qs('[data-ep-email-row]', this.form), em = this.el('email');
      if (row) row.hidden = !on;
      if (em) { if (on) em.setAttribute('required', ''); else { em.removeAttribute('required'); this.err('email', ''); } }
      var m = this.method(), sub = qs('[data-ep-cta-sub]', this.form); if (sub) sub.textContent = m === 'bold' ? 'Pago seguro en línea con Bold' : m === 'transfer' ? 'Pagas por transferencia' : 'Pagas en efectivo al recibir';
      var key = m + (this.st.city && this.st.city.prepaid ? '1' : '0');
      if (this.payWas !== key) { this.payWas = key; this.paintPay(); this.update(); }
      if (!this.sending) this.busy(false);
    },
    loadBold: function () {
      if (global.BoldCheckout) return Promise.resolve();
      if (this.boldP) return this.boldP;
      this.boldP = new Promise(function (ok, ko) {
        var js = document.createElement('script');
        js.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
        js.onload = function () { ok(); }; js.onerror = function () { ko(new Error('bold')); };
        document.head.appendChild(js);
      });
      var self = this; this.boldP.catch(function () { self.boldP = null; });
      return this.boldP;
    },
    payOpen: function (j) {
      var self = this;
      try { sessionStorage.setItem('ep_pay_ref', j.payment_ref); } catch (e) {}
      this.draftSave();
      track('PaymentStart', { ref: j.payment_ref, value: j.total_cop });
      return this.loadBold().then(function () {
        var checkout = new global.BoldCheckout(j.payment);
        checkout.open();
      }, function () {
        self.formError('No pudimos abrir el pago en línea. Revisa tu conexión y toca el botón otra vez.');
      });
    },
    /* datos del formulario guardados antes de abrir Bold: si el pago se rechaza, el cliente no vuelve a escribir todo */
    draftSave: function () {
      var self = this, d = { pack: state.pack, bump: this.st.bump, ship: this.st.ship, city: this.st.city, cityLabel: this.cityLabel || '', v: {} };
      this.fields.forEach(function (n) { var e = self.el(n); if (e && n !== 'city') d.v[n] = String(e.value || ''); });
      try { sessionStorage.setItem('ep_pay_draft', JSON.stringify(d)); } catch (e) {}
    },
    draftLoad: function () {
      var d = null; try { d = JSON.parse(sessionStorage.getItem('ep_pay_draft') || 'null'); } catch (e) {}
      if (!d || !d.v) return false;
      var self = this;
      Object.keys(d.v).forEach(function (n) { var e = self.el(n); if (e && !String(e.value || '').trim()) e.value = d.v[n]; });
      if (d.city && d.city.municipio) { this.st.city = d.city; this.cityLabel = d.cityLabel; var ci = this.el('city'); if (ci) ci.value = d.cityLabel; }
      if (d.pack) setPack(d.pack, null);
      this.st.bump = !!d.bump; if (d.ship) this.st.ship = d.ship;
      this.paint(); this.cityShow(); this.payMode();
      return true;
    },
    /* Bold rechazó el pago: un toque para pedir pagando al recibir, con los mismos datos */
    payFallback: function () {
      var self = this, box = qs('[data-ep-form-error]', this.form);
      if (!box || (this.st.city && this.st.city.prepaid) || !this.st.city) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ep-pay-fallback'; b.textContent = 'Pagar al recibir (Contraentrega)';
      b.addEventListener('click', function () {
        self.st.pay = 'cod';
        var r = qs('input[name="ep-pay"][value="cod"]', self.form); if (r) r.checked = true;
        self.payMode(); self.paintPay(); self.update();
        Funnel.send('pay_fallback_cod', { plan: state.pack });
        track('PayFallbackCOD', { plan: state.pack });
        self.submit();
      });
      box.appendChild(document.createElement('br'));
      box.appendChild(b);
    },
    /* regreso de Bold: ?bold-order-id=…&bold-tx-status=…; el estado real lo confirma el servidor */
    payResume: function (ref, txStatus) {
      var self = this, tries = 0, sec = qs('#ep-order');
      this.st.pay = 'bold'; this.draftLoad();
      if (sec) setTimeout(function () { scrollToEl(sec); }, 300);
      this.done = true; this.busy(true);
      var l = qs('[data-ep-submit] .ep-cta-label b', this.form); if (l) l.textContent = 'Confirmando tu pago…';
      var poll = function () {
        tries++;
        self.api('POST', '', { action: 'payment_status', payment_ref: ref }).then(function (r) {
          var j = r.j || {};
          if (j.status === 'approved' && j.order_number) {
            try { sessionStorage.removeItem('ep_pay_ref'); sessionStorage.removeItem('ep_pay_draft'); } catch (e) {}
            self.success({ order_id: j.order_id, order_number: j.order_number, event_id: j.event_id, total_cop: j.total_cop, shipping_cop: j.shipping_cop, items: j.items || [], paid: true },
              { address: { city: (j.address || {}).city || '' }, bump: false });
            return;
          }
          var final = /^(rejected|failed|voided)$/.test(j.status || '');
          if (!final && tries < 12) { setTimeout(poll, tries < 4 ? 2500 : 5000); return; }
          self.done = false; self.busy(false);
          var rejected = final || /rejected|failed/.test(txStatus || '');
          self.formError(rejected
            ? 'El pago no se aprobó. Puedes intentarlo otra vez con otro medio de pago, o hacer tu pedido y pagar en efectivo cuando lo recibas:'
            : 'Aún no vemos tu pago confirmado. Si ya pagaste, te escribimos por WhatsApp apenas Bold lo apruebe.');
          if (rejected) self.payFallback();
          track('PaymentResult', { ref: ref, status: j.status || txStatus || 'unknown' });
          Funnel.send('pay_result', { status: j.status || txStatus || 'unknown' });
        }, function () { if (tries < 12) setTimeout(poll, 4000); });
      };
      poll();
    },
    /* ---- validación ---- */
    err: function (name, msg) {
      var box = qs('[data-ep-err="' + name + '"]', this.form), inp = this.el(name);
      if (box) {
        box.textContent = msg || ''; box.hidden = !msg;
        if (msg && name === 'city' && this.st.city && this.st.city.prepaid && C.checkout.online && !C.checkout.payPrepaid) {
          var a = document.createElement('a'); a.href = withParams(C.checkout.url, packById(state.pack)); a.textContent = ' Ir al checkout'; box.appendChild(a);
        }
        if (msg && name === 'phone' && this.st.phoneBlock && C.checkout.online && /línea/.test(msg)) {
          var a2 = document.createElement('a'); a2.href = withParams(C.checkout.url, packById(state.pack)); a2.textContent = ' Pagar en línea'; box.appendChild(a2);
        }
        /* pedido repetido (24 h): botón de WhatsApp para aclarar o cambiar algo del pedido que ya existe */
        var rw = msg && name === 'phone' && this.st.phoneBlock && this.st.recent ? String(this.st.recent.wa || '').replace(/\D/g, '') : '';
        if (rw) {
          var w = document.createElement('a'); w.className = 'ep-tr-wa ep-dup-wa'; w.target = '_blank'; w.rel = 'noopener';
          w.href = 'https://wa.me/' + rw + '?text=' + encodeURIComponent('Hola, ya hice mi pedido' + (this.st.recent.n ? ' ' + this.st.recent.n : '') + ' y quiero aclarar algo.');
          w.innerHTML = R.ico('chat') + 'Escribir por WhatsApp'; box.appendChild(w);
          track('DupWhatsappShown', {});
        }
      }
      if (inp && inp.setAttribute) { if (msg) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid'); }
    },
    check: function (name) {
      var v = function (n) { var e = Order.el(n); return e ? String(e.value || '').trim() : ''; };
      if (name === 'first_name') return v('first_name').length < 2 ? 'Escribe tu nombre' : '';
      if (name === 'last_name') return v('last_name').length < 2 ? 'Escribe tu apellido' : '';
      if (name === 'phone') { var p = this.phone(); if (!this.validPhone(p)) return p.length && p.charAt(0) !== '3' ? 'Debe ser un celular (empieza por 3). Por ahí te confirmamos el pedido' : (p.length ? 'Te faltan ' + (10 - p.length) + ' números: el celular tiene 10 dígitos' : 'Escribe tu celular (10 dígitos, empieza por 3)'); return this.st.phoneMsg || ''; }
      if (name === 'city') { if (!this.st.city) return !v('city') ? 'Escribe tu ciudad o municipio' : this.cityAmbiguous ? 'Hay varios municipios con ese nombre: toca el tuyo en la lista' : this.cityFuzzy ? '¿Quisiste decir ' + (this.cityRows || []).slice(0, 2).map(function (c) { return c.municipio; }).join(' o ') + '? Tócalo en la lista' : 'No encontramos ese municipio. Escríbelo de nuevo y tócalo en la lista'; return this.cityProblem(); }
      /* dirección flexible: veredas, fincas, oficinas de transportadora o direcciones sin nomenclatura pasan;
         sin número, el pedido queda marcado en las notas para confirmar el punto por WhatsApp */
      if (name === 'address1') return v('address1').length < 5 ? 'Escribe la dirección o el punto de entrega' : '';
      if (name === 'additional') return '';   /* barrio opcional (2026-11-08): si viene vacío se confirma por WhatsApp */
      if (name === 'email') { if (!this.payOnline()) return ''; var em = v('email'); return !em ? 'Escribe tu correo: Bold te envía ahí el comprobante' : (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em) ? '' : 'Correo inválido'); }
      return '';
    },
    fields: ['first_name', 'last_name', 'phone', 'city', 'email', 'address1', 'additional'],
    validate: function () {
      var self = this, bad = [];
      this.fields.forEach(function (f) { var m = self.check(f); self.err(f, m); if (m) bad.push(f); });
      return bad;
    },
    formStart: function () {
      if (this.started) return; this.started = true;
      var p = packById(state.pack);
      track('FormStart', payload(p), true);
      if (C.tracking.fireStandardEvents) sendPixel(['track', 'InitiateCheckout', payload(p)]);
      ttTrack('InitiateCheckout', ttData(p));
      this.loadConfig();
    },
    bind: function () {
      var self = this, f = this.form, cityInp = this.el('city'), list = qs('#ep-f-city-list');
      f.addEventListener('focusin', function (e) { var t = e.target; if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) && t.type !== 'radio' && t.type !== 'checkbox') self.formStart(); });
      f.addEventListener('change', function (e) {
        var t = e.target;
        if (t.name === 'ep-ship') { self.st.ship = t.value; qsa('.ep-ship-opt', f).forEach(function (l) { l.classList.toggle('is-on', qs('input', l).checked); }); self.update(); }
        if (t.name === 'ep-pay') { self.st.pay = t.value; Funnel.send('pay_select', { method: t.value }); track('PaySelect', { method: t.value }); self.payMode(); self.cityShow(); self.err('city', self.touched.city ? self.check('city') : ''); }
        if (t.name === 'ep-bump') { self.st.bump = t.checked; t.closest('.ep-bump').classList.toggle('is-on', t.checked); track('BumpToggle', { on: t.checked }); self.update(); self.queueCart(); }
      });
      f.addEventListener('click', function (e) {
        var up = e.target.closest && e.target.closest('[data-ep-upgrade]');
        if (up) { e.preventDefault(); var id = up.getAttribute('data-ep-upgrade'); setPack(id, 'nudge'); track('Upgrade', payload(packById(id))); var o = qs('.ep-sel-opt[data-pack="' + id + '"]', f); if (o) { o.classList.remove('is-pulse'); void o.offsetWidth; o.classList.add('is-pulse'); } }
      });
      f.addEventListener('input', function (e) {
        var t = e.target;
        if (t.name === 'phone') {
          var ph = self.phone(); if (t.value !== ph) t.value = ph;
          if (ph !== self.st.lastPhone) { self.st.phoneBlock = false; self.st.phoneMsg = ''; self.st.recent = null; }
          if (self.validPhone(ph)) { self.err('phone', ''); self.checkPhone(); }
          else if (self.touched.phone) self.err('phone', ph.length >= 10 ? 'El celular debe empezar por 3' : '');
        } else if (t.name === 'city') {
          if (t.value !== self.cityLabel) { self.st.city = null; self.cityAmbiguous = false; self.cityFuzzy = false; self.err('city', ''); self.cityShow(); self.payMode(); }
          self.citySearch();
        } else if (self.touched[t.name] && self.fields.indexOf(t.name) >= 0) self.err(t.name, self.check(t.name));
      });
      f.addEventListener('focusout', function (e) {
        var t = e.target; if (!t.name || self.fields.indexOf(t.name) < 0) return;
        if (t.name === 'city') {
          setTimeout(function () {
            if (!list.hidden) { list.hidden = true; cityInp.setAttribute('aria-expanded', 'false'); }
            if (!self.st.city && cityInp.value.trim()) {
              self.cityResolve().then(function () { self.touched.city = true; self.err('city', self.check('city')); });
              return;
            }
            if (cityInp.value.trim()) { self.touched.city = true; self.err('city', self.check('city')); }
          }, 180);
          return;
        }
        if (String(t.value || '').trim()) self.touched[t.name] = true;
        if (self.touched[t.name]) self.err(t.name, self.check(t.name));
        if (t.name === 'first_name') {   /* escribió nombre y apellido en el mismo campo: se reparten solos */
          var last = self.el('last_name'), parts = String(t.value || '').trim().split(/\s+/);
          if (parts.length >= 2 && last && !String(last.value || '').trim()) {
            var cut = parts.length >= 4 ? 2 : 1;
            t.value = parts.slice(0, cut).join(' '); last.value = parts.slice(cut).join(' ');
            self.err('first_name', ''); self.err('last_name', '');
          }
        }
        if (t.name === 'first_name' || t.name === 'last_name' || t.name === 'phone') self.queueCart();
      });
      cityInp.addEventListener('focus', function () {
        if (global.innerWidth > 700) return;
        setTimeout(function () { var y = cityInp.getBoundingClientRect().top + global.pageYOffset - 84; global.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); }, 320);
      });
      list.addEventListener('mousedown', function (e) { var li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); self.cityPick(+li.getAttribute('data-i')); } });
      cityInp.addEventListener('keydown', function (e) {
        var rows = self.cityRows || []; if (list.hidden || !rows.length) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          self.cityIdx = (self.cityIdx + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
          qsa('li[data-i]', list).forEach(function (li, i) { li.setAttribute('aria-selected', i === self.cityIdx ? 'true' : 'false'); });
          cityInp.setAttribute('aria-activedescendant', 'ep-city-' + self.cityIdx);
        } else if (e.key === 'Enter') { e.preventDefault(); self.cityPick(self.cityIdx >= 0 ? self.cityIdx : 0); }
        else if (e.key === 'Escape') { list.hidden = true; cityInp.setAttribute('aria-expanded', 'false'); }
      });
      f.addEventListener('submit', function (e) { e.preventDefault(); self.submit(); });
    },
    formError: function (msg) { var b = qs('[data-ep-form-error]', this.form); if (b) { b.textContent = msg || ''; b.hidden = !msg; } },
    busy: function (on) {
      var b = qs('[data-ep-submit]', this.form); if (!b) return;
      if (on) b.setAttribute('aria-busy', 'true'); else b.removeAttribute('aria-busy');
      var pay = this.payOnline(), l = qs('.ep-cta-label b', b); if (l) l.textContent = on ? (pay ? 'Abriendo el pago…' : 'Enviando tu pedido…') : (pay ? 'Pagar mi pedido' : 'Confirmar mi pedido');
    },
    submit: function () {
      var self = this; if (this.sending || this.done) return;
      if (!this.st.city && String(this.el('city').value || '').trim() && !this.cityResolving) {
        this.cityResolving = true;
        return this.cityResolve().then(function () { self.cityResolving = false; self.submit(); }, function () { self.cityResolving = false; self.submit(); });
      }
      this.formError('');
      this.fields.forEach(function (f) { self.touched[f] = true; });
      var bad = this.validate(), p = packById(state.pack);
      Funnel.send('cta_click', { from: 'form', plan: p.checkoutPlan || p.id, ok: !bad.length });
      if (bad.length) {
        track('FormInvalid', { fields: bad.join(',') });
        var cityTxt = bad.indexOf('city') >= 0 ? String(this.el('city').value || '').slice(0, 40) : null;
        Funnel.send('form_error', { fields: bad, city: cityTxt, plan: p.checkoutPlan || p.id });
        var first = this.el(bad[0]); if (first) { first.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); } }, reduce ? 0 : 350); }
        return;
      }
      var up = C.checkout.upsell;
      if (up && p.id === up.only && !this.upsellAsked) { this.upsellAsked = true; this.upsellOpen(up); return; }
      var v = function (n) { return String(self.el(n).value || '').trim(); };
      var body = {
        action: 'order', slug: C.checkout.slug, session_id: this.sid, website: v('website'),
        customer: { first_name: v('first_name'), last_name: v('last_name'), phone: this.phone(), email: this.payOnline() ? v('email') : undefined },
        address: { department: this.st.city.departamento, city: this.st.city.municipio, address1: v('address1'), additional: v('additional') || 'Sin barrio: confirmar por WhatsApp', notes: /\d/.test(v('address1')) ? undefined : 'Dirección sin número: confirmar punto de entrega por WhatsApp' },
        offer_key: p.offerKey, bump: !!(this.st.bump && C.checkout.bump), upsell: !!(up && this.st.upsell && p.id === up.only),
        shipping_option: this.st.ship === 'priority' && C.checkout.express ? 'priority' : 'standard',
        payment_method: this.method(), tracking: this.tracking()
      };
      var cp = this.coupon(); if (cp && !cp.demo) body.coupon_code = cp.code;
      if (body.payment_method === 'bold') body.return_url = global.location.origin + global.location.pathname;
      if (this.test) body.dry_run = true;
      this.sending = true; this.busy(true);
      track('SubmitOrder', payload(p));
      ttTrack('AddPaymentInfo', Object.assign(ttData(p), { payment_method: body.payment_method }));
      this.api('POST', '', body).then(function (r) {
        var j = r.j || {};
        if (r.ok && j.success && j.payment_required) { self.payOpen(j); return; }
        if (r.ok && j.success) { self.success(j, body); return; }
        var map = j.fields || {}, shown = false;
        Object.keys(map).forEach(function (k) {
          var key = k === 'full_name' ? 'first_name' : k === 'payment_method' ? (j.cod_blocked ? 'phone' : 'city') : k;
          if (self.fields.indexOf(key) >= 0) { self.err(key, map[k]); shown = true; }
        });
        if (j.recent_order || j.blocked) { self.st.recent = j.recent_order ? { n: j.order_number || '', wa: j.whatsapp || '' } : null; self.st.phoneBlock = true; self.st.phoneMsg = j.error || map.phone || ''; self.err('phone', self.st.phoneMsg); shown = true; }
        self.formError(shown ? 'Revisa los datos marcados en rojo.' : (j.error || 'No pudimos registrar tu pedido. Intenta de nuevo.'));
        track('OrderError', { status: r.status, fields: Object.keys(map).join(',') });
        var firstBad = qs('[aria-invalid="true"]', self.form) || qs('[data-ep-form-error]', self.form);
        if (firstBad) firstBad.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      }, function () {
        self.formError('No pudimos enviar tu pedido. Revisa tu conexión y toca el botón otra vez.');
        track('OrderError', { status: 0 });
      }).then(function () { self.sending = false; if (!self.done) self.busy(false); });
    },
    /* upsell antes de confirmar: hoja con un sí / no; al responder se envía el pedido */
    upsellOpen: function (up) {
      var self = this, root = qs('.ep-root') || document.body, d = document.createElement('div');
      d.className = 'ep-ups'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', up.title);
      var HG = '<svg class="ep-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2h12M6 22h12M7 2v4.5a5 5 0 0 0 2 4L12 12l3-1.5a5 5 0 0 0 2-4V2M7 22v-4.5a5 5 0 0 1 2-4L12 12l3 1.5a5 5 0 0 1 2 4V22"/></svg>';
      d.innerHTML = '<div class="ep-ups-sheet' + (up.image ? ' has-img' : '') + '">' +
        '<p class="ep-ups-eyebrow">' + HG + ' ' + R.esc(up.eyebrow || 'Espera, antes de confirmar') + '</p>' +
        '<h3 class="ep-ups-title">' + R.esc(up.headline || up.title) + '</h3>' +
        '<p class="ep-ups-text">' + R.esc(up.text || '') + '</p>' +
        (up.image ? '<span class="ep-ups-img"><img src="' + R.esc(up.image) + '" alt="' + R.esc(up.title) + '" decoding="async"></span>' : '') +
        '<ul class="ep-ups-list">' + (up.bullets || []).map(function (b) { return '<li>' + R.ico('check') + '<span>' + R.esc(b) + '</span></li>'; }).join('') + '</ul>' +
        '<p class="ep-ups-price"><s>' + R.money(up.compare) + '</s><b>' + R.money(up.price) + '</b><span>Ahorras ' + R.money(up.compare - up.price) + '</span></p>' +
        '<button type="button" class="ep-ups-yes" data-ep-ups="yes"><b>Sí, agregarlo por ' + R.money(up.price) + '</b><small>' + (self.payOnline() ? 'Llega en el mismo paquete 100% discreto' : 'Llega en el mismo paquete · pagas al recibir') + '</small></button>' +
        '<button type="button" class="ep-ups-no" data-ep-ups="no">No, gracias. Confirmar sin el spray</button></div>';
      root.appendChild(d);
      Funnel.send('upsell_view', { item: up.key || 'retardante' });
      d.addEventListener('click', function (e) {
        var t = e.target.closest('[data-ep-ups]'); if (!t) return;
        self.st.upsell = t.getAttribute('data-ep-ups') === 'yes';
        Funnel.send(self.st.upsell ? 'upsell_accept' : 'upsell_decline', { item: up.key || 'retardante' });
        d.remove(); self.submit();
      });
      var y = qs('[data-ep-ups="yes"]', d); if (y) try { y.focus({ preventScroll: true }); } catch (e) {}
    },
    success: function (j, body) {
      this.done = true; clearTimeout(this.cartTimer);
      var p = packById(state.pack), items = j.items || [];
      var total = j.total_cop || R.totals(C, { pack: state.pack, bump: this.st.bump, ship: this.st.ship }).total;
      if (!this.test && !j.dry_run) {
        var ids = items.map(function (i) { return i.catalog_product_id; }).filter(Boolean);
        var data = { value: total, currency: 'COP', content_type: 'product', content_ids: ids.length ? ids : ['enerplu-' + p.id], contents: items.map(function (i) { return { id: i.catalog_product_id || ('enerplu-' + p.id), quantity: 1, item_price: i.price }; }), num_items: items.length || 1, order_id: j.order_number };
        sendPixel(['track', 'Purchase', data, { eventID: j.event_id || ('order_' + j.order_id) }]);   /* mismo event_id que CAPI → Meta lo cuenta una vez */
        try { (global.dataLayer = global.dataLayer || []).push(Object.assign({ event: 'ep_purchase', ep_event_id: j.event_id }, data)); } catch (e) {}
        if (global.ttq) {   /* TikTok: PlaceAnOrder + CompletePayment con el mismo event_id que la Events API del servidor */
          var ttEv = j.event_id || ('order_' + j.order_id), ph = this.phone();
          var ttD = { contents: items.length ? items.map(function (i) { return { content_id: i.catalog_product_id || ('enerplu-' + p.id), content_type: 'product', content_name: i.name, quantity: 1, price: i.price }; }) : ttData(p).contents,
                      content_type: 'product', value: total, currency: 'COP', order_id: j.order_number };
          var fire = function () { ttTrack('PlaceAnOrder', ttD, ttEv); ttTrack('CompletePayment', ttD, ttEv); ttTrack('Purchase', ttD, ttEv); };
          if (ph && typeof global.ttq.identify === 'function') {
            Promise.all([ttSha('+57' + ph), ttSha('57' + ph)]).then(function (h) {
              try { if (h[0]) global.ttq.identify({ phone_number: h[0], external_id: h[1] }); } catch (e) {}
              fire();
            });
          } else fire();
        }
      }
      track('OrderPlaced', Object.assign(payload(p), { value: total, order: j.order_number, test: !!j.dry_run }));
      var city = body.address.city, row = function (a, b) { return '<li><span>' + a + '</span><span>' + b + '</span></li>'; };
      var li = '';
      if (j.paid) items.forEach(function (i) { li += row(R.esc(i.name || ''), R.money(i.price)); });   /* regreso de Bold: lo que guardó el servidor */
      else {
        li = row(R.esc(p.name) + ' <small>' + p.tablets + ' tabletas</small>', R.money(p.price));
        p.gifts.forEach(function (g) { li += row(R.esc(g), 'Regalo'); });
        if (body.bump && C.checkout.bump) li += row(R.esc(C.checkout.bump.title), R.money(C.checkout.bump.price));
        if (body.upsell && C.checkout.upsell) li += row(R.esc(C.checkout.upsell.title), R.money(C.checkout.upsell.price));
      }
      li += row('Envío' + (j.shipping_cop ? ' express' : ''), j.shipping_cop ? R.money(j.shipping_cop) : 'Gratis');
      if (!j.paid && j.online_discount) li += row('Descuento pago anticipado', '−' + R.money(j.online_discount));
      /* ahorro real del pedido: precio de lista del plan y adicionales menos lo que paga, más cupón y descuento por pago en línea */
      var cpS = this.coupon(), mS = this.method();
      var ahorro = R.totals(C, { pack: state.pack, bump: this.st.bump, ship: this.st.ship, disc: this.discount(), pay: mS === 'cod' ? '' : mS, cup: cpS ? cpS.pct : 0 }).save;
      if (body.upsell && C.checkout.upsell && C.checkout.upsell.compare > C.checkout.upsell.price) ahorro += C.checkout.upsell.compare - C.checkout.upsell.price;
      var ahorroHtml = ahorro > 0 ? '<p class="ep-thanks-save">' + R.ico('check') + '<span>Te ahorraste <b>' + R.money(ahorro) + '</b> en este pedido</span></p>' : '';
      var box = qs('[data-ep-thanks]');
      if (j.transfer && body.payment_method === 'transfer') { this.thanksTransfer(box, j, li, total, city); return; }
      box.innerHTML = '<span class="ep-thanks-ico" aria-hidden="true">' + R.ico('check') + '</span>' +
        '<h3 class="ep-thanks-title">' + R.esc(C.checkout.thanksTitle) + '</h3>' +
        '<p class="ep-thanks-num">Pedido <b>' + R.esc(j.order_number || '') + '</b>' + (j.dry_run ? ' (prueba, no se creó)' : '') + '</p>' +
        '<p class="ep-thanks-text">' + R.esc(C.checkout.thanksText) + '</p>' +
        (li ? '<ul class="ep-sum-list">' + li + '</ul>' : '') +
        '<div class="ep-sum-total"><span>' + (j.paid ? 'Pagado en línea' : 'Pagas al recibir') + '</span><b>' + R.money(total) + '</b></div>' + ahorroHtml +
        R.thanksEta(C, city, !!j.shipping_cop, '');
      this.showThanks(box);
    },
    /* gracias para transferencia: valor, llave y cuenta con Copiar, y comprobante por WhatsApp */
    thanksTransfer: function (box, j, li, total, city) {
      var t = j.transfer, wa = String(t.whatsapp || '').replace(/\D/g, ''), list = j.subtotal_cop + (j.shipping_cop || 0);
      var msg = 'Hola, envío el comprobante de la transferencia del pedido ' + (j.order_number || '') + ' por ' + R.money(total) + '.';
      var copy = function (label, val) {
        return val ? '<div class="ep-tr-copy"><div><small>' + R.esc(label) + '</small><b>' + R.esc(val) + '</b></div><button type="button" class="ep-tr-btn" data-ep-copy="' + R.esc(val) + '">Copiar</button></div>' : '';
      };
      box.innerHTML = '<span class="ep-thanks-ico" aria-hidden="true">' + R.ico('check') + '</span>' +
        '<h3 class="ep-thanks-title">¡Recibimos tu pedido!</h3>' +
        '<p class="ep-thanks-num">Pedido <b>' + R.esc(j.order_number || '') + '</b>' + (j.dry_run ? ' (prueba, no se creó)' : '') + '</p>' +
        '<p class="ep-tr-pill">Pago pendiente de comprobante</p>' +
        '<div class="ep-tr-box"><p class="ep-tr-h">1. Transfiere este valor</p>' +
          '<div class="ep-tr-amt"><small>Total con descuento por pago anticipado</small><strong>' + R.money(total) + '</strong>' + (list > total ? '<s>' + R.money(list) + '</s>' : '') + '</div>' +
          copy(t.llave_label || 'Llave Bancolombia', t.llave) + copy(t.cuenta_label || 'Cuenta Bancolombia', t.cuenta) +
          (t.titular ? '<p class="ep-tr-tit">Titular: <b>' + R.esc(t.titular) + '</b> · ' + R.esc(t.banco || 'Bancolombia') + '</p>' : '') + '</div>' +
        '<div class="ep-tr-box"><p class="ep-tr-h">2. Envíanos el comprobante</p>' +
          '<p class="ep-tr-p">Toma captura del pago y envíala por WhatsApp. Apenas la verifiquemos, tu pedido sale a despacho en bolsa negra sellada.</p>' +
          (wa ? '<a class="ep-tr-wa" href="https://wa.me/' + wa + '?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">' + R.ico('chat') + 'Enviar comprobante por WhatsApp</a>' : '') +
          '<p class="ep-tr-note">¿No pudiste pagar? Escríbenos y lo dejamos para pagar al recibir (sin el descuento).</p></div>' +
        '<ul class="ep-sum-list">' + li + '</ul>' +
        R.thanksEta(C, city, !!j.shipping_cop, 'después de verificar el pago');
      box.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-ep-copy]'); if (!b) return;
        var v = b.getAttribute('data-ep-copy'), ok = function () { b.textContent = 'Copiado'; setTimeout(function () { b.textContent = 'Copiar'; }, 1800); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(ok, function () {}); else { var ta = document.createElement('textarea'); ta.value = v; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (x) {} ta.remove(); }
      });
      this.showThanks(box);
    },
    showThanks: function (box) {
      this.form.hidden = true; box.hidden = false;
      var sticky = qs('[data-ep-sticky]'); if (sticky) { sticky.classList.remove('is-visible'); sticky.setAttribute('aria-hidden', 'true'); }
      box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      try { box.focus({ preventScroll: true }); } catch (e) {}
    }
  };
  R.norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); };

  /* scroll que se corrige si las fotos de arriba terminan de cargar y mueven la página */
  function scrollToEl(el) {
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    [500, 1100, 1800].forEach(function (t) {
      setTimeout(function () { var top = el.getBoundingClientRect().top; if (Math.abs(top) > 24) el.scrollIntoView({ behavior: 'auto', block: 'start' }); }, t);
    });
  }
  function bindCTAs() {
    document.addEventListener('click', function (e) {
      var go = e.target.closest && e.target.closest('[data-ep-go]');
      if (go) {   /* CTA fijo: lleva a la sección de planes, no al checkout */
        e.preventDefault();
        var dest = qs(go.getAttribute('data-ep-go'));
        if (dest) scrollToEl(dest);
        track('StickyToOffer', payload(packById(state.pack)));
        if (C.checkout.mode === 'inline') { Funnel.send('plan_click', { from: 'sticky', plan: packById(state.pack).checkoutPlan }); Order.loadConfig(); }
        return;
      }
      var b = e.target.closest && e.target.closest('[data-ep-cta]');
      if (!b) return;
      e.preventDefault();
      goCheckout(b, b.getAttribute('data-ep-cta'));
    });
  }

  /* ---------------- galería ---------------- */
  function Gallery(root) {
    var track = qs('[data-ep-track]', root);
    if (!track) return null;
    var slides = Array.prototype.slice.call(track.children), n = slides.length, i = 0, raf = 0;
    var counter = qs('[data-ep-gal-i]', root), thumbs = qsa('[data-ep-thumb]', root);
    var prev = qs('.ep-gal-arrow[data-dir="-1"]', root), next = qs('.ep-gal-arrow[data-dir="1"]', root);
    function update(k) {
      i = k;
      if (counter) counter.textContent = String(k + 1);
      thumbs.forEach(function (t, j) { if (j === k) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
      if (prev) prev.disabled = k === 0;
      if (next) next.disabled = k === n - 1;
    }
    function goTo(k, instant) {
      k = Math.max(0, Math.min(n - 1, k));
      track.scrollTo({ left: k * track.clientWidth, behavior: instant || reduce ? 'auto' : 'smooth' });
      update(k);
    }
    track.addEventListener('scroll', function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        var k = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        if (k !== i) { update(k); if (k > 0) track_once_gallery(); }
      });
    }, { passive: true });
    root.addEventListener('click', function (e) {
      var a = e.target.closest('.ep-gal-arrow');
      if (a) { goTo(i + Number(a.getAttribute('data-dir'))); return; }
      var t = e.target.closest('[data-ep-thumb]');
      if (t) goTo(Number(t.getAttribute('data-ep-thumb')));
    });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(i + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(i - 1); }
    });
    global.addEventListener('resize', function () { goTo(i, true); });
    qsa('img', root).forEach(function (img) {
      var fail = function () { (img.closest('.ep-slide') || img.closest('.ep-thumb') || img).classList.add('is-fail'); };
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fail();
      img.addEventListener('error', fail);
    });
    return { goTo: goTo };
  }
  /* carrusel de mensajes: copia el grupo (aria-hidden) para un loop sin cortes */
  function Marquee(vp) {
    var rail = qs('.ep-chat-track', vp), group = qs('.ep-chat-group', vp);
    if (!rail || !group || qsa('.ep-chat-group', vp).length > 1) return;
    if (reduce) { vp.classList.add('is-static'); return; }
    var clone = group.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    qsa('img', clone).forEach(function (i) { i.alt = ''; });
    rail.appendChild(clone);
    vp.classList.add('is-running');
    var toggle = function () { vp.classList.toggle('is-paused'); };
    vp.addEventListener('touchstart', toggle, { passive: true });
    vp.addEventListener('focusin', function () { vp.classList.add('is-paused'); });
    vp.addEventListener('focusout', function () { vp.classList.remove('is-paused'); });
    var seen = false;
    if ('IntersectionObserver' in global) new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && !seen) { seen = true; track('ViewChats', {}, true); } });
    }, { threshold: .4 }).observe(vp);
  }
  function Reviews() {
    var root = qs('[data-ep-reviews]');
    if (!root || root.hidden) return;
    var step = C.reviewsStep || 8, dlg = qs('[data-ep-rv-dialog]'), body = qs('[data-ep-rv-dialog-body]');
    root.addEventListener('click', function (e) {
      var more = e.target.closest('[data-ep-rv-more]');
      if (more) {
        var listEl = qs('.ep-rv-list', root), all = C.reviews || [];
        var from = qsa('.ep-rv-card', listEl).length, to = Math.min(all.length, from + step), html = '';
        for (var k = from; k < to; k++) html += R.reviewCard(all[k], k, false);
        listEl.insertAdjacentHTML('beforeend', html);
        qsa('img', listEl).forEach(function (img) { if (!img.__ep) { img.__ep = 1; img.addEventListener('error', function () { var b = img.closest('button'); if (b) b.hidden = true; }); } });
        var shown = to;
        var lbl = qs('[data-ep-rv-shown]', root); if (lbl) lbl.textContent = String(shown);
        if (shown >= all.length) more.parentElement.hidden = true;
        track('ReviewsMore', { shown: shown }, true);
        return;
      }
      var open = e.target.closest('[data-ep-rv-open]');
      if (open && dlg && body) {
        var r = (C.reviews || [])[Number(open.getAttribute('data-ep-rv-open'))];
        if (!r) return;
        body.innerHTML = '<img src="' + R.esc(r.photo) + '" alt="Foto de ' + R.esc(r.name) + '">' +
          '<div class="ep-rv-dlg-text">' + R.stars(r.rating || 5) + '<p>' + R.esc(r.text) + '</p><small>' + R.esc(r.name) + (r.city ? ' · ' + R.esc(r.city) : '') + '</small></div>';
        if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
        track('ReviewPhoto', { name: r.name }, true);
      }
    });
    if (dlg) {
      dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-ep-rv-close]')) dlg.close ? dlg.close() : dlg.removeAttribute('open'); });
    }
    qsa('[data-ep-rating]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault(); track('ClickRating', {}, true);
        root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      });
    });
    if ('IntersectionObserver' in global) new IntersectionObserver(function (es, ob) {
      es.forEach(function (e) { if (e.isIntersecting) { track('ViewReviews', {}, true); ob.disconnect(); } });
    }, { threshold: .25 }).observe(root);
    qsa('img', root).forEach(function (img) {
      var fail = function () {
        var b = img.closest('button'); if (b) b.hidden = true;
        var wrap = img.closest('.ep-rv-photos-wrap');
        if (wrap && !qsa('.ep-rv-photo:not([hidden])', wrap).length) wrap.hidden = true;
      };
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fail();
      img.addEventListener('error', fail);
    });
  }
  function track_once_gallery() { track('GallerySwipe', {}, true); }

  /* ---------------- sticky + hitos de embudo ---------------- */
  function bindScroll() {
    var sticky = qs('[data-ep-sticky]'), heroCta = qs('[data-ep-cta="hero"]'), offer = qs('#ep-offer') || qs('#ep-order');
    var anchor = qs(C.checkout.anchor), faq = qs('#ep-faq'), raf = 0, shown = false;
    function tick() {
      var vh = global.innerHeight;
      var pastHero = heroCta ? heroCta.getBoundingClientRect().bottom < 0 : true;
      var o = offer ? offer.getBoundingClientRect() : null;
      var inOffer = o ? (o.top < vh * 0.85 && o.bottom > vh * 0.15) : false;
      var aTop = anchor ? anchor.getBoundingClientRect().top : Infinity;
      var fTop = faq ? faq.getBoundingClientRect().top : Infinity;
      var inForm = aTop < vh && fTop > vh * 0.4;
      if (o && o.top < vh * 0.6) track('ReachOffer', payload(packById(state.pack)), true);
      if (aTop < vh * 0.7) track('ReachForm', payload(packById(state.pack)), true);
      var show = pastHero && !inOffer && !inForm && !Order.done;
      if (sticky && show !== shown) {
        shown = show;
        sticky.classList.toggle('is-visible', show);
        sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
        var b = qs('[data-ep-go], [data-ep-cta]', sticky); if (b) b.tabIndex = show ? 0 : -1;
      }
    }
    global.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }, { passive: true });
    tick();
    /* primer foco en un campo del formulario nativo = inicio de formulario */
    document.addEventListener('focusin', function (e) {
      var t = e.target;
      if (!anchor || !t || !/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || t.closest('.ep-root')) return;
      if (t.type === 'radio' || t.type === 'checkbox' || t.closest('.ep-native-hidden') || t.closest(C.checkout.funnelish.itemSelector)) return;
      if (anchor.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING) track('FormStart', payload(packById(state.pack)), true);
    });
  }

  /* ---------------- arranque ---------------- */
  function injectGlobalStyle() {
    if (qs('#ep-native-style')) return;
    var s = document.createElement('style');
    s.id = 'ep-native-style';
    /* se oculta fuera de pantalla, no con display:none: Alpine necesita el nodo vivo */
    s.textContent = '.ep-native-hidden{position:absolute!important;left:-99999px!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important}';
    document.head.appendChild(s);
  }
  function start() {
    if (global.__EP_STARTED) return; global.__EP_STARTED = true;
    renderAll();
    injectGlobalStyle();
    qsa('[data-ep-gallery]').forEach(function (g) { var x = Gallery(g); if (x) galleries.push(x); });
    qsa('[data-ep-marquee]').forEach(Marquee);
    Reviews();
    /* video: solo carga y reproduce cuando entra en pantalla */
    qsa('video[data-ep-autoplay]').forEach(function (v) {
      if (reduce || !('IntersectionObserver' in global)) { v.controls = true; return; }
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () { v.controls = true; }); track('VideoView', {}, true); }
          else v.pause();
        });
      }, { threshold: .5 }).observe(v);
    });
    qsa('.ep-root img').forEach(function (img) {   /* foto rota: se oculta su contenedor de medio */
      if (img.closest('[data-ep-gallery], [data-ep-reviews]')) return;
      var fail = function () { var box = img.closest('.ep-step-media, .ep-card-media, .ep-formula-hero, figure'); (box || img).hidden = true; };
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fail();
      img.addEventListener('error', fail);
    });
    /* al volver con el botón atrás del navegador, los botones quedan activos de nuevo */
    global.addEventListener('pageshow', function () { qsa('[data-ep-cta]').forEach(function (b) { b.removeAttribute('aria-busy'); }); });
    bindPacks();
    bindCTAs();
    setPack(state.pack, null);
    bindScroll();
    if (C.checkout.mode === 'funnelish') Native.init();
    track('ViewPDP', payload(packById(state.pack)), true);
    if (C.checkout.mode === 'inline') {
      if (C.tracking.fireStandardEvents) sendPixel(['track', 'ViewContent', payload(packById(state.pack))]);
      ttTrack('ViewContent', ttData(packById(state.pack)));
      Order.init();
      Funnel.init();
      global.EP_POP = {
        test: Order.test, funnel: function (ev, x) { Funnel.send(ev, x); }, api: function (b) { b.slug = C.checkout.slug; return Order.api('POST', '', b); },
        selKey: function () { return packById(state.pack).offerKey; }, bump: function () { return !!Order.st.bump; }, ordered: function () { return !!Order.done; },
        applyCoupon: function (c) { Order.st.coupon = c; Order.update(); },
        goForm: function () { var box = qs('.epp-ok') || qs('#tp-card') || qs('#ep-order'); if (box) scrollToEl(box); }
      };
      try { global.dispatchEvent(new Event('ep:pop-ready')); } catch (e) {}
      /* para selectores externos (p. ej. el carrusel de la página de Shopify copiada): elige el plan y baja al formulario */
      global.EP_SELECT_PLAN = function (offerKey, source) {
        var p = null; C.packs.forEach(function (x) { if (x.offerKey === offerKey || x.id === offerKey) p = x; });
        if (p) setPack(p.id, source || 'selector');
        Order.loadConfig();
        var box = qs('#ep-order'); if (box) scrollToEl(box);
      };
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : globalThis);
