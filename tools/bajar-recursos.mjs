// Se ejecuta en cada build de Vercel (buildCommand en vercel.json).
// Copia a nuestro propio servidor las imágenes de cdn.shopify.com y la hoja de estilos y fuentes de losgomosos.lat
// que usan las páginas, y cambia los enlaces en public/*.html para que apunten a la copia local.
// Si un archivo no se puede bajar, se deja el enlace original: el build nunca falla por esto.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, extname, basename } from 'node:path';

const PUB = new URL('../public/', import.meta.url).pathname;
// Copias permanentes (cesar 2026-11-14: "migrar esas imágenes a un lugar seguro que no sea Shopify"):
// rec-mapa.json dice qué archivo de public/rec/ (guardado en el repo) corresponde a cada enlace. Si existe, no se baja nada.
const MAPA_FIJO = new URL('./rec-mapa.json', import.meta.url).pathname;
const fijo = existsSync(MAPA_FIJO) ? JSON.parse(readFileSync(MAPA_FIJO, 'utf8')) : {};
const GUARDAR = process.env.GUARDAR_REC === '1'; // solo el workflow vendor-recursos: guarda el mapa actualizado
const MIRROR = process.env.BAJAR_MIRROR || ''; // solo para pruebas locales: http://localhost:9999
const RE = /(?:https?:)?\/\/(?:cdn\.shopify\.com\/s\/files|(?:www\.)?losgomosos\.lat\/cdn\/(?:shop|fonts))\/[^"'\s)\\<>,]+/g;
const TIPOS = { '.css': 'css', '.woff2': 'fonts', '.woff': 'fonts' };
// Cloudinary (cesar 2026-11-24: "no depender de Cloudinary"): las imágenes de res.cloudinary.com también se copian a public/rec/cl/.
// Cada imagen queda además en los anchos que antes generaba Cloudinary (w_N/f_auto/q_auto), como <archivo>.wN.<ext>;
// R.cdn (fuente/formulario/app.js) pide esos archivos cuando la imagen ya es local.
const RE_CL = /https:\/\/res\.cloudinary\.com\/dzlys7ftg\/image\/upload\/[^"'\s)\\<>]+?\.(?:webp|jpe?g|png|avif|gif)(?=["'\s)\\<>,&]|$)/g;
const ANCHOS_CL = [120, 160, 200, 540, 600, 720, 800, 1080];
const esCL = u => u.startsWith('https://res.cloudinary.com/');
function partesCL(u) {
  const seg = u.split('/upload/')[1].split('/');
  const iv = seg.findIndex(x => /^v\d+$/.test(x));
  let tr = seg.slice(0, Math.max(iv, 0)).join('/');
  const resto = seg.slice(Math.max(iv, 0)).join('/');
  const m = tr.match(/^w_(\d+)\/f_auto\/q_auto(?:\/|$)/);
  const ancho = m ? Number(m[1]) : 0;
  if (m) tr = tr.slice(m[0].length);
  return { tr, resto, ancho, base: u.split('/upload/')[0] + '/upload/' + (tr ? tr + '/' : '') + resto };
}
function localCL(u) {
  const { tr, resto, ancho } = partesCL(u);
  const ext = extname(resto).toLowerCase();
  const name = decodeURIComponent(basename(resto, extname(resto))).normalize('NFD').replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 60);
  const h = createHash('sha1').update(tr + '/' + resto).digest('hex').slice(0, 8);
  return `/rec/cl/${name}-${h}${ancho ? '.w' + ancho : ''}${ext}`;
}
const varianteCL = (b, w) => b.replace('/upload/', `/upload/w_${w}/f_auto/q_auto/`);

const pages = readdirSync(PUB, { recursive: true }).map(String).filter(f => f.endsWith('.html') && !f.startsWith('rec'));   // también subcarpetas (public/guias/...)
const htmls = Object.fromEntries(pages.map(f => [f, readFileSync(join(PUB, f), 'utf8')]));
const urls = new Set();
for (const s of Object.values(htmls)) for (const m of s.matchAll(RE)) if (!m[0].endsWith('/')) urls.add(m[0]);
const basesCL = new Set();
for (const s of Object.values(htmls)) for (const m of s.matchAll(RE_CL)) { urls.add(m[0]); basesCL.add(partesCL(m[0]).base); }
for (const b of basesCL) { urls.add(b); for (const w of ANCHOS_CL) urls.add(varianteCL(b, w)); }

// losgomosos.lat pasa a Vercel (cesar 2026-11-14): sus archivos se bajan directo del CDN de Shopify (tienda 74894180397)
function shopify(a) {
  return a.replace(/^https:\/\/(?:www\.)?losgomosos\.lat\/cdn\/shop\//, 'https://cdn.shopify.com/s/files/1/0748/9418/0397/')
    .replace(/^https:\/\/(?:www\.)?losgomosos\.lat\/cdn\/fonts\//, 'https://fonts.shopifycdn.com/');
}
function absUrl(u) { return shopify((u.startsWith('//') ? 'https:' + u : u).replace(/&amp;/g, '&')); }
function localPath(u) {
  if (esCL(u)) return localCL(u);
  const a = new URL(absUrl(u));
  const ext = extname(a.pathname).toLowerCase() || '.bin';
  const dir = TIPOS[ext] || 'img';
  const name = basename(a.pathname, extname(a.pathname)).replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 60);
  const h = createHash('sha1').update(a.href).digest('hex').slice(0, 8);
  return `/rec/${dir}/${name}-${h}${ext}`;
}

async function bajar(u) {
  if (fijo[u] && existsSync(join(PUB, fijo[u]))) return [u, fijo[u], 0, true];
  const a = absUrl(u);
  const src = MIRROR ? MIRROR + new URL(a).pathname + new URL(a).search : a;
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(src, { signal: ctl.signal, headers: { 'user-agent': 'Mozilla/5.0 (build enerplu)', ...(esCL(a) ? { accept: 'image/webp,image/*;q=0.8' } : {}) } });
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
// Una imagen de Cloudinary solo se cambia por la copia local si están ella y todos sus anchos; si falta alguno, se deja el enlace original.
const completaCL = b => mapa.has(b) && ANCHOS_CL.every(w => mapa.has(varianteCL(b, w)));

for (const f of pages) {
  let s = htmls[f];
  s = s.replace(RE, m => mapa.get(m) || (/losgomosos\.lat/.test(m) ? absUrl(m) : m));
  s = s.replace(RE_CL, m => (completaCL(partesCL(m).base) && mapa.get(m)) || m);
  // sin recursos pendientes de esos dominios, el preconnect sobra
  for (const host of ['losgomosos.lat', 'cdn.shopify.com']) {
    const re = new RegExp(`//${host.replace('.', '\\.')}/(?:cdn|s/files)/`);
    if (!re.test(s)) s = s.replace(new RegExp(`<link rel="preconnect" href="https://${host.replace('.', '\\.')}"[^>]*>\\n?`), '');
  }
  if (s !== htmls[f]) writeFileSync(join(PUB, f), s);
}
if (GUARDAR) writeFileSync(MAPA_FIJO, JSON.stringify({ ...fijo, ...Object.fromEntries(mapa) }, null, 1) + '\n');
const nFijo = ok.filter(r => r[3]).length;
console.log(`[bajar-recursos] ${nFijo} archivos ya guardados en el repo (sin depender de Shopify)`);
const kb = Math.round(ok.reduce((a, r) => a + r[2], 0) / 1024);
console.log(`[bajar-recursos] ${ok.length}/${lista.length} archivos copiados (${kb} KB) en ${pages.length} páginas`);
for (const r of mal) console.log(`[bajar-recursos] sin copiar (se deja el original): ${r[0]} -> ${r[2]}`);
