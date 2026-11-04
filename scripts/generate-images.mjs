// Renders the PWA icons and the default Open Graph image with headless Chromium.
// Run after changing the brand: node scripts/generate-images.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }

const site = fs.readFileSync('src/config/site.ts', 'utf8');
const name = site.match(/name:\s*'([^']+)'/)?.[1] ?? 'Tools';
const svg = fs.readFileSync('public/favicon.svg', 'utf8');
const browser = await pw.chromium.launch();
const page = await browser.newPage();

for (const size of [192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${svg.replace('rx="16"', 'rx="0"')}`);
  await page.screenshot({ path: `public/icon-${size}.png` });
}

await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<!doctype html><html><head><style>
  body{margin:0;width:1200px;height:630px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:linear-gradient(135deg,#4f46e5,#0891b2);color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 80px;box-sizing:border-box}
  .b{display:flex;align-items:center;gap:22px;font-size:44px;font-weight:800}
  .b svg{width:84px;height:84px}
  h1{font-size:72px;line-height:1.05;margin:36px 0 22px;letter-spacing:-1.5px;max-width:1000px}
  p{font-size:30px;opacity:.92;margin:0}
  .pills{display:flex;gap:14px;margin-top:40px}.pills span{background:rgba(255,255,255,.18);padding:10px 20px;border-radius:999px;font-size:24px;font-weight:600}
</style></head><body>
  <div class="b">${svg}<span>${name}</span></div>
  <h1>Free tools that run in your browser</h1>
  <p>PDF · Image · Video · Exam photo · Finance calculators</p>
  <div class="pills"><span>🔒 No upload</span><span>👤 No login</span><span>🚫 No watermark</span></div>
</body></html>`);
await page.screenshot({ path: 'public/og.png' });
await browser.close();
console.log('Wrote public/icon-192.png, public/icon-512.png, public/og.png');
