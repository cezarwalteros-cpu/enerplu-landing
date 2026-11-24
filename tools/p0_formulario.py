"""P0 del formulario de ENERPLU (cesar 23-nov, "arreglar errores de todos los checkouts").

Aplica los mismos cambios a fuente/formulario/app.js y a cada página de public/ que lleva ese formulario incrustado
(index, siempre, pedido, producto, vital, tienda, oferta-a, checkout-blanco, octubre, ofertas...), y a la versión B (E-10).
  1. Un solo nombre basta: el apellido ya no bloquea el pedido.
  2. Celular: mensajes exactos (incompleto / inválido). El campo ya aceptaba +57, espacios y guiones.
  3-5. Al tocar el botón con datos faltantes: aviso junto al botón ("Te falta tu celular y tu ciudad"), el foco va al
       primer campo dentro del mismo toque, y el aviso se actualiza al corregir.
  6. Ciudad: "Selecciona tu ciudad de la lista".
  7. Lo escrito se guarda en la pestaña y vuelve si la página se recarga.
  8. Clave de idempotencia en cada pedido (la misma en los reintentos).
  9. Mensajes exactos de error de servidor y de conexión; sin número de pedido no hay éxito.
Uso: python3 tools/p0_formulario.py   (idempotente: si ya está aplicado no cambia nada)
"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
R = [
# 1 nombre / 2 celular / 6 ciudad / dirección
("""      if (name === 'first_name') return v('first_name').length < 2 ? 'Escribe tu nombre' : '';
      if (name === 'last_name') return v('last_name').length < 2 ? 'Escribe tu apellido' : '';
      if (name === 'phone') { var p = this.phone(); if (!this.validPhone(p)) return p.length && p.charAt(0) !== '3' ? 'Debe ser un celular (empieza por 3). Por ahí te confirmamos el pedido' : (p.length ? 'Te faltan ' + (10 - p.length) + ' números: el celular tiene 10 dígitos' : 'Escribe tu celular (10 dígitos, empieza por 3)'); return this.st.phoneMsg || ''; }
      if (name === 'city') { if (!this.st.city) return !v('city') ? 'Escribe tu ciudad o municipio' : this.cityAmbiguous ? 'Hay varios municipios con ese nombre: toca el tuyo en la lista' : this.cityFuzzy ?""",
 """      /* P0 (cesar 23-11): un solo nombre basta, el apellido ya no bloquea el pedido. Mensajes exactos de cesar. */
      if (name === 'first_name') return /[A-Za-zÀ-ÿ]{2}/.test(v('first_name')) ? '' : 'Escribe tu nombre para recibir el pedido';
      if (name === 'last_name') return '';
      if (name === 'phone') { var p = this.phone(); if (!this.validPhone(p)) return p.length < 10 ? 'Ingresa los 10 dígitos de tu celular' : 'Revisa tu número de celular colombiano'; return this.st.phoneMsg || ''; }
      if (name === 'city') { if (!this.st.city) return !v('city') ? 'Selecciona tu ciudad de la lista' : this.cityAmbiguous ? 'Selecciona tu ciudad de la lista' : this.cityFuzzy ?"""),
("""      if (name === 'address1') return v('address1').length < 5 ? 'Escribe la dirección o el punto de entrega' : '';""",
 """      if (name === 'address1') return v('address1').length < 5 ? 'Escribe la dirección donde recibirás tu pedido' : '';"""),
("""          else if (self.touched.phone) self.err('phone', ph.length >= 10 ? 'El celular debe empezar por 3' : '');""",
 """          else if (self.touched.phone) self.err('phone', ph.length >= 10 ? 'Revisa tu número de celular colombiano' : '');"""),
# 3-5 aviso junto al botón + foco en el mismo toque; 7 borrador
("""      f.addEventListener('submit', function (e) { e.preventDefault(); self.submit(); });
    },
    formError: function (msg) { var b = qs('[data-ep-form-error]', this.form); if (b) { b.textContent = msg || ''; b.hidden = !msg; } },""",
 """      f.addEventListener('submit', function (e) { e.preventDefault(); self.submit(); });
      /* P0: el aviso de "Te falta…" se actualiza al corregir, y lo escrito queda guardado en la pestaña */
      f.addEventListener('input', function () {
        if (self.missShown) self.missMsg(self.fields.filter(function (n) { return !!self.check(n); }));
        clearTimeout(self.fdTimer); self.fdTimer = setTimeout(function () { self.formDraftSave(); }, 300);
      });
      this.formDraftLoad();
    },
    formError: function (msg) { this.missShown = false; var b = qs('[data-ep-form-error]', this.form); if (b) { b.textContent = msg || ''; b.hidden = !msg; } },
    /* aviso junto al botón: todo toque en "Confirmar mi pedido" deja una reacción visible */
    missMsg: function (bad) {
      var L = { first_name: 'tu nombre', phone: 'tu celular', city: 'tu ciudad', address1: 'tu dirección', email: 'tu correo', document: 'tu cédula' };
      if (!bad.length) { if (this.missShown) this.formError(''); return; }
      var n = bad.map(function (k) { return L[k] || k; });
      this.formError(bad.length >= 4 ? 'Completa tus datos de envío para hacer el pedido.' : 'Te falta ' + (n.length > 1 ? n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1] : n[0]) + '.');
      this.missShown = true;
    },
    /* P0 #7: lo escrito se guarda en la pestaña (no el plan) y vuelve si la página se recarga; se borra con el pedido hecho */
    formDraftSave: function () {
      if (this.done) return;
      var self = this, d = { city: this.st.city, cityLabel: this.cityLabel || '', v: {} };
      this.fields.forEach(function (n) { var e = self.el(n); if (e) d.v[n] = String(e.value || ''); });
      try { sessionStorage.setItem('ep_form_draft', JSON.stringify(d)); } catch (e) {}
    },
    formDraftLoad: function () {
      var d = null; try { d = JSON.parse(sessionStorage.getItem('ep_form_draft') || 'null'); } catch (e) {}
      if (!d || !d.v) return;
      var self = this, any = false;
      Object.keys(d.v).forEach(function (n) { var e = self.el(n); if (e && d.v[n] && !String(e.value || '').trim()) { e.value = d.v[n]; any = true; } });
      if (d.city && d.city.municipio && d.cityLabel && this.el('city') && this.el('city').value === d.cityLabel) { this.st.city = d.city; this.cityLabel = d.cityLabel; try { this.cityShow(); this.payMode(); } catch (e) {} }
      if (any) try { this.paint(); } catch (e) {}
    },
    idem: function () {
      var k = null; try { k = sessionStorage.getItem('ep_idem'); } catch (e) {}
      if (!k) { k = this.idemK || ''; }
      if (!k) { try { k = global.crypto && crypto.randomUUID ? crypto.randomUUID() : ''; } catch (e) {} if (!k) k = 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12); this.idemK = k; try { sessionStorage.setItem('ep_idem', k); } catch (e) {} }
      return k;
    },
    idemNew: function () { this.idemK = ''; try { sessionStorage.removeItem('ep_idem'); sessionStorage.removeItem('ep_form_draft'); } catch (e) {} },"""),
("""        var first = this.el(bad[0]); if (first) { first.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); } }, reduce ? 0 : 350); }
        return;
      }
      var up = C.checkout.upsell;""",
 """        this.missMsg(bad);
        /* el foco va dentro del mismo toque (así el celular abre el teclado, también en Facebook / Instagram) */
        var first = this.el(bad[0]); if (first) { try { first.focus({ preventScroll: true }); } catch (e) { try { first.focus(); } catch (e2) {} } try { first.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); } catch (e) { try { first.scrollIntoView(); } catch (e2) {} } }
        return;
      }
      var up = C.checkout.upsell;"""),
# 8 clave de idempotencia
("""        payment_method: this.method(), tracking: this.tracking()
      };
      var cp = this.coupon(); if (cp && !cp.demo) body.coupon_code = cp.code;""",
 """        payment_method: this.method(), tracking: this.tracking(), idempotency_key: this.idem()
      };
      var cp = this.coupon(); if (cp && !cp.demo) body.coupon_code = cp.code;"""),
# 9 errores
("""        if (r.ok && j.success) { self.success(j, body); return; }
        var map = j.fields || {}, shown = false;""",
 """        if (r.ok && j.success && !j.order_number) { self.formError('No pudimos registrar tu pedido. Inténtalo nuevamente.'); track('OrderError', { status: r.status, fields: 'sin_numero' }); return; }
        if (r.ok && j.success) { self.idemNew(); self.success(j, body); return; }
        var map = j.fields || {}, shown = false;"""),
("""        self.formError(shown ? 'Revisa los datos marcados en rojo.' : (j.error || 'No pudimos registrar tu pedido. Intenta de nuevo.'));""",
 """        self.formError(shown ? 'Revisa los datos marcados en rojo.' : (j.error || 'No pudimos registrar tu pedido. Inténtalo nuevamente.'));"""),
("""        self.formError('No pudimos enviar tu pedido. Revisa tu conexión y toca el botón otra vez.');
        track('OrderError', { status: 0 });""",
 """        self.formDraftSave();
        self.formError('No pudimos enviar el pedido. Tus datos siguen guardados. Intenta nuevamente.');
        track('OrderError', { status: 0 });"""),
]
# Versión B (E-10, nombre completo en un campo): el error del nombre ya no depende del apellido
RB = [
# borrador en la versión B: si el nombre ya venía guardado, se muestra en "Nombre completo" en vez de borrarse
("      var p=String(nom.value||'').trim().split(/\\s+/).filter(Boolean), cut=p.length>=4?2:1;",
 "      if(!String(nom.value||'').trim()&&first.value){nom.value=(first.value+' '+last.value).trim();return;}\n      var p=String(nom.value||'').trim().split(/\\s+/).filter(Boolean), cut=p.length>=4?2:1;"),
("      setTimeout(function(){try{city.focus()}catch(e){}},50);\n    }",
 "      if(val!==false)setTimeout(function(){try{city.focus()}catch(e){}},50);\n    }\n    /* recarga con datos guardados: se muestran el nombre y la ciudad que ya había escrito */\n    setTimeout(function(){repartir(); if(city.value&&!dep.value)verTexto(false);},900);"),
("      if(val!=null){city.value=val; ev(city,'input');}", "      if(val!=null&&val!==false){city.value=val; ev(city,'input');}"),
("if(!nerr.hidden&&first.value.length>=2&&last.value.length>=2){", "if(!nerr.hidden&&first.value.length>=2){"),
("else if(e2&&!e2.hidden&&e2.textContent)t='Escribe tu nombre y apellido';", "else if(e2&&!e2.hidden&&e2.textContent)t='Escribe tu nombre para recibir el pedido';"),
]

archivos = [ROOT / "fuente" / "formulario" / "app.js", ROOT / "tools" / "form_ciudad.py"] + [f for f in sorted((ROOT / "public").glob("*.html")) if f.name != "maqueta-b.html"]  # maqueta-b: maqueta vieja, sin tráfico
falta = 0
for f in archivos:
    s = f.read_text(encoding="utf-8"); o = s; notas = []
    tiene_form = "if (name === 'first_name')" in s
    if tiene_form:
        for i, (a, b) in enumerate(R):
            if a in s: s = s.replace(a, b)
            elif b not in s: notas.append(f"R{i} no encontrado"); falta += 1
    for a, b in RB:
        if a in s: s = s.replace(a, b)
    if s != o: f.write_text(s, encoding="utf-8")
    if tiene_form or s != o: print(("ok  " if not notas else "OJO ") + str(f.relative_to(ROOT)), "; ".join(notas))
sys.exit(1 if falta else 0)
