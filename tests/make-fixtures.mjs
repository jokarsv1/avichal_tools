// Generates PDF fixtures with pdf-lib. Images/videos come from ffmpeg (see tests/README in docs).
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'node:fs';
const dir = new URL('./fixtures/generated/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });

async function textPdf(name, pages, label) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const p = doc.addPage([595, 842]);
    p.drawText(`${label} page ${i}`, { x: 60, y: 760, size: 32, font, color: rgb(0.1, 0.1, 0.4) });
    for (let l = 0; l < 30; l++) p.drawText(`Line ${l + 1}: The quick brown fox jumps over the lazy dog.`, { x: 60, y: 700 - l * 20, size: 12, font });
  }
  fs.writeFileSync(new URL(name, dir), await doc.save());
}

async function imagePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const jpg = await doc.embedJpg(fs.readFileSync(new URL('photo.jpg', dir)));
  const png = await doc.embedPng(fs.readFileSync(new URL('image.png', dir)));
  for (let i = 0; i < 3; i++) {
    const p = doc.addPage([595, 842]);
    p.drawImage(jpg, { x: 40, y: 200, width: 515, height: 600 });
    p.drawText(`Scanned page ${i + 1} - text must stay selectable`, { x: 40, y: 120, size: 18, font });
  }
  const p = doc.addPage([842, 595]);
  p.drawImage(png, { x: 40, y: 40, width: 760, height: 515 });
  fs.writeFileSync(new URL('scanned.pdf', dir), await doc.save());
}

await textPdf('a.pdf', 3, 'Doc A');
await textPdf('b.pdf', 2, 'Doc B');
await textPdf('ten.pdf', 10, 'Ten');
await imagePdf();
console.log('PDF fixtures written');
