"""Memoria de UTM (cesar 21-nov): que ningún pedido de anuncio llegue "sin UTM".

Script al inicio del <head> de cada página de ENERPLU, antes de cualquier otro:
- Si la URL trae utm_*, los guarda 7 días en el celular (localStorage 'ep_utm').
- Si la URL NO trae utm_* y hay unos guardados de hace menos de 7 días, los vuelve
  a poner en la URL (history.replaceState), así todos los contadores y el pedido
  los leen como siempre.
- Si no hay nada que recuperar, marca el origen en utm_source:
  "sin_utm_fbclic" (llegó con fbclid = clic en algo de Facebook/Instagram),
  "sin_utm_<dominio que lo mandó>" o "sin_utm_directo". utm_campaign queda vacío.
Idempotente: reemplaza el bloque entre marcadores.
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
SALTAR = {"bienestarintimo", "pedido-intimo"}  # kit íntimo: otro hilo
INI, FIN = "<!-- UTM:INI -->", "<!-- UTM:FIN -->"

JS = INI + r"""<script>(function(){try{
var K=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id'],D=7*864e5;
var u=new URL(location.href),q=u.searchParams,tiene=K.some(function(k){return q.get(k);});
var g=null;try{g=JSON.parse(localStorage.getItem('ep_utm')||'null');}catch(e){}
if(tiene){var o={t:Date.now(),p:{}};K.forEach(function(k){var v=q.get(k);if(v)o.p[k]=v;});
 if(/^sin_utm/.test(o.p.utm_source||'')||/_recordado$/.test(o.p.utm_medium||''))return;try{localStorage.setItem('ep_utm',JSON.stringify(o));}catch(e){}return;}
if(g&&g.p&&Date.now()-g.t<D){Object.keys(g.p).forEach(function(k){q.set(k,g.p[k]);});q.set('utm_medium',(g.p.utm_medium||'paid')+'_recordado');}
else{var r='';try{r=document.referrer?new URL(document.referrer).hostname.replace(/^www\./,''):'';}catch(e){}
 if(r===location.hostname)r='';q.set('utm_source',q.get('fbclid')?'sin_utm_fbclic':(r?'sin_utm_'+r.slice(0,40):'sin_utm_directo'));}
history.replaceState(history.state,'',u.pathname+'?'+q.toString()+u.hash);
}catch(e){}})();</script>""" + FIN


def aplicar(html: str) -> str:
    html = re.sub(re.escape(INI) + r".*?" + re.escape(FIN), "", html, flags=re.S)
    m = re.search(r"<head[^>]*>", html, flags=re.I)
    if not m:
        return html
    return html[:m.end()] + JS + html[m.end():]


if __name__ == "__main__":
    for p in sorted(PUB.glob("*.html")):
        if p.stem in SALTAR:
            continue
        s = p.read_text(encoding="utf-8")
        n = aplicar(s)
        if n != s:
            p.write_text(n, encoding="utf-8")
            print("UTM:", p.name)
