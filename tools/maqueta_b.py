"""Genera public/maqueta-b.html (vista previa de la página B, sin publicar) a partir de un index.html con hero v2.
Uso: python3 tools/maqueta_b.py <index_con_hero_v2.html> public/maqueta-b.html"""
import re, sys, urllib.parse
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def must(s, a, b, n=1):
    c = s.count(a); assert c >= n, (a[:70], c); return s.replace(a, b)

# 1) Siempre en modo prueba: no crea pedidos, no registra embudo ni pixel
HEAD = """<meta name="robots" content="noindex,nofollow">
<script>
(function(){if(!/[?&]ep_test=1(&|$)/.test(location.search)){var q=location.search?location.search+'&ep_test=1':'?ep_test=1';history.replaceState(null,'',location.pathname+q+location.hash);}
var c;Object.defineProperty(window,'EP_CONFIG',{configurable:true,get:function(){return c},set:function(v){c=v;if(v){v.checkout=v.checkout||{};v.checkout.forceTest=true;}}});})();
</script>"""
s = s.replace('<head>', '<head>\n' + HEAD, 1)

# 2) Emojis -> íconos de línea (máscara CSS, sirven también dentro de textos de JS)
P = {
 'truck': '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
 'cash': '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
 'flame': '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
 'gift': '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
 'box': '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
 'flask': '<path d="M9 3h6"/><path d="M10 3v6L4.5 19A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>',
 'alert': '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
 'zap': '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
 'chat': '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/>',
 'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
}
EMO = {'🚚': 'truck', '💵': 'cash', '🔥': 'flame', '🎁': 'gift', '📦': 'box', '🧪': 'flask', '⚠️': 'alert', '⚠': 'alert', '⚡': 'zap', '💬': 'chat', '🛡️': 'shield', '🛡': 'shield'}
css = ['.epi{display:inline-block;width:1.05em;height:1.05em;vertical-align:-.17em;margin-right:.3em;background:currentColor;-webkit-mask:var(--m) center/contain no-repeat;mask:var(--m) center/contain no-repeat;color:#d4af37}']
for k, d in P.items():
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'
    css.append('.epi-%s{--m:url("data:image/svg+xml,%s")}' % (k, urllib.parse.quote(svg)))
for e, k in EMO.items():
    s = s.replace(e + ' ', '<i class=epi epi-%s></i>' % k).replace(e, '<i class=epi epi-%s></i>' % k)
s = s.replace('class=epi epi-', 'class="epi epi-')
s = re.sub(r'class="epi epi-([a-z]+)>', r'class="epi epi-\1">', s)
# dentro de JS con comillas simples las comillas dobles sirven; ya quedan como class="epi epi-x"

# 3) Guías de regalo como libros (portadas reales en 3D)
COV = 'https://res.cloudinary.com/dzlys7ftg/image/upload/w_260,f_auto,q_auto/'
BOOKS = [('v1794151421/Portada_Maestro_del_Orgasmo__Edici%C3%B3n_C%C3%B3smica_smufbu.webp', 'Maestro del Orgasmo'),
         ('v1794151422/Portada_Secretos_sexuales__edici%C3%B3n_de_lujo_tnnyoz.webp', 'Secretos Sexuales'),
         ('v1794151421/Portada_Genio_del_Sexo_ipiu7i.webp', 'Genio del Sexo')]
def books(cls):
    return '<img class="bk-photo %s" src="/img/guias-libros.webp" alt="3 guías digitales de regalo: Maestro del Orgasmo, Secretos Sexuales y Genio del Sexo" loading="lazy" width="1200" height="800">' % cls
s = re.sub(r'<div class="eph-libros">.*?</div>', books('bk-form'), s, count=1, flags=re.S)
GIFT = ('<div class="hv-gift">' + books('bk-hero') +
        '<p><b>Regalo: 3 guías digitales</b> para potenciar tus encuentros. Te llegan por WhatsApp cuando recibes tu pedido.</p></div>')
a = s.index('<div class="hv-trust">'); b = s.index('</div>\n    </div>', a)
b = s.index('</div>', s.index('</div>', s.index('</div>', a) + 1) + 1)  # cierre aproximado; se valida abajo
# insertar después del bloque hv-trust completo
depth, i = 0, a
while True:
    o = s.find('<div', i); c = s.find('</div>', i)
    if o != -1 and o < c: depth += 1; i = o + 4
    else:
        depth -= 1; i = c + 6
        if depth == 0: break
s = s[:i] + '\n      ' + GIFT + s[i:]

