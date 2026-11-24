"""E-10 ENERPLU: formulario nuevo (cesar 23-nov 6:24pm "PROBEMOSLO UNAS DOS HORAS").

Versión B (mitad del tráfico, cookie ep_e10 A/B):
  - Nombre completo en un solo campo (se reparte solo en nombre y apellido).
  - Departamento y ciudad con listas desplegables (la ciudad solo muestra los municipios del departamento).
    "Mi municipio no aparece" abre el campo de texto de siempre.
  - Sección de oferta + formulario en blanco (estilos del checkout blanco ck3), botón verde #15803D.
Versión A: la página de siempre.
Ventana: entre INI y FIN (ms UTC). Fuera de la ventana todos ven A. Vista previa: ?fc=1 (B) o ?fc=0 (A).
Medición: funnel_events ab_assign {exp:'E10', v} por sesión + checkout_attempts.session_id.
Uso: python3 tools/form_ciudad.py <INI_ms> <FIN_ms> [todos]   (idempotente: reemplaza el bloque entre marcadores)
"""
import pathlib, re, sys, json

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
PAGINAS = ["index", "siempre", "tienda", "vital", "producto", "oferta-a", "checkout-blanco", "pedido"]
INI_M, FIN_M = "<!-- E10:INI -->", "<!-- E10:FIN -->"

INI_MS, FIN_MS = int(sys.argv[1]), int(sys.argv[2])
TODOS = len(sys.argv) > 3 and sys.argv[3] == "todos"   # todos ven B (cesar 23-nov 9:02pm "Nuevo al 100%")

deps = {}
for bloque in (ROOT / "tools" / "municipios.txt").read_text(encoding="utf-8").strip().split("|"):
    d, ms = bloque.split(":", 1)
    deps[d] = ms.split(";")

ck = (ROOT / "fuente" / "checkout-blanco" / "ck.css").read_text(encoding="utf-8")
ck = ck.split("/* barra de pasos */")[0]   # solo los colores, sin la barra de 3 pasos
ck = ck.replace(".eph-order.ck3", ".eph-order.fc3")

CSS = ck + r"""
.ep-root .eph-order.fc3 .ep-of-submit{background:#15803D!important;border-color:#15803D!important;box-shadow:0 8px 20px rgba(21,128,61,.35)!important;color:#fff!important}
.ep-root .eph-order.fc3 .ep-of-submit .ep-cta-sep{background:rgba(255,255,255,.35)!important}
html .ep-root .eph-order.fc3 .eph-title{background:none!important;color:#111!important;-webkit-text-fill-color:#111!important;animation:none!important;filter:none!important}
.ep-root .ep-f select.fc-sel{display:block;width:100%;box-sizing:border-box;min-height:52px;padding:12px 44px 12px 14px;border:1px solid #D1D5DB;border-radius:12px;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 16px center;font:500 16px/1.3 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111;-webkit-appearance:none;appearance:none}
.ep-root .ep-f select.fc-sel:disabled{color:#6B7280;background-color:#F3F4F6}
.ep-root .ep-f select.fc-sel:focus{outline:2px solid #15803D;outline-offset:1px}
.ep-root .ep-f select.fc-sel.fc-vacio{color:#6B7280}
"""

