import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
const pw = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright');
const DIST = path.resolve('dist');
const T = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const s = http.createServer((q, r) => { const p = decodeURIComponent(new URL(q.url, 'http://x').pathname); let f = path.join(DIST, p === '/' ? 'index.html' : p); if (!path.extname(f)) f += '.html'; if (!fs.existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((r) => s.listen(4396, r));
const b = await pw.chromium.launch();
const shots = process.argv.slice(2);
for (const spec of shots) {
  const [route, w, h, scheme, file] = spec.split('|');
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, colorScheme: scheme || 'light', deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  await pg.goto('http://localhost:4396' + route);
  await pg.waitForTimeout(800);
  await pg.screenshot({ path: `tests/output/${file}.png`, fullPage: false });
  const overflow = await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log(file, overflow ? 'HORIZONTAL OVERFLOW' : 'ok');
  await ctx.close();
}
await b.close(); s.close();
