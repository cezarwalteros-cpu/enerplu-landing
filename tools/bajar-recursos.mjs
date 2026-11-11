// Se ejecuta en cada build de Vercel (buildCommand en vercel.json).
// Copia a nuestro propio servidor las imágenes de cdn.shopify.com y la hoja de estilos y fuentes de losgomosos.lat
// que usan las páginas, y cambia los enlaces en public/*.html para que apunten a la copia local.
// Si un archivo no se puede bajar, se deja el enlace original: el build nunca falla por esto.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, extname, basename } from 'node:path';

const PUB = new URL('../public/', import.meta.url).pathname;
const MIRROR = process.env.BAJAR_MIRROR || ''; // solo para pruebas locales: http://localhost:9999
const RE = /(?:https?:)?\/\/(?:cdn\.shopify\.com\/s\/files|losgomosos\.lat\/cdn\/(?:shop|fonts))\/[^"'\s)\\<>,]+/g;
const TIPOS = { '.css': 'css', '.woff2': 'fonts', '.woff': 'fonts' };

const pages = readdirSync(PUB).filter(f => f.endsWith('.html'));
const htmls = Object.fromEntries(pages.map(f => [f, readFileSync(join(PUB, f), 'utf8')]));
const urls = new Set();
for (const s of Object.values(htmls)) for (const m of s.matchAll(RE)) if (!m[0].endsWith('/')) urls.add(m[0]);

function absUrl(u) { return (u.startsWith('//') ? 'https:' + u : u).replace(/&amp;/g, '&'); }
function localPath(u) {
  const a = new URL(absUrl(u));
  const ext = extname(a.pathname).toLowerCase() || '.bin';
  const dir = TIPOS[ext] || 'img';
  const name = basename(a.pathname, extname(a.pathname)).replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 60);
  const h = createHash('sha1').update(a.href).digest('hex').slice(0, 8);
  return `/rec/${dir}/${name}-${h}${ext}`;
}

async function bajar(u) {
  const a = absUrl(u);
  const src = MIRROR ? MIRROR + new URL(a).pathname + new URL(a).search : a;
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(src, { signal: ctl.signal, headers: { 'user-agent': 'Mozilla/5.0 (build enerplu)' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const ct = r.headers.get('content-type') || '';
    if (/text\/html/.test(ct)) throw new Error('html');
    let buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length) throw new Error('vacío');
    const lp = localPath(u);
    if (lp.endsWith('.css')) {
      // url() relativas dentro del CSS deben seguir apuntando al sitio original
      const base = new URL(a);
      buf = Buffer.from(buf.toString('utf8').replace(/url\((['"]?)(?!data:|https?:|\/\/|#)([^'")]+)\1\)/g,
        (m, q, p) => `url(${q}${new URL(p, base).href}${q})`));
    }
    mkdirSync(join(PUB, lp, '..'), { recursive: true });
    writeFileSync(join(PUB, lp), buf);
    return [u, lp, buf.length];
  } catch (e) { return [u, null, String(e.message || e)]; }
  finally { clearTimeout(t); }
}

const lista = [...urls]; const res = [];
for (let i = 0; i < lista.length; i += 8) res.push(...await Promise.all(lista.slice(i, i + 8).map(bajar)));
const ok = res.filter(r => r[1]); const mal = res.filter(r => !r[1]);
const mapa = new Map(ok.map(r => [r[0], r[1]]));

for (const f of pages) {
  let s = htmls[f];
  s = s.replace(RE, m => mapa.get(m) || m);
  // sin recursos pendientes de esos dominios, el preconnect sobra
  for (const host of ['losgomosos.lat', 'cdn.shopify.com']) {
    const re = new RegExp(`//${host.replace('.', '\\.')}/(?:cdn|s/files)/`);
    if (!re.test(s)) s = s.replace(new RegExp(`<link rel="preconnect" href="https://${host.replace('.', '\\.')}"[^>]*>\\n?`), '');
  }
  if (s !== htmls[f]) writeFileSync(join(PUB, f), s);
}
const kb = Math.round(ok.reduce((a, r) => a + r[2], 0) / 1024);
console.log(`[bajar-recursos] ${ok.length}/${lista.length} archivos copiados (${kb} KB) en ${pages.length} páginas`);
for (const r of mal) console.log(`[bajar-recursos] sin copiar (se deja el original): ${r[0]} -> ${r[2]}`);
