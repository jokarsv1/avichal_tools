// End-to-end tests: serves ./dist and drives every tool in headless Chromium with real files.
// Usage: npm run build && npm test            (all)
//        npm test -- compress-pdf trim-video   (only matching tests)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node-tools/node_modules/playwright'); }

const DIST = path.resolve('dist');
const FIX = path.resolve('tests/fixtures/generated');
const OUT = path.resolve('tests/output');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(DIST, p);
  if (p.endsWith('/')) file = path.join(file, 'index.html');
  else if (!path.extname(p)) file += '.html';
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(fs.existsSync(path.join(DIST, '404.html')) ? fs.readFileSync(path.join(DIST, '404.html')) : 'not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4399, r));
const BASE = 'http://localhost:4399';

const browser = await playwright.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--auto-select-desktop-capture-source=Entire screen', '--enable-features=WebCodecs'] });
const tests = [];
const only = process.argv.slice(2);
export function test(name, fn) { tests.push({ name, fn }); }

const fixture = (f) => path.join(FIX, f);

async function newPage() {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push('console: ' + m.text()); });
  return page;
}

/** Click and capture a download, returning {name, size, path}. */
async function download(page, clickSelector, timeout = 60000) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout }), page.click(clickSelector)]);
  const file = path.join(OUT, dl.suggestedFilename());
  await dl.saveAs(file);
  return { name: dl.suggestedFilename(), size: fs.statSync(file).size, path: file };
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

const ctx = { BASE, newPage, download, fixture, assert, OUT };
for (const f of fs.readdirSync(path.resolve('tests/specs')).filter((x) => x.endsWith('.mjs')).sort()) {
  const mod = await import(path.resolve('tests/specs', f));
  mod.default(test, ctx);
}

let pass = 0, fail = 0;
for (const t of tests) {
  if (only.length && !only.some((o) => t.name.includes(o))) continue;
  const started = Date.now();
  try {
    await t.fn();
    pass++;
    console.log(`✓ ${t.name} (${Date.now() - started} ms)`);
  } catch (e) {
    fail++;
    console.log(`✗ ${t.name}\n    ${String(e.stack || e).split('\n').slice(0, 4).join('\n    ')}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