# 4) Pasos numerados: 1 pago, 2 dirección, 3 envío
pay = re.search(r'\s*<fieldset class="ep-of-block" data-ep-pay-block hidden>.*?</fieldset>', s, re.S).group(0)
s = s.replace(pay, '')
s = must(s, '\n      <fieldset class="ep-of-block">\n        <legend class="ep-of-legend">¿A dónde te lo enviamos?</legend>', pay + '\n      <fieldset class="ep-of-block">\n        <legend class="ep-of-legend">¿A dónde te lo enviamos?</legend>')
s = must(s, '<legend class="ep-of-legend">¿Cómo quieres pagar?</legend>', '<legend class="ep-of-legend"><span class="ep-of-n">1</span>¿Cómo quieres pagar?</legend>')
s = must(s, '<div class="ep-ship" data-ep-render="pay"></div>', '<div class="ep-ship" data-ep-render="pay"></div><div class="bold-kit"><span>Pagos procesados por</span><div id="bold-kit"></div></div>')
s = must(s, '<fieldset class="ep-of-block" data-ep-pay-block hidden>', '<div class="tp-card" id="tp-card"><div class="tp-img"></div><div class="tp-txt"><small>Tu pedido</small><b data-tp-name>Plan Dominio Total</b><span data-tp-qty>2 cajas · 20 tabletas</span></div><div class="tp-pr"><b data-tp-price>$129.900</b><a href="#ep-offer-widget" data-tp-change>Cambiar</a></div></div>\n      <fieldset class="ep-of-block" data-ep-pay-block hidden>')
s = must(s, '<legend class="ep-of-legend">¿A dónde te lo enviamos?</legend>', '<legend class="ep-of-legend"><span class="ep-of-n">2</span>¿A dónde te lo enviamos?</legend>')
s = must(s, '<legend class="ep-of-legend">Envío</legend>', '<legend class="ep-of-legend"><span class="ep-of-n">3</span>Envío</legend>')

# 5) Barra fija con plan y precio
s = must(s, """bar.innerHTML = '<div class="ep-hc-sticky-in"><div class="ep-hc-sticky-txt"><i class="epi epi-gift"></i>Regalo en todos los pedidos<small>Pagas al recibir · Envío discreto</small></div><a href="#ep-offer-widget">VER OFERTAS</a></div>';""",
         """bar.innerHTML = '<div class="ep-hc-sticky-in"><div class="ep-hc-sticky-txt">ENERPLU · <span data-sb-name>Plan Dominio Total</span><small><b data-sb-price>$129.900</b> · Pagas al recibir</small></div><a href="#ep-offer-widget">PEDIR AHORA</a></div>';""")

