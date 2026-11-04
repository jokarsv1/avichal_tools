import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
const pw = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright');
const DIST = path.resolve('dist');
const T = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html' };
const s = http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x');
  let f = path.join(DIST, decodeURIComponent(u.pathname)); if (!path.extname(f)) f += '.html';
  const isAsset = fs.existsSync(f) && !u.pathname.startsWith('/flags');
  if (!isAsset) { console.log('REQ', q.method, q.url.slice(0, 90)); const c = []; q.on('data', (x) => c.push(x)); q.on('end', () => { r.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); r.end(u.pathname.startsWith('/flags') ? '{"featureFlags":{}}' : '{}'); }); return; }
  r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
await new Promise((r) => s.listen(4392, r));
const b = await pw.chromium.launch();
const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' });
await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
const pg = await ctx.newPage();
pg.on('console', (m) => console.log('console', m.type(), m.text().slice(0, 200)));
await pg.goto('http://localhost:4392/emi-calculator?ph_debug=1');
await pg.waitForTimeout(3000);
console.log(await pg.evaluate(() => { const p = (window).__ph; if (!p) return 'no __ph; __AN=' + JSON.stringify((window).__AN) + ' dnt=' + navigator.doNotTrack; return JSON.stringify({ loaded: p.__loaded, optedOut: p.has_opted_out_capturing(), host: p.config.api_host, persistence: p.config.persistence }); }));
await pg.evaluate(() => { (window).__ph.debug(true); (window).__ph.capture('manual_test', { a: 1 }); });
await pg.waitForTimeout(4000);
await b.close(); s.close();
