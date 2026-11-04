import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
const pw = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright');
const DIST = path.resolve('dist');
const T = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html' };
const s = http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x');
  let f = path.join(DIST, decodeURIComponent(u.pathname)); if (!path.extname(f)) f += '.html';
  const isAsset = fs.existsSync(f) && !u.pathname.startsWith('/flags');
  if (!isAsset) console.log('REQ', q.method, q.url.slice(0, 90));
  if (!isAsset) { const c = []; q.on('data', (x) => c.push(x)); q.on('end', () => { r.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); r.end(u.pathname.startsWith('/flags') ? '{"featureFlags":{},"errorsWhileComputingFlags":false}' : '{}'); }); return; }
  r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
await new Promise((r) => s.listen(4392, r));
const b = await pw.chromium.launch();
const pg = await b.newPage();
pg.on('console', (m) => console.log('console', m.type(), m.text().slice(0, 160)));
await pg.goto('http://localhost:4392/emi-calculator');
await pg.waitForTimeout(2500);
await pg.fill('#amount', '900000');
await pg.waitForTimeout(6000);
await pg.goto('http://localhost:4392/');
await pg.waitForTimeout(3000);
await b.close(); s.close();