EXTRA_CSS = '\n'.join(css) + """
.bk-row{display:flex;justify-content:center;gap:14px;perspective:700px;margin:6px 0 10px}
.bk{position:relative;display:block;width:78px;aspect-ratio:3/4.2;transform:rotateY(-22deg);transform-style:preserve-3d;border-radius:2px 5px 5px 2px;box-shadow:10px 12px 18px rgba(0,0,0,.55),2px 2px 0 #c9c9c9,4px 4px 0 #9a9a9a}
.bk img{width:100%;height:100%;object-fit:cover;display:block;border-radius:2px 5px 5px 2px}
.bk:after{content:"";position:absolute;inset:0;border-radius:2px 5px 5px 2px;background:linear-gradient(90deg,rgba(0,0,0,.45) 0,rgba(255,255,255,.25) 4%,rgba(0,0,0,.15) 7%,transparent 12%,transparent 80%,rgba(255,255,255,.12));pointer-events:none}
.bk-hero .bk{width:84px}
.hv-gift{margin-top:14px;border:1px solid #3a3320;background:linear-gradient(160deg,rgba(212,175,55,.10),rgba(212,175,55,.02)),#0b0b0b;border-radius:14px;padding:14px 12px 12px;text-align:center}
.hv-gift p{margin:6px 0 0;font-size:13px;line-height:1.4;color:#d4d4d4}.hv-gift b{color:#d4af37}
.ep-root .eph-order .ep-of-n,.ep-of-n{display:inline-flex;align-items:center;justify-content:center;flex:0 0 26px;width:26px;height:26px;border-radius:50%;background:#d4af37;color:#111;font-size:14px;font-weight:900;margin-right:2px}
.ep-hc-sticky-txt small b{color:#fff}

.bk-photo{display:block;width:100%;height:auto;border-radius:12px;margin:0 auto 8px}
.hv-gift{padding:0 0 12px;overflow:hidden}.hv-gift p{padding:0 12px}
.eph-bonus--libros .bk-photo{max-width:340px}
.tp-card{display:flex;align-items:center;gap:12px;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:14px;padding:12px;margin:0 0 14px;scroll-margin-top:12px}
.tp-img{width:56px;height:56px;border-radius:10px;background:#fff center/cover no-repeat;flex:0 0 56px}
.tp-txt{flex:1;min-width:0;color:#fff;line-height:1.25}.tp-txt small{display:block;color:#a3a3a3;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
.tp-txt b{display:block;font-size:15px}.tp-txt span{font-size:12px;color:#a3a3a3}
.tp-pr{text-align:right}.tp-pr b{display:block;color:#fff;font-size:17px;font-weight:900}.tp-pr a{color:#d4af37;font-size:12px;font-weight:700;text-decoration:underline}
.ep-root .eph-order label.ep-pay-opt:has(input[value="bold"]){position:relative;border:2px solid #22c55e!important;background:linear-gradient(160deg,rgba(34,197,94,.14),rgba(34,197,94,.03)),#0d0d0d!important;margin-top:16px;padding-top:20px}
.ep-root .eph-order label.ep-pay-opt:has(input[value="bold"])::before{content:"AHORRA $12.000 PAGANDO AHORA";position:absolute;top:-12px;left:12px;background:#22c55e;color:#04140a;font:900 11px/1 Inter,system-ui,sans-serif;letter-spacing:.05em;padding:6px 10px;border-radius:999px}
.ep-root .eph-order label.ep-pay-opt:has(input[value="bold"]) .ep-pay-logos{display:none}
.ep-root .eph-order .ep-pay-save{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;background:#22c55e;color:#04140a!important;border-radius:10px;padding:8px 10px;font-size:11px!important;font-weight:800;line-height:1.1!important;text-transform:uppercase}
.ep-root .eph-order .ep-pay-save{font-size:0!important}
.ep-root .eph-order .ep-pay-save::after{content:"−$12.000";font-size:18px;font-weight:900;letter-spacing:-.01em}
.ep-root .eph-order .ep-pay-save::before{content:"Ahorras";font-size:10px;font-weight:800}
.bold-kit{display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:12px;color:#8a8a8a;font-size:11px}
.bold-kit #bold-kit{max-width:320px;width:100%;display:flex;justify-content:center}

#ep-offer-widget{display:none!important}
.ep-hc-sticky.mb-hide{transform:translateY(110%)!important}
.mqb{background:#d4af37;color:#111;font:700 11px/1.3 Inter,system-ui,sans-serif;text-align:center;padding:5px 8px;letter-spacing:.02em}
"""
s = s.replace('</head>', '<style>' + EXTRA_CSS + '</style>\n</head>', 1)
s = re.sub(r'(<body[^>]*>)', r'\1\n<div class="mqb">VISTA PREVIA · PÁGINA B · no crea pedidos</div>', s, count=1)

