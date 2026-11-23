"""Black Friday ENERPLU: banner con efectos + selector marcado.

Se activa solo entre el 27-nov-2026 00:00 y el 30-nov-2026 23:59 (hora Colombia).
Vista previa en cualquier momento con ?bf=1 en la URL.
Idempotente: reemplaza el bloque entre los marcadores si ya existe.
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
PAGINAS = ["index", "siempre", "tienda", "vital", "producto", "ofertas", "oferta-a",
           "checkout-blanco", "pedido", "pro"]
INI, FIN = "<!-- BF:INI -->", "<!-- BF:FIN -->"

AB_INI_MS = 1795447200000  # E-09 arranca 23-nov 10:20am Bogotá (cesar 'si ofrecer la oferta black aun')

BLOQUE = INI + r"""
<style id="bf-css">
.bf-banner{display:none}
html.bf-on .bf-banner{display:block;position:relative;overflow:hidden;background:#050505;border-bottom:1px solid #2a2208;padding:18px 16px 16px;text-align:center;cursor:pointer;font-family:inherit}
.bf-banner::before{content:"";position:absolute;inset:-60%;background:conic-gradient(from 0deg,transparent 0 70%,rgba(212,175,55,.35) 80%,transparent 90%);animation:bf-giro 6s linear infinite}
.bf-banner::after{content:"";position:absolute;inset:2px;background:radial-gradient(120% 90% at 50% 0%,#1d1606 0%,#050505 65%);border-radius:2px}
.bf-in{position:relative;z-index:1}
.bf-kick{display:inline-block;font-size:11px;font-weight:800;letter-spacing:3px;color:#111;background:#ff2d2d;padding:4px 10px;border-radius:20px;animation:bf-late 1.4s ease-in-out infinite}
.bf-title{margin:8px 0 2px;font-size:40px;line-height:1;font-weight:900;letter-spacing:1px;text-transform:uppercase;background:linear-gradient(90deg,#b8860b,#fff3c4,#d4af37,#fff,#d4af37,#b8860b);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:bf-brillo 3s linear infinite;filter:drop-shadow(0 0 10px rgba(212,175,55,.45))}
.bf-sub{color:#f3f3f3;font-size:15px;font-weight:600;margin:6px 0 10px}
.bf-sub b{color:#ffd54a}
.bf-cd{display:inline-flex;gap:6px}
.bf-cd span{min-width:46px;background:#141414;border:1px solid #d4af37;border-radius:8px;padding:5px 4px 3px;color:#fff;font-weight:800;font-size:20px;line-height:1}
.bf-cd small{display:block;font-size:9px;font-weight:600;color:#bba25a;letter-spacing:1px;margin-top:3px}
.bf-cta{display:block;margin:12px auto 0;max-width:320px;background:#ff2d2d;color:#fff;font-weight:800;font-size:15px;padding:11px 14px;border-radius:10px;box-shadow:0 0 18px rgba(255,45,45,.55);animation:bf-late 1.4s ease-in-out infinite}
.bf-chispa{position:absolute;z-index:1;width:4px;height:4px;border-radius:50%;background:#ffe9a3;box-shadow:0 0 8px 2px #d4af37;opacity:0;animation:bf-chispa 2.6s ease-in-out infinite}
@keyframes bf-giro{to{transform:rotate(360deg)}}
@keyframes bf-brillo{to{background-position:300% 0}}
@keyframes bf-late{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes bf-chispa{0%,100%{opacity:0;transform:translateY(6px) scale(.4)}50%{opacity:1;transform:translateY(-6px) scale(1)}}
html.bf-on .eph-title{color:transparent!important;background:linear-gradient(90deg,#d4af37,#fff3c4,#d4af37);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;animation:bf-brillo 3s linear infinite}
html.bf-on .eph-card[data-pack="dominio"],html.bf-on .eph-card[data-pack="elite"]{border-color:#d4af37!important;animation:bf-borde 2s ease-in-out infinite}
html.bf-on .bf-box{display:block;position:relative;margin:14px 0 2px;padding:16px 12px 12px;border-radius:12px;background:linear-gradient(110deg,#a67c00 0%,#d4af37 25%,#fff1b8 45%,#d4af37 60%,#a67c00 100%);background-size:250% 100%;animation:bf-brillo 4s linear infinite;box-shadow:0 0 0 1px #fff1b8 inset,0 6px 18px rgba(212,175,55,.35)}
html.bf-on .bf-cinta{position:absolute;top:-11px;left:50%;transform:translateX(-50%);display:inline-flex;align-items:center;gap:6px;white-space:nowrap;background:#000;color:#ffd54a;border:1.5px solid #d4af37;border-radius:20px;padding:3px 12px;font-size:12px;font-weight:900;letter-spacing:2px}
html.bf-on .bf-rayo{width:20px!important;height:20px!important;flex:0 0 20px;fill:#ffd54a;filter:drop-shadow(0 0 4px #ffb300);animation:bf-flash 1.2s ease-in-out infinite}
html.bf-on .bf-fila{display:flex;align-items:center;gap:12px}
html.bf-on .bf-num{flex:0 0 auto;width:54px;height:54px;border-radius:50%;background:#000;color:#ffd54a;border:2px solid #fff1b8;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;box-shadow:0 0 12px rgba(0,0,0,.35)}
html.bf-on .bf-txt{display:flex;flex-direction:column;color:#111;line-height:1.2;text-align:left}
html.bf-on .bf-txt>b{font-size:19px;font-weight:900;text-transform:uppercase;letter-spacing:.3px}
html.bf-on .bf-txt span{font-size:14.5px;font-weight:600;margin-top:2px}
html.bf-on .bf-txt small{font-size:12px;font-weight:700;opacity:.75;margin-top:1px}
@keyframes bf-flash{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(1.25)}}
@keyframes bf-borde{0%,100%{box-shadow:0 0 0 2px rgba(212,175,55,.15),0 0 10px rgba(212,175,55,.15)}50%{box-shadow:0 0 0 3px rgba(212,175,55,.45),0 0 22px rgba(212,175,55,.45)}}
@media (prefers-reduced-motion:reduce){html.bf-on .bf-banner *,html.bf-on .bf-banner::before,html.bf-on .eph-card,html.bf-on .eph-title{animation:none!important}}
</style>
<script id="bf-js">
(function(){
  var FIN = Date.UTC(2026,11,1,4,59,59);   /* 30-nov 23:59:59 Colombia */
  var INICIO = Date.UTC(2026,10,27,5,0,0); /* 27-nov 00:00 Colombia */
  /* E-09: antes del 27, la mitad del tráfico ve la oferta Black (cookie ep_e09 A/B 30 días). AB_INI = cuando arranca la prueba. */
  var AB_INI = __AB_INI__;
  var ahora = Date.now(), q = new URLSearchParams(location.search);
  var forzar = q.get("bf") === "1" || q.get("ab9") === "B";
  var enVentana = ahora >= INICIO && ahora <= FIN;
  var v = null;
  if (!enVentana && ahora >= AB_INI && ahora <= FIN) {
    var m = document.cookie.match(/(?:^|; )ep_e09=([AB])/);
    v = q.get("ab9") === "A" || q.get("ab9") === "B" ? q.get("ab9") : (m ? m[1] : (Math.random() < 0.5 ? "A" : "B"));
    document.cookie = "ep_e09=" + v + "; Path=/; Max-Age=2592000; SameSite=Lax; Secure";
    try { window.clarity && clarity("set", "e09", v); } catch (e) {}
    if (q.get("ep_test") !== "1") (function go(n){
      var sid = ""; try { sid = sessionStorage.getItem("ep_sid") || ""; } catch (e) {}
      if (!sid) { if (n < 20) setTimeout(function(){ go(n+1); }, 300); return; }
      var b = JSON.stringify({sid:sid, ev:"ab_assign", page:(location.host+location.pathname).slice(0,300), store:"enerplu",
        utm_source:q.get("utm_source"), utm_campaign:q.get("utm_campaign"), utm_content:q.get("utm_content"), utm_term:q.get("utm_term"), extra:{exp:"E09", v:v}});
      var U = "https://mqwscbpdozrdiqxofmod.supabase.co/functions/v1/funnel-track";
      try { if (!(navigator.sendBeacon && navigator.sendBeacon(U, new Blob([b], {type:"text/plain"})))) fetch(U, {method:"POST", body:b, keepalive:true, headers:{"Content-Type":"text/plain"}}); } catch (e) {}
    })(0);
  }
  if (!forzar && !enVentana && v !== "B") return;
  document.documentElement.classList.add("bf-on");
  /* los pedidos Black van con su propia oferta en el CRM (3 y 6 cajas) */
  (function claves(n){
    var C = window.EP_CONFIG;
    if (!C || !C.packs) { if (n < 50) setTimeout(function(){ claves(n+1); }, 100); return; }
    C.packs.forEach(function(p){ if (p.offerKey === "dominio" || p.offerKey === "elite") p.offerKey = p.offerKey + "_bf"; });
  })(0);
  var antes = ahora < INICIO;
  function titulo(){
    document.querySelectorAll(".eph-title").forEach(function(t){
      if (t.textContent.indexOf("Black") < 0) t.textContent = "Ofertas Black Friday disponibles hoy";
    });
  }
  function banner(){
    if (document.querySelector(".bf-banner")) return;
    var d = document.createElement("div");
    d.className = "bf-banner"; d.setAttribute("role","region"); d.setAttribute("aria-label","Black Friday");
    var ch = "";
    for (var i=0;i<10;i++) ch += '<i class="bf-chispa" style="left:'+(5+i*9.5)+'%;top:'+(15+(i*37)%70)+'%;animation-delay:'+(i*0.27).toFixed(2)+'s"></i>';
    d.innerHTML = ch + '<div class="bf-in"><span class="bf-kick">'+(antes?'SE ADELANTÓ EL':'ESTAMOS DE')+'</span>'
      + '<div class="bf-title">Black Friday</div>'
      + '<div class="bf-sub">Cajas <b>GRATIS</b> en Dominio y Élite: <b>3 por el precio de 2</b> y <b>6 por el precio de 4</b></div>'
      + '<div class="bf-cd" aria-label="Tiempo restante"><span id="bf-d">0<small>DÍAS</small></span><span id="bf-h">0<small>HORAS</small></span><span id="bf-m">0<small>MIN</small></span><span id="bf-s">0<small>SEG</small></span></div>'
      + '<span class="bf-cta">VER OFERTAS BLACK →</span></div>';
    d.addEventListener("click", function(){
      var w = document.querySelector("#ep-offer-widget, .ep-plans");
      if (w) w.scrollIntoView({behavior:"smooth", block:"start"});
    });
    var barra = document.querySelector(".epb");
    if (barra && barra.parentNode) barra.parentNode.insertBefore(d, barra.nextSibling);
    else document.body.insertBefore(d, document.body.firstChild);
    function tic(){
      var r = Math.max(0, FIN - Date.now()), s = Math.floor(r/1000);
      var v = {d:Math.floor(s/86400), h:Math.floor(s%86400/3600), m:Math.floor(s%3600/60), s:s%60};
      ["d","h","m","s"].forEach(function(k){
        var el = document.getElementById("bf-"+k);
        if (el) el.firstChild.nodeValue = (v[k]<10?"0":"")+v[k];
      });
    }
    tic(); setInterval(tic, 1000);
  }
  var BF = {dominio:{n:"+1", g:"caja GRATIS", t:"3 cajas · 30 tabletas", u:"$4.330 por ocasión"},
            elite:{n:"+2", g:"cajas GRATIS", t:"6 cajas · 60 tabletas", u:"$2.665 por ocasión"}};
  var RAYO = '<svg class="bf-rayo" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2 4 13.5h6.5L9 22l11-13h-7z"/></svg>';
  function cards(){
    Object.keys(BF).forEach(function(k){
      document.querySelectorAll('.eph-card[data-pack="'+k+'"]').forEach(function(c){
        if (c.querySelector(".bf-box")) return;
        var x = BF[k], b = document.createElement("span");
        b.className = "bf-box";
        b.innerHTML = '<span class="bf-cinta">'+RAYO+'BLACK FRIDAY'+RAYO+'</span>'
          + '<span class="bf-fila"><span class="bf-num">'+x.n+'</span>'
          + '<span class="bf-txt"><b>'+x.g+'</b><span>Total: <b>'+x.t+'</b></span><small>'+x.u+'</small></span></span>';
        var row = c.querySelector(".eph-c-row"); if (row) row.parentNode.insertBefore(b, row.nextSibling);
      });
    });
  }
  function todo(){ banner(); titulo(); cards(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", todo); else todo();
  new MutationObserver(function(){titulo();cards();}).observe(document.documentElement, {childList:true, subtree:true});
})();
</script>
""" + FIN


def aplicar(html: str) -> str:
    bloque = BLOQUE.replace("__AB_INI__", str(AB_INI_MS))
    html = re.sub(re.escape(INI) + r".*?" + re.escape(FIN), "", html, flags=re.S)
    i = html.rfind("</body>")
    if i < 0:
        return html + bloque
    return html[:i] + bloque + "\n" + html[i:]


if __name__ == "__main__":
    for n in PAGINAS:
        p = PUB / f"{n}.html"
        if p.exists():
            p.write_text(aplicar(p.read_text(encoding="utf-8")), encoding="utf-8")
            print("BF:", p.name)
