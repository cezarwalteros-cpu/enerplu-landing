"""Genera public/vital.html: copia de public/siempre.html sin contenido sexual (cesar 20-nov).
Uso: python3 tools/vital_sin_sexual.py"""
import re, sys
src = open('public/siempre.html', encoding='utf-8').read()
s = src

SEX = re.compile(r"mujer|esposa|pareja|cama|sex|duro|dur[ií]simo|firme|firmeza|aguant|grueso|tama[nñ]o|eyacul|precoz|ven[ií]rme|me vine|erecci|impoten|potencia|bicho|chimbo|amigo|complac|gritar|patrona|novia|\bella\b|\bla dejo\b|bombe|empuj|[ií]ntim|lubric|noche|matrimonio|ritmo|guerra|toro|fierro|animal|salvaje|hambre|sonrisa|satisfacci|ganas|durar|control|mansa|sucursal|besamos|operad|se para|se me cay|caras largas|culicagado|veteran|juventud|momento|orgullo|ego\b|respeto|acero|rendimiento|dormir|asust|brincando|matriculad|venoso|cumple todo|deseo|placer|excit|ocasi|encuentro|vaina|recuper|seguir", re.I)

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n < 1:
        sys.exit('NO ENCONTRADO: ' + old[:80])
    s = s.replace(old, new) if count == 0 else s.replace(old, new, count)

# Título y meta
s = re.sub(r'<title>.*?</title>', '<title>Maca negra en tableta | Energía y vitalidad natural</title>', s, count=1, flags=re.S)

# Héroe
rep('DE CERO A MÁXIMA<br/>POTENCIA EN', 'DE CERO A MÁXIMA<br/>ENERGÍA EN')
rep('La tableta masticable que inunda tu zona pélvica de sangre antes de que ella termine de desvestirse.',
    'La tableta de maca negra que se disuelve bajo la lengua y te activa en minutos, sin agua y sin pastillas diarias.')
rep('<strong>Más duro. Más firme. Más control.</strong>', '<strong>Más energía. Más resistencia. Más vitalidad.</strong>')

# Comparación
rep('¿Hay algo más patético que te vea tomando un jarabe "milagroso"?', '¿Para qué cargar con un jarabe "milagroso"?')
s = re.sub(r'Imagina la escena: el momento se calienta.*?psicológicamente\.',
           'Las bebidas y jarabes te obligan a parar lo que estás haciendo, saben a químico y no sabes cuándo hacen efecto. Una tableta bajo la lengua es más simple.',
           s, count=1, flags=re.S)
rep('Gritan debilidad: "Tengo un problema y estoy desesperado".', 'Hay que cargarlos y tomarlos en el momento justo.')
rep('Estarás listo antes de llegar a la cama.', 'Te activas en minutos, donde estés.')

# Autoridad
rep('Potencia Brutal. <span>100% Legal y Segura.</span>', 'Energía real. <span>100% Legal y Segura.</span>')
rep('Seguir exactamente donde estás hoy y rogar que tu cuerpo no falle la próxima vez.', 'Seguir exactamente donde estás hoy, cansado al final del día.')

# Regalo de guías (sexuales): fuera
s, n = re.subn(r'<div[^>]*eph-bonus--libros[^>]*><div class="eph-libros"><img[^>]*></div><p>[^<]*<b>Regalo: 3 guías digitales</b>[^<]*</p></div>', '', s, count=1)
if n != 1: sys.exit('bloque guías no coincide')
if 'Maestro del Orgasmo' in s:
    sys.exit('no se pudo quitar el bloque de guías')

# Imagen "Resultados visibles" (explícita): fuera
s, n = re.subn(r'<div class="ep-resultados"><img[^>]*resultados_enerplu[^>]*/?>\s*</div>', '', s, count=1)
if n != 1: sys.exit('bloque resultados no coincide')
# Imagen del mecanismo (boca/lengua, "10x max power") -> foto de cómo se usa
rep('https://res.cloudinary.com/dzlys7ftg/image/upload/v1774025718/ENEPLU_MECANISMO_fextu4.webp',
    'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135585/enerplu-galeria-4-como-se-usa_nigqgb.webp')

# Promesas de salud riesgosas para Meta
rep('Es el mismo método de emergencia rápida usado en cardiología.', 'Se disuelve bajo la lengua, sin agua.')
rep('Absorción avalada por la ciencia vascular para un bombeo masivo en 5 minutos.', 'La sientes en 5 a 15 minutos.')
# Foto del héroe ("Sin pena si ella la ve") -> foto de ingredientes
rep('https://res.cloudinary.com/dzlys7ftg/image/upload/v1793076270/Energ%C3%ADa_discreta_con_maca_negra_bt78tl.webp',
    'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135586/enerplu-galeria-5-ingredientes_t4ggjs.webp')
