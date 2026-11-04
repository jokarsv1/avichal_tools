import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
const pw = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright');
const DIST = path.resolve('dist');
const s = http.createServer((q, r) => { const p = decodeURIComponent(new URL(q.url, 'http://x').pathname); let f = path.join(DIST, p); if (!path.extname(p)) f += '.html'; if (!fs.existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html' }); fs.createReadStream(f).pipe(r); });
await new Promise((r) => s.listen(4394, r));
const b = await pw.chromium.launch();
for (const route of process.argv.slice(2)) {
  const pg = await b.newPage({ viewport: { width: 390, height: 900 } });
  await pg.goto('http://localhost:4394' + route);
  await pg.waitForTimeout(600);
  const res = await pg.evaluate(() => {
    const W = document.documentElement.clientWidth, out = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.right > W + 1 && r.width > 0 && !el.closest('.table-wrap') && !el.closest('.cat-nav')) out.push(`${el.tagName}.${el.className} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
    }
    return { sw: document.documentElement.scrollWidth, W, out: out.slice(0, 8) };
  });
  console.log(route, JSON.stringify(res));
  await pg.close();
}
await b.close(); s.close();
