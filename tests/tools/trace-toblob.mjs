import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
const pw = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright');
const DIST = path.resolve('dist');
const s = http.createServer((q, r) => { const p = decodeURIComponent(new URL(q.url, 'http://x').pathname); let f = path.join(DIST, p); if (!path.extname(p)) f += '.html'; if (!fs.existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); fs.createReadStream(f).pipe(r); });
await new Promise((r) => s.listen(4397, r));
const b = await pw.chromium.launch();
const pg = await b.newPage();
pg.on('console', (m) => console.log(m.text().slice(0, 200)));
await pg.addInitScript(() => {
  const orig = HTMLCanvasElement.prototype.toBlob;
  let n = 0; const t0 = performance.now();
  HTMLCanvasElement.prototype.toBlob = function (cb, type, q) {
    const id = ++n; const w = this.width, h = this.height;
    return orig.call(this, (bl) => { console.log(`toBlob#${id} ${w}x${h} q=${q} -> ${bl && bl.size} @${Math.round(performance.now() - t0)}ms`); cb(bl); }, type, q);
  };
});
await pg.goto('http://localhost:4397/resize-image-to-kb');
await pg.setInputFiles('input[type=file]', 'tests/fixtures/generated/photo.jpg');
for (let i = 0; i < 8; i++) { await new Promise((r) => setTimeout(r, 1000)); const t = Date.now(); const v = await Promise.race([pg.evaluate(() => document.querySelector(".kb-status").className + " | " + document.querySelector(".kb-status").textContent), new Promise((r) => setTimeout(() => r("BLOCKED"), 3000))]); console.log(i, v, Date.now() - t, "ms"); }
await b.close(); s.close();