# 6) "Faltan N datos" en el botón y precio en la barra fija
JS = r"""<script>
(function(){
  function qsa(a,b){return Array.prototype.slice.call((b||document).querySelectorAll(a))}
  function tick(){
    var f=document.querySelector('[data-ep-order]'); if(!f) return;
    var req=qsa('input[required]',f).filter(function(i){return i.offsetParent!==null});
    var miss=req.filter(function(i){return !i.value.trim()||(i.name==='phone'&&i.value.replace(/\D/g,'').length<10)});
    var b=f.querySelector('[data-ep-submit] .ep-cta-label b');
    var pm=f.querySelector('input[name="ep-pay"]:checked'),pv=pm?pm.value:'cod';
    if(b){var t=miss.length?('Faltan '+miss.length+(miss.length>1?' datos':' dato')+' ↓'):(pv==='cod'?'Confirmar mi pedido':'Pagar ahora'); if(b.textContent!==t)b.textContent=t;}
    var tot=document.querySelector('[data-ep-bind="total"]'), sp=document.querySelector('[data-sb-price]'); if(tot&&sp)sp.textContent=tot.textContent;
    var ck=document.querySelector('input[name="ep-pack-hero"]:checked'), sn=document.querySelector('[data-sb-name]');
    var sel=document.querySelector('.eph-list [aria-checked="true"] .ep-sel-name, .eph-list .is-on .ep-sel-name, .eph-list input:checked ~ * .ep-sel-name');
    if(sn){var n=sel?sel.textContent.trim():(ck?ck.closest('label').querySelector('.hv-pname').textContent:'');if(n&&sn.textContent!==n)sn.textContent=n;}
  }
  document.addEventListener('input',tick,true);document.addEventListener('change',tick,true);document.addEventListener('click',function(){setTimeout(tick,60)},true);
  setInterval(tick,700);
  document.addEventListener('click',function(e){
    var btn=e.target.closest&&e.target.closest('[data-ep-submit]'); if(!btn) return;
    var f=btn.form; var m=qsa('input[required]',f).filter(function(i){return i.offsetParent!==null&&!i.value.trim()});
    if(m.length){e.preventDefault();e.stopPropagation();m[0].scrollIntoView({behavior:'smooth',block:'center'});setTimeout(function(){m[0].focus()},400);}
  },true);
})();
</script>"""
s = s.replace('</body>', JS + '\n</body>', 1)
JS2 = r'''<script src="https://bold.co/library/ui-kit.js?theme=dark&target=bold-kit" async></script>
<script>
(function(){
  function payTarget(){var p=document.getElementById('tp-card');return p||document.querySelector('[data-ep-order]');}
  function go(){var t=payTarget();if(!t)return;var y=t.getBoundingClientRect().top+pageYOffset-10;scrollTo({top:y,behavior:'smooth'});}
    // tocar un plan solo lo elige; el botón rojo (que muestra el plan y precio) es el que lleva al pago
  // botón del hero y barra fija también llevan al pago
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('#ep-hero-clean .hv-cta, .ep-hc-sticky a');if(!a)return;e.preventDefault();e.stopImmediatePropagation();go();},true);
  // "Cambiar" sube a los planes del hero (las ofertas solo están arriba)
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-tp-change]');if(!a)return;e.preventDefault();var l=document.querySelector('#ep-hero-clean .hv-plans-t')||document.querySelector('#ep-hero-clean .hv-plans');if(l)scrollTo({top:l.getBoundingClientRect().top+pageYOffset-10,behavior:'smooth'});},true);
  // barra fija: solo cuando no se ven ni los planes/botón del hero ni el formulario
  var vis={hero:true,form:false};
  function sb(){var b=document.querySelector('.ep-hc-sticky');if(b)b.classList.toggle('mb-hide',vis.hero||vis.form);}
  function watch(){
    var h=document.querySelector('#ep-hero-clean .hv-info'),f=document.querySelector('#ep-order [data-ep-order]');
    if(!h||!f||!('IntersectionObserver' in window))return;
    new IntersectionObserver(function(es){es.forEach(function(x){vis[x.target===h?'hero':'form']=x.isIntersecting});sb();}).observe(h);
    new IntersectionObserver(function(es){es.forEach(function(x){vis.form=x.isIntersecting});sb();}).observe(f);
    setInterval(sb,500);
  }
  document.readyState!=='loading'?watch():document.addEventListener('DOMContentLoaded',watch);
  function paint(){
    var C=window.EP_CONFIG;if(!C)return;
    var on=document.querySelector('#ep-order .ep-sel-opt.is-on'),ck=document.querySelector('input[name="ep-pack-hero"]:checked');
    var id=(on&&on.getAttribute('data-pack'))||(ck&&ck.value)||C.defaultPack,p=null;C.packs.forEach(function(x){if(x.id===id)p=x});if(!p)return;
    var R=window.EP_RENDER,m=R?R.money:function(n){return '$'+n};
    var set=function(sel,t){var el=document.querySelector(sel);if(el&&el.textContent!==t)el.textContent=t};
    set('[data-tp-name]',p.name);set('[data-tp-qty]',p.boxes+(p.boxes>1?' cajas':' caja')+' · '+p.tablets+' tabletas'+(p.gifts&&p.gifts.length>1?' + retardante':''));set('[data-tp-price]',m(p.price));
    var img=document.querySelector('#ep-hero-clean .hv-plan[data-pack="'+id+'"] .hv-pimg img'),ti=document.querySelector('.tp-img');if(img&&ti)ti.style.backgroundImage='url("'+img.src+'")';
    var hk=document.querySelector('input[name="ep-pack-hero"][value="'+id+'"]');
  }
  setInterval(paint,600);document.addEventListener('click',function(){setTimeout(paint,80)},true);
})();
</script>'''
s = s.replace('</body>', JS2 + '\n</body>', 1)
open(out, 'w', encoding='utf-8').write(s)
print('ok', len(s), 'emojis left:', len(re.findall(r'[\U0001F300-\U0001FAFF⚠⚡]', s)))