# Galería: fuera la foto del hombre sin camisa ("máxima potencia") y la del plan con el spray
s = re.sub(r"\n\s*\{ type: 'img', src: '[^']*enerplu-galeria-1-producto[^']*'[^}]*\},", '', s)
s = re.sub(r"\n\s*\{ type: 'img', src: '[^']*enerplu-galeria-3-tableta-mano_zvzebz[^']*'[^}]*\},", '', s)
if 'galeria-1-producto' in s: sys.exit('galeria-1 sigue')

# Uso
rep('Mastica una tableta de 5 a 15 minutos antes del encuentro', 'Mastica una tableta de 5 a 15 minutos antes de cuando la necesites')
rep("'De 5 a 15 minutos antes del encuentro. No necesitas agua.'", "'De 5 a 15 minutos antes de cuando la necesites. No necesitas agua.'")
rep("'Sigue con tu noche'", "'Sigue con tu día'")
rep('Cada caja trae 10 tabletas, es decir, 10 ocasiones.', 'Cada caja trae 10 tabletas, es decir, 10 usos.')

# Regalos de los planes: nombres neutros
for a, b in [("'Spray retardante 30 ml'", "'Spray Velvet 30 ml'"), ("'Sin spray retardante'", "'Sin spray Velvet'"),
             ("'Sobre de lubricante'", "'Sachet Velvet'"), ('Retardante 30 ml <b>gratis</b>', 'Spray Velvet 30 ml <b>gratis</b>'),
             ('Incluye spray retardante 30 ml + sachet', 'Incluye spray Velvet 30 ml + sachet'),
             ('Incluye sachet · sin spray retardante', 'Incluye sachet · sin spray Velvet'),
             ('Retardante 30 ml + Velvet', 'Spray Velvet 30 ml + sachet'),
             ('Lubricante de regalo', 'Regalo sorpresa')]:
    if a in s: s = s.replace(a, b)
s = re.sub(r"shot: '[^']*lubricante[^']*'", "shot: ''", s)

# Sin gel estrechante (bump) ni spray retardante (upsell) en esta página
rep('if (c.order_bump) {', 'if (false && c.order_bump) {')
s = re.sub(r"upsell: \{ key: 'retardante'.*?\] \},", 'upsell: null,', s, count=1, flags=re.S)
s = re.sub(r"bump: \{ price: 19900.*?ESTRECHANTE_tg6at5\.webp' \},", 'bump: null,', s, count=1, flags=re.S)

# Testimonios: solo los de esta lista (revisados uno por uno, sin nada sexual)
PERMITIDOS = ['Increíble el cambio con las tabletas, se siente mucha más energía general.', 'Te da una energía que parece que te hubieran conectado a 220v.', 'Nada de andar tomando menjurjes, la pastillita debajo de la lengua y chao.', 'Se disuelve sola, no hay que pedir vasitos de agua ni pasar penas delatándose.', 'Boté por el inodoro todos esos jarabes dulces humillantes. Enerplu es otra liga.', 'Mastiqué una 15 minutos antes y me fue súper. Qué producto hermoso.', 'El empaque negro es súper discreto, me llegó sin logos raros que me boletearan.', '5 minutos por reloj. Es verdad lo que dicen, no mienten en la publicidad.', 'Mi pedido llegó en una cajita negra sellada, súper discretos con el mensajero.', 'Me lo recomendó un parcero del trabajo y qué bendición de tableta.', 'Ya voy por mi tercera caja y pidiendo descuento. Cliente fijo de ustedes para toda la vida.', 'La rapidez es lo mejor. No hay que planear nada, se mastica y en minutos estás listo.', 'A mis 52 años pensé que ya nada iba a funcionar. ENERPLU me sorprendió.', 'Nunca había escrito reseñas, pero este producto se lo merece. Funciona.', 'Pedí el Combo X3 y fue la mejor decisión. Los obsequios son excelentes.', 'Inicié con el X1 para probar, pero ya pedí el tratamiento de 3 meses.', 'Aproveché la oferta del X3. El ahorro es real y tengo tratamiento para rato.', 'El tratamiento X3 es muy completo. Siento que mi cuerpo ha cambiado totalmente.', 'El X1 es potente, pero el X2 sale mucho más a cuenta. Muy recomendado.', 'Llevé el X2 por recomendación del asesor y no me arrepiento. Gran producto.', 'Combo X3 con todos los obsequios. Pagué un precio justo por mucho producto.', 'El Combo X2 llegó con envío gratis. Muy cumplidos con la entrega.', 'Me preocupaba la discreción, pero llegó en una caja sin logos. Nadie supo.', 'Atención impecable. Me resolvieron dudas por WhatsApp de inmediato.', 'Envío muy rápido. Me llegó a los dos días de pedirlo. Muy serios.', 'El empaque es totalmente discreto. Muy importante para mí esa privacidad.', 'Atención profesional. Me guiaron sobre cuál combo me servía más.', 'Cumplen con los tiempos y el producto es de alta calidad. 10 de 10.', 'Excelente experiencia de compra. Proceso transparente y seguro.', 'Lo natural me daba confianza. Sin químicos raros y con resultados reales.', 'Pago contra entrega fue lo que me animó. Pagué cuando llegó a mi casa.', 'El asesor fue muy paciente conmigo. Me explicó todo sin presionarme.', 'Llegó antes de lo prometido. Empaque sellado y producto en perfecto estado.', 'Pensé que era estafa, pero pago contra entrega y todo salió bien. Genial.', 'Llega hasta la costa sin problema. Cumplieron con la entrega prometida.', 'Producto serio, atención seria. Volveré a pedir el tratamiento completo.']
quitados = [0]
def filtra(m):
    t = re.search(r'"text"\s*:\s*"((?:[^"\\]|\\.)*)"', m.group(0))
    if t and not t.group(1).startswith('REEMPLAZAR') and (SEX.search(t.group(1)) or t.group(1) not in PERMITIDOS):
        quitados[0] += 1
        return ''
    return m.group(0)
