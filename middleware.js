// E-08 (cesar 2026-11-15 8:02 pm, "listo de 3"): reparto en el servidor, sin redirección ni código extra en el celular.
// Un tercio ve la página de siempre (A), un tercio /pro (B) y un tercio /nueva (C), venga de donde venga:
// pedido.enerplu.com/ y /nueva, losgomosos.lat/ /products/* /collections/*. Fijo por persona con la cookie ep_e08 (30 días).
// ?ab8=A|B|C fuerza la variante (pruebas). Antes de INICIO no hace nada. Para apagarla: ACTIVA = false (o borrar este archivo).
const ACTIVA = true;
const INICIO = Date.parse('2026-11-16T05:00:00Z'); // 12:00 am Bogotá (cesar 15-11 11:03 pm)
const DESTINO = { A: '/siempre', B: '/pro', C: '/nueva' };
const HOSTS = ['pedido.enerplu.com', 'losgomosos.lat', 'www.losgomosos.lat'];

export const config = { matcher: ['/', '/nueva', '/products/:path*', '/collections/:path*'] };

const sigue = () => new Response(null, { headers: { 'x-middleware-next': '1' } });

export default function middleware(request) {
  try {
    if (!ACTIVA) return sigue();
    const url = new URL(request.url);
    const host = url.hostname;
    const prueba = host.endsWith('.vercel.app');           // vistas previas: solo con ?ab8=
    if (!prueba && !HOSTS.includes(host)) return sigue();
    const forzada = (url.searchParams.get('ab8') || '').toUpperCase();
    if (!DESTINO[forzada] && (prueba || Date.now() < INICIO)) return sigue();
    const ck = (request.headers.get('cookie') || '').match(/(?:^|;\s*)ep_e08=([ABC])/);
    const v = DESTINO[forzada] ? forzada : (ck ? ck[1] : 'ABC'[Math.floor(Math.random() * 3)]);
    const destino = new URL(DESTINO[v] + url.search, url);
    const h = new Headers({ 'x-middleware-rewrite': destino.toString() });
    if (!ck || ck[1] !== v) h.append('set-cookie', `ep_e08=${v}; Path=/; Max-Age=2592000; SameSite=Lax; Secure`);
    return new Response(null, { headers: h });
  } catch (e) {
    return sigue();
  }
}
