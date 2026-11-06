/**
 * SEO audit of the built site (run `npm run build` first): `npm run seo:audit`.
 * Checks every HTML page in dist/ for the things search engines care about:
 *   - <title> and meta description present, sensible length, not duplicated
 *   - exactly one <h1>, a canonical URL, images with alt text
 *   - internal links that point to pages that don't exist (broken links)
 *   - orphan pages (no internal link points to them)
 *   - hreflang alternates that exist and link back (reciprocal)
 *   - noindex pages listed in the sitemap
 * Exits with code 1 if there are errors; warnings are printed but don't fail.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const SITE = (process.env.SITE_URL || 'https://saralkit.com').replace(/\/$/, '');
const SKIP_DIRS = new Set(['_astro', 'vendor', 'workers', 'i18n', 'donate', 'models']);

const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { if (!SKIP_DIRS.has(f)) walk(p); }
    else if (f.endsWith('.html')) files.push(p);
  }
})(DIST);

const urlOf = (file) => {
  const rel = '/' + path.relative(DIST, file).replace(/\\/g, '/').replace(/\.html$/, '').replace(/(^|\/)index$/, '');
  return rel === '/' ? '/' : rel.replace(/\/$/, '');
};
const exists = (p) => {
  p = decodeURIComponent(p.split('#')[0].split('?')[0]).replace(/\/$/, '') || '/';
  if (p === '/') return true;
  return fs.existsSync(path.join(DIST, p + '.html')) || fs.existsSync(path.join(DIST, p, 'index.html')) || fs.existsSync(path.join(DIST, p));
};
const redirects = new Set(
  (fs.existsSync(path.join(DIST, '_redirects')) ? fs.readFileSync(path.join(DIST, '_redirects'), 'utf8') : '')
    .split('\n').map((l) => l.trim().split(/\s+/)[0]).filter((l) => l && !l.startsWith('#')),
);
const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`, 'i'))?.[1];
const decode = (s = '') => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const errors = [], warnings = [];
const titles = new Map(), descs = new Map(), inbound = new Map(), pages = new Map();

for (const file of files) {
  const url = urlOf(file);
  const html = fs.readFileSync(file, 'utf8');
  const noindex = /<meta name="robots" content="noindex/i.test(html);
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim());
  const desc = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1]);
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  const alts = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => ({ lang: m[1], href: m[2] }));
  pages.set(url, { noindex, alts });
  if (url === '/404') continue;

  if (!title) errors.push(`${url}: missing <title>`);
  else {
    if ([...title].length > 70) warnings.push(`${url}: title is ${[...title].length} chars (Google shows ~60): "${title}"`);
    if (!noindex) titles.set(title, [...(titles.get(title) || []), url]);
  }
  if (!desc) errors.push(`${url}: missing meta description`);
  else {
    const n = [...desc].length;
    if (n < 50 || n > 180) warnings.push(`${url}: description is ${n} chars (aim for 70–160)`);
    if (!noindex) descs.set(desc, [...(descs.get(desc) || []), url]);
  }
  if (h1s !== 1) errors.push(`${url}: ${h1s} <h1> tags (expected 1)`);
  if (!canonical) errors.push(`${url}: missing canonical`);
  else if (!noindex && canonical !== SITE + url) errors.push(`${url}: canonical is ${canonical}`);
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) errors.push(`${url}: <img> without alt: ${m[0].slice(0, 80)}`);

  // Internal links (ignore the language switcher's own entries and links inside scripts).
  const body = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<textarea[\s\S]*?<\/textarea>/g, '');
  for (const m of body.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    let href = decode(m[1]);
    if (href.startsWith(SITE)) href = href.slice(SITE.length) || '/';
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    const target = (href.split('#')[0].split('?')[0].replace(/\/$/, '') || '/');
    if (/\.(xml|txt|json|png|jpg|svg|webmanifest|pdf|zip)$/.test(target)) continue;
    if (!exists(target) && !redirects.has(target)) errors.push(`${url}: broken link → ${href}`);
    if (target !== url) inbound.set(target, (inbound.get(target) || 0) + 1);
  }
}

for (const [t, urls] of titles) if (urls.length > 1) errors.push(`Duplicate title on ${urls.length} pages: "${t}" (${urls.slice(0, 4).join(', ')})`);
for (const [d, urls] of descs) if (urls.length > 1) warnings.push(`Duplicate description on ${urls.length} pages: ${urls.slice(0, 4).join(', ')}`);

// Orphans: indexable pages that nothing links to.
for (const [url, p] of pages) if (!p.noindex && url !== '/' && url !== '/404' && !inbound.get(url)) warnings.push(`${url}: orphan page (no internal links point here)`);

// hreflang: every alternate must exist and point back.
for (const [url, p] of pages) {
  for (const a of p.alts) {
    const target = a.href.slice(SITE.length) || '/';
    const back = pages.get(target);
    if (!back) { errors.push(`${url}: hreflang ${a.lang} → ${a.href} does not exist`); continue; }
    if (!back.alts.some((b) => (b.href.slice(SITE.length) || '/') === url)) errors.push(`${url}: hreflang ${a.lang} → ${target} does not link back`);
  }
}

// Sitemap must not list noindex pages.
const sm = fs.readdirSync(DIST).filter((f) => /^sitemap-\d+\.xml$/.test(f)).map((f) => fs.readFileSync(path.join(DIST, f), 'utf8')).join('');
const smUrls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].slice(SITE.length) || '/');
for (const u of smUrls) if (pages.get(u)?.noindex) errors.push(`sitemap lists noindex page ${u}`);
const hreflangInSitemap = /xhtml:link/.test(sm);

console.log(`Pages: ${pages.size} · in sitemap: ${smUrls.length} · sitemap hreflang: ${hreflangInSitemap ? 'yes' : 'no'}`);
if (warnings.length) { console.log(`\n${warnings.length} warning(s):`); warnings.slice(0, 80).forEach((w) => console.log('  ⚠️ ', w)); if (warnings.length > 80) console.log(`  … and ${warnings.length - 80} more`); }
if (errors.length) { console.log(`\n${errors.length} error(s):`); errors.slice(0, 80).forEach((e) => console.log('  ❌', e)); if (errors.length > 80) console.log(`  … and ${errors.length - 80} more`); process.exit(1); }
console.log('\n✅ No SEO errors.');
