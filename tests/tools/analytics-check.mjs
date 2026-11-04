// Builds with a fake PostHog host, drives a few tools and prints the events PostHog would receive.
// Usage: SITE_URL=http://localhost:4392 POSTHOG_KEY=phc_test POSTHOG_HOST=http://localhost:4392 npm run build && node tests/tools/analytics-check.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
import { createRequire } from 'node:module';
const pw = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright');
const DIST = path.resolve('dist');
const T = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.wasm': 'application/wasm' };
const events = [];
const decode = (buf, url) => {
  try {
    let b = buf;
    if (/gzip/.test(url) || (buf[0] === 0x1f && buf[1] === 0x8b)) b = zlib.gunzipSync(buf);
    let txt = b.toString();
    if (txt.startsWith('data=')) txt = Buffer.from(decodeURIComponent(txt.slice(5)), 'base64').toString();
    const j = JSON.parse(txt);
    return Array.isArray(j) ? j : j.batch || [j];
  } catch { return []; }
};
const s = http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x');
  if (q.method === 'POST' || /\/(e|i\/v0\/e|flags|decide|batch)\/?$/.test(u.pathname)) {
    const chunks = [];
    q.on('data', (c) => chunks.push(c));
    q.on('end', () => {
      const raw = Buffer.concat(chunks);
      if (process.env.RAW) console.log('REQ', q.method, q.url, q.headers['content-type'], raw.length, raw.slice(0, 80).toString('latin1').replace(/[^\x20-\x7e]/g, '.'));
      if (!/flags/.test(q.url)) for (const e of decode(raw, q.url)) events.push(e);
      r.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
      r.end(/flags|decide/.test(u.pathname) ? '{"featureFlags":{},"sessionRecording":false}' : '{"status":1}');
    });
    return;
  }
  let f = path.join(DIST, decodeURIComponent(u.pathname));
  if (!path.extname(f)) f += '.html';
  if (u.pathname === '/') f = path.join(DIST, 'index.html');
  if (!fs.existsSync(f)) { r.writeHead(404, { 'access-control-allow-origin': '*' }); r.end('{}'); return; }
  r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => s.listen(4392, r));
const b = await pw.chromium.launch();
const ctx = await b.newContext({ acceptDownloads: true, timezoneId: 'Asia/Kolkata', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' });
await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
const pg = await ctx.newPage();
await pg.goto('http://localhost:4392/compress-video?ph_debug=1');
await pg.click('.quick .chip:has-text("WhatsApp")');
await pg.goto('http://localhost:4392/resize-image-to-kb?ph_debug=1');
await pg.setInputFiles('#kb-drop input[type=file]', 'tests/fixtures/generated/photo.jpg');
await pg.waitForSelector('.kb-status.ok');
await Promise.all([pg.waitForEvent('download'), pg.click('.kb-download')]);
await pg.waitForTimeout(4000);
await pg.goto('http://localhost:4392/emi-calculator?p=800000&r=9.5&y=5&ph_debug=1');
await pg.waitForTimeout(8000);
await pg.goto('http://localhost:4392/?ph_debug=1');
await pg.waitForTimeout(4000);
await b.close(); s.close();
const summary = events.map((e) => `${e.event} ${JSON.stringify({ tool: e.properties?.tool, url: e.properties?.$current_url, method: e.properties?.method, output: e.properties?.output, preset: e.properties?.preset })}`);
console.log(summary.join('\n'));
const leaked = events.filter((e) => /\?/.test(e.properties?.$current_url || ''));
console.log(`\n${events.length} events; query strings leaked: ${leaked.length}`);
