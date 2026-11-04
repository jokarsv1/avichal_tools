// Copies pdf.js runtime assets (character maps, standard fonts, image decoders) into public/
// so they are served from our own domain. Runs automatically before dev and build.
import fs from 'node:fs';
import path from 'node:path';
const src = path.resolve('node_modules/pdfjs-dist');
const dst = path.resolve('public/vendor/pdfjs');
for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  const from = path.join(src, dir);
  if (!fs.existsSync(from)) continue;
  fs.cpSync(from, path.join(dst, dir), { recursive: true });
}
console.log('pdf.js assets copied to public/vendor/pdfjs');