JS = r"""
(function(){
  try{
  var INI=__INI__, FIN=__FIN__, ahora=Date.now(), q=new URLSearchParams(location.search), f=q.get('fc'), v=null;
  if(f==='1')v='B'; else if(f==='0')v='A';
  else{
    if(ahora<INI||ahora>FIN)return;
    var m=document.cookie.match(/(?:^|; )ep_e10=([AB])/);
    v=__TODOS__?'B':(m?m[1]:(Math.random()<0.5?'A':'B'));
    document.cookie='ep_e10='+v+'; Path=/; Max-Age=86400; SameSite=Lax; Secure';
    if(q.get('ep_test')!=='1'){
      var n=0;(function go(){var sid='';try{sid=sessionStorage.getItem('ep_sid')||''}catch(e){}if(!sid){if(n++<20)setTimeout(go,300);return;}
        var b=JSON.stringify({sid:sid,ev:'ab_assign',page:(location.host+location.pathname).slice(0,300),store:'enerplu',utm_source:q.get('utm_source'),utm_campaign:q.get('utm_campaign'),utm_content:q.get('utm_content'),utm_term:q.get('utm_term'),extra:{exp:'E10',v:v}});
        var U='https://mqwscbpdozrdiqxofmod.supabase.co/functions/v1/funnel-track';
        try{if(!(navigator.sendBeacon&&navigator.sendBeacon(U,new Blob([b],{type:'text/plain'}))))fetch(U,{method:'POST',body:b,keepalive:true,headers:{'Content-Type':'text/plain'}})}catch(e){}})();
    }
  }
  try{window.clarity&&clarity('set','e10',v)}catch(e){}
  if(v!=='B')return;
  var DEPS=__DEPS__;
  function ev(el,t){el.dispatchEvent(new Event(t,{bubbles:true}));}
  function fo(el){el.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]});}
  function aplicar(){
    var first=document.getElementById('ep-f-first'), last=document.getElementById('ep-f-last'), city=document.getElementById('ep-f-city');
    if(!first||!last||!city||document.getElementById('fc-nombre'))return !!document.getElementById('fc-nombre');
    var orden=first.closest('.eph-order'); if(orden)orden.classList.add('fc3');
    /* ---- nombre completo ---- */
    var grid=first.closest('.ep-of-grid')||first.closest('.ep-f');
    var nd=document.createElement('div'); nd.className='ep-f fc-name';
    nd.innerHTML='<label for="fc-nombre">Nombre completo</label><input id="fc-nombre" type="text" autocomplete="name" autocapitalize="words" maxlength="120" placeholder="Ej: Carlos Gómez"><p class="ep-f-err" id="fc-nombre-err" hidden></p>';
    grid.parentNode.insertBefore(nd,grid); grid.style.display='none';
    var nom=document.getElementById('fc-nombre'), nerr=document.getElementById('fc-nombre-err');
    function repartir(){
      if(!String(nom.value||'').trim()&&first.value){nom.value=(first.value+' '+last.value).trim();return;}
      var p=String(nom.value||'').trim().split(/\s+/).filter(Boolean), cut=p.length>=4?2:1;
      first.value=p.length?p.slice(0,cut).join(' '):''; last.value=p.length>=2?p.slice(cut).join(' '):'';
    }
    nom.addEventListener('input',function(){repartir(); if(!nerr.hidden&&first.value.length>=2){nerr.hidden=true;nerr.textContent='';nom.removeAttribute('aria-invalid');}});
    nom.addEventListener('blur',function(){repartir(); fo(first); fo(last);});
    function espejo(){
      var e1=document.querySelector('[data-ep-err="first_name"]'), e2=document.querySelector('[data-ep-err="last_name"]'), t='';
      if(e1&&!e1.hidden&&e1.textContent)t=e1.textContent; else if(e2&&!e2.hidden&&e2.textContent)t='Escribe tu nombre para recibir el pedido';
      nerr.textContent=t; nerr.hidden=!t; if(t)nom.setAttribute('aria-invalid','true'); else nom.removeAttribute('aria-invalid');
    }
    ['first_name','last_name'].forEach(function(k){var e=document.querySelector('[data-ep-err="'+k+'"]'); if(e)new MutationObserver(espejo).observe(e,{attributes:true,childList:true,characterData:true,subtree:true});});
    var form=first.closest('form');
    if(form)form.addEventListener('submit',function(){repartir(); setTimeout(function(){espejo(); if(!nerr.hidden){nom.scrollIntoView({block:'center'}); try{nom.focus({preventScroll:true})}catch(e){}}},60);},true);
    /* ---- departamento + ciudad ---- */
    var cf=city.closest('.ep-f'), lab=cf.querySelector('label'), list=document.getElementById('ep-f-city-list');
    lab.style.display='none'; city.style.display='none';
    var wrap=document.createElement('div');
    var opD='<option value="">Elige tu departamento</option>'+Object.keys(DEPS).map(function(d){return '<option>'+esc(d)+'</option>';}).join('');
    wrap.innerHTML='<label for="fc-dep">Departamento</label><select id="fc-dep" class="fc-sel fc-vacio">'+opD+'</select>'+
      '<label for="fc-mun" style="margin-top:14px">Ciudad o municipio</label><select id="fc-mun" class="fc-sel fc-vacio" disabled><option value="">Primero elige el departamento</option></select>'+
      '<p class="ep-f-help" id="fc-mun-h" style="margin-top:6px">Si no está tu municipio, elige la última opción y escríbelo.</p>';
    cf.insertBefore(wrap,lab);
    var dep=document.getElementById('fc-dep'), mun=document.getElementById('fc-mun');
    function verTexto(val){
      lab.style.display=''; city.style.display=''; mun.closest('div')&&0;
      document.querySelector('label[for="fc-mun"]').style.display='none'; mun.style.display='none'; document.getElementById('fc-mun-h').style.display='none';
      if(val!=null&&val!==false){city.value=val; ev(city,'input');}
      if(val!==false)setTimeout(function(){try{city.focus()}catch(e){}},50);
    }
    /* recarga con datos guardados: se muestran el nombre y la ciudad que ya había escrito */
    setTimeout(function(){repartir(); if(city.value&&!dep.value)verTexto(false);},900);
    dep.addEventListener('change',function(){
      dep.classList.toggle('fc-vacio',!dep.value);
      var ms=DEPS[dep.value]||[];
      mun.innerHTML='<option value="">'+(dep.value?'Elige tu ciudad o municipio':'Primero elige el departamento')+'</option>'+ms.map(function(x){return '<option>'+esc(x)+'</option>';}).join('')+(dep.value?'<option value="__otro">Mi municipio no aparece (escribirlo)</option>':'');
      mun.disabled=!dep.value; mun.classList.add('fc-vacio');
      if(ms.length===1){mun.value=ms[0]; ev(mun,'change');}
    });
    mun.addEventListener('change',function(){
      mun.classList.toggle('fc-vacio',!mun.value);
      if(!mun.value)return;
      if(mun.value==='__otro'){verTexto('');return;}
      var nombre=mun.value.replace(/\s*\(.*?\)\s*/g,' ').trim();
      city.value=nombre+(dep.value?', '+dep.value:'');
      ev(city,'input'); fo(city);
      /* red de seguridad: si en 2,5 s no quedó elegida, se muestra el campo de texto con lo escrito y su lista */
      setTimeout(function(){var ok=document.querySelector('[data-ep-city-ok]'); var er=document.querySelector('[data-ep-err="city"]');
        if((!ok||ok.hidden)&&!(er&&!er.hidden&&er.textContent)){ verTexto(null); try{city.focus()}catch(e){} }},2500);
    });
    if(list)list.style.display='';
    return true;
  }
  function intentar(k){ if(aplicar())return; if(k<60)setTimeout(function(){intentar(k+1)},150); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){intentar(0)}); else intentar(0);
  }catch(e){}
})();
"""

BLOQUE = INI_M + "\n<style id=\"e10-css\">\n" + CSS + "\n</style>\n<script id=\"e10-js\">" + \
    JS.replace("__TODOS__", "true" if TODOS else "false").replace("__INI__", str(INI_MS)).replace("__FIN__", str(FIN_MS)).replace("__DEPS__", json.dumps(deps, ensure_ascii=False, separators=(",", ":"))) + \
    "</script>\n" + FIN_M

for p in PAGINAS:
    f = PUB / f"{p}.html"
    s = f.read_text(encoding="utf-8")
    if 'id="ep-f-city"' not in s:
        print("sin formulario:", p); continue
    if INI_M in s:
        s = re.sub(re.escape(INI_M) + r".*?" + re.escape(FIN_M), lambda m: BLOQUE, s, flags=re.S)
    else:
        s = s.replace("</body>", BLOQUE + "\n</body>", 1)
    f.write_text(s, encoding="utf-8")
    print("ok", p)
