// Debug helper: open a built page, optionally add a fixture file, print matching elements and errors.
// Usage: node tests/tools/debug-page.mjs /route fixture.jpg ".selector" 6000
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const pw = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright');
const DIST = path.resolve('dist');
const [route, fix, sel = '.status', wait = '6000'] = process.argv.slice(2);
const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.wasm': 'application/wasm', '.mjs': 'text/javascript' };
const s = http.createServer((q, r) => {
  const p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  let f = path.join(DIST, p);
  if (!path.extname(p)) f += '.html';
  if (!fs.existsSync(f)) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => s.listen(4398, r));
const b = await pw.chromium.launch();
const pg = await b.newPage();
pg.on('console', (m) => console.log('console', m.type(), m.text().slice(0, 300)));
pg.on('pageerror', (e) => console.log('pageerror', e.message));
pg.on('requestfailed', (r) => console.log('reqfail', r.url()));
await pg.goto('http://localhost:4398' + route, { timeout: 15000 });
if (fix && fix !== '-') await pg.setInputFiles('input[type=file]', path.resolve('tests/fixtures/generated', fix));
await pg.waitForTimeout(+wait);
for (const el of await pg.$$(sel)) console.log('SEL:', (await el.textContent())?.slice(0, 300), await el.getAttribute('class'));
fs.mkdirSync('tests/output', { recursive: true });
await pg.screenshot({ path: 'tests/output/debug.png', fullPage: false });
await b.close();
s.close();
