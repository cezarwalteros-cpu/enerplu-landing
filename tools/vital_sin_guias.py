"""public/vital.html = public/siempre.html (la página que vende) con lo mínimo quitado (cesar 20-nov):
- regalo de las 3 guías ("Maestro del Orgasmo", "Secretos Sexuales", "Genio del Sexo")
- imagen "Resultados visibles" (dice pene, erecciones, eyaculación, placer a tu pareja)
- las frases y testimonios con palabras explícitas
Todo lo demás (marca ENERPLU, fotos, ofertas, checkout) queda igual.
Uso: python3 tools/vital_sin_guias.py"""
import re, sys
s = open('public/siempre.html', encoding='utf-8').read()

s, n = re.subn(r'<div[^>]*eph-bonus--libros[^>]*><div class="eph-libros"><img[^>]*></div><p>[^<]*<b>Regalo: 3 guías digitales</b>[^<]*</p></div>', '', s, count=1)
if n != 1 or re.search(r'Orgasmo|guías digitales', s):
    sys.exit('no se pudo quitar el bloque de las guías')

s, n = re.subn(r'<div class="ep-resultados"><img[^>]*resultados_enerplu[^>]*/?>\s*</div>', '', s, count=1)
if n != 1:
    sys.exit('bloque resultados no coincide')

for a, b in [('La tableta masticable que inunda tu zona pélvica de sangre antes de que ella termine de desvestirse.',
              'La tableta masticable que te deja listo en 5 a 15 minutos, sin agua y sin planear.'),
             ('<strong>Más duro. Más firme. Más control.</strong>', '<strong>Más energía. Más firmeza. Más control.</strong>'),
             (' Esa mirada de decepción te castra psicológicamente.', ''),
             ('Absorción avalada por la ciencia vascular para un bombeo masivo en 5 minutos.', 'Absorción rápida: la sientes en 5 a 15 minutos.'),
             ('para potenciar tus encuentros', 'de regalo')]:
    if a in s:
        s = s.replace(a, b)
    elif a.startswith('La tableta') or a.startswith('<strong>'):
        sys.exit('NO ENCONTRADO: ' + a[:60])

EXPL = re.compile(r"sex|pene|eyacul|orgasm|erecci|polvo|ven[ií]rme|me vine|grueso|tama[nñ]o|chimbo|bicho|empelot|la parto|rompiendo|destroz|arrincon|gritar|brincando|caminar derecho|lubric|cremallera|amante|las dos me|se me bajaba|se me pone|se me cay|se para|tieso|de piedra|una roca|como una piedra|gatillazo|flacidez|armado|cacao|s[aá]banas|caj[oó]n|d[aá]ndole|garrote|venoso|bombe|empuj|levanta|operado|la moza|mansa|matriculad|culicagado|sildenafil|pastillita azul|actor de cine|la calle|minuticos|jornada|fierro|toro|animal|salvaje|guerra|me la puse|complac|no la dejo dormir|duro\b|dur[ií]simo|íntima|impotencia|muerto|ritmo|miembro|vara de|grosor|patrona|se va a bajar|venida|cu[aá]ndo quiere terminar|par[aá]ramos|besamos|ella me busca|sucursal|por la noche|con hambre|cama\b|la busco yo|satisfacci|viejas|temblando|a medias|mesa de noche|calentura|se me par[oó]|se te pare|afrodis|puta|mierda|macho|durar el doble|la diferencia en el|aguant", re.I)
quitados = [0]
def filtra(m):
    tx = re.search(r'"text"\s*:\s*"((?:[^"\\]|\\.)*)"', m.group(0))
    if tx and EXPL.search(tx.group(1)):
        quitados[0] += 1
        return ''
    return m.group(0)
s = re.sub(r'\{"cat":"[^"]*"(?:[^{}]|\{[^{}]*\})*\},?', filtra, s)
s = re.sub(r'\{\s*\n\s*"name":(?:[^{}])*?\},?(?=\s*[\{\]])', filtra, s)

open('public/vital.html', 'w', encoding='utf-8').write(s)
print('testimonios quitados:', quitados[0])