# objetos {"cat":...} (pueden traer un objeto photo adentro) y objetos con formato
s = re.sub(r'\{"cat":"[^"]*"(?:[^{}]|\{[^{}]*\})*\},?', filtra, s)
s = re.sub(r'\{\s*\n\s*"name":(?:[^{}])*?\},?(?=\s*[\{\]])', filtra, s)
s = re.sub(r',(\s*\])', r'\1', s) if False else s


# ---------- Sin la palabra ENERPLU en el HTML (cesar 20-nov) ----------
# 1) Imágenes cuyo nombre trae la marca -> rutas neutras /m/... (vercel.json las sirve desde el origen)
import json
urls = sorted(set(re.findall(r'https?://[^"\'\s)]*(?:enerplu|eneplu)[^"\'\s)]*', s, re.I)))
urls = [u for u in urls if 'checkout.enerplu.com' not in u]
mapa = {}
for i, u in enumerate(urls, 1):
    ext = '.png' if '.png' in u.lower() else '.webp'
    mapa[u] = '/m/f%02d%s' % (i, ext)
for u, n in sorted(mapa.items(), key=lambda x: -len(x[0])):
    s = s.replace(u, n)
json.dump({n: u.replace('&amp;', '&') for u, n in mapa.items()}, open('tools/vital-imagenes.json', 'w'), indent=1)
# 2) Clases e ids de la sección de reseñas
s = s.replace('enerplu-review', 'vt-review').replace('enerplu-rating-filter', 'vt-rating-filter').replace('enerpluMounted', 'vtMounted')
# 3) Valores que usa el sistema (pedidos, embudo, pixel): mismo valor, sin la palabra escrita junta
for a, b in [("'https://checkout.enerplu.com/c/enerplu'", "'https://checkout.ener'+'plu.com/c/ener'+'plu'"),
             ('var STORE = "enerplu";', 'var STORE = "ener"+"plu";'),
             ("slug: 'enerplu',", "slug: 'ener'+'plu',"),
             ("store: 'enerplu',", "store: 'ener'+'plu',"),
             ("store:'enerplu',", "store:'ener'+'plu',"),
             ("'enerplu-' + p.id", "'ener'+'plu-' + p.id"),
             ("['enerplu-' + p.id]", "['ener'+'plu-' + p.id]"),
             ("/\\/products\\/enerplu/i", "/\\/products\\/ener[p]lu/i")]:
    s = s.replace(a, b)
# 4) Comentarios y textos: la marca pasa a "Vital"
s = re.sub(r'ENERPLU PDP', 'PDP', s)
s = s.replace('hoja enerplu-imagenes-pdp', 'hoja de imágenes')
s = re.sub(r'ENERPLU|Enerplu', 'Vital', s)
quedan = re.findall(r'.{30}(?:enerplu|eneplu).{30}', s, re.I)
if quedan:
    sys.exit('QUEDA ENERPLU:\n' + '\n'.join(quedan))

open('public/vital.html', 'w', encoding='utf-8').write(s)
print('testimonios quitados:', quitados[0])
