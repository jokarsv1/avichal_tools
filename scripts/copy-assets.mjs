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

// Tesseract OCR (self-hosted so no third-party CDN sees users' requests).
const tdst = path.resolve('public/vendor/tesseract');
fs.mkdirSync(path.join(tdst, 'lang'), { recursive: true });
fs.copyFileSync(path.resolve('node_modules/tesseract.js/dist/worker.min.js'), path.join(tdst, 'worker.min.js'));
for (const f of fs.readdirSync(path.resolve('node_modules/tesseract.js-core'))) {
  if (/-lstm\.wasm\.js$/.test(f)) fs.copyFileSync(path.resolve('node_modules/tesseract.js-core', f), path.join(tdst, f));
}
for (const lang of ['eng', 'hin']) {
  fs.copyFileSync(path.resolve(`node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`), path.join(tdst, 'lang', `${lang}.traineddata.gz`));
}
console.log('tesseract assets copied to public/vendor/tesseract');

// MediaPipe selfie segmentation (Apache-2.0): portrait background removal, fully self-hosted.
const mdst = path.resolve('public/vendor/mediapipe');
fs.mkdirSync(mdst, { recursive: true });
for (const f of fs.readdirSync(path.resolve('node_modules/@mediapipe/selfie_segmentation'))) {
  if (/\.(js|wasm|data|tflite|binarypb)$/.test(f)) fs.copyFileSync(path.resolve('node_modules/@mediapipe/selfie_segmentation', f), path.join(mdst, f));
}
console.log('mediapipe assets copied to public/vendor/mediapipe');
