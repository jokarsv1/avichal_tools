import { $, onFiles, downloadBlob, setStatus, errorMessage } from '../lib/ui';
import { decodeImage, makeCanvas, drawScaled, canvasToBlob, setJpegDpi } from '../lib/image';
import { loadPdfLib, pdfBlob } from '../lib/pdf';

const DPI = 300;
const mm = (v: number) => Math.round((v / 25.4) * DPI);
const SHEETS: Record<string, [number, number]> = { '4x6': [152.4, 101.6], a4: [210, 297], '5x7': [177.8, 127] };

const view = $<HTMLCanvasElement>('#pp-view');
const status = $('#pp-status');
const el = (id: string) => document.getElementById(id) as HTMLInputElement;
let src: HTMLCanvasElement | null = null;
let original: HTMLCanvasElement | null = null;
let whitened: HTMLCanvasElement | null = null;
let zoom = 1, panX = 0, panY = 0;

const size = () => { const [w, h] = el('pp-size').value.split('x').map(Number); return { w, h }; };

function geometry(W: number, H: number) {
  const s = Math.max(W / src!.width, H / src!.height) * zoom;
  const dw = src!.width * s, dh = src!.height * s;
  const maxX = Math.max(0, (dw - W) / 2 / W), maxY = Math.max(0, (dh - H) / 2 / H);
  panX = Math.max(-maxX, Math.min(maxX, panX)); panY = Math.max(-maxY, Math.min(maxY, panY));
  return { dw, dh, x: (W - dw) / 2 + panX * W, y: (H - dh) / 2 + panY * H };
}

function paint(c: HTMLCanvasElement, final: boolean) {
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  const g = geometry(c.width, c.height);
  const b = +el('pp-bright').value, k = +el('pp-contrast').value;
  ctx.filter = `brightness(${b}%) contrast(${k}%)`;
  const img = final && g.dw < src!.width ? drawScaled(src!, Math.round(g.dw), Math.round(g.dh)) : src!;
  ctx.drawImage(img, g.x, g.y, g.dw, g.dh);
  ctx.filter = 'none';
}

function redraw() {
  if (!src) return;
  const { w, h } = size();
  const maxW = Math.min(view.parentElement!.clientWidth - 20, 340);
  view.width = maxW; view.height = Math.round((maxW * h) / w);
  paint(view, false);
  if (el('pp-guide').checked) {
    // Face guide: head (chin to crown) should fill ~70-80% of the height, eyes ~55-65% from the bottom.
    const ctx = view.getContext('2d')!;
    const W = view.width, H = view.height;
    ctx.save();
    ctx.strokeStyle = 'rgba(79,70,229,.9)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.47, W * 0.3, H * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]); ctx.strokeStyle = 'rgba(225,29,72,.8)'; ctx.lineWidth = 1;
    for (const [y, label] of [[H * 0.1, 'top of head'], [H * 0.84, 'chin']] as const) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); ctx.fillStyle = 'rgba(225,29,72,.9)'; ctx.font = '11px system-ui'; ctx.fillText(label, 6, y - 4); }
    ctx.restore();
  }
}

function single(): HTMLCanvasElement {
  const { w, h } = size();
  const c = makeCanvas(mm(w), mm(h));
  paint(c, true);
  return c;
}

function sheet(): { canvas: HTMLCanvasElement; count: number } {
  const { w, h } = size();
  let [sw, sh] = SHEETS[el('pp-sheet').value];
  const gap = 1.5, margin = 2;
  // Pick the orientation that fits more photos.
  const fit = (W: number, H: number) => Math.floor((W - 2 * margin + gap) / (w + gap)) * Math.floor((H - 2 * margin + gap) / (h + gap));
  if (fit(sh, sw) > fit(sw, sh)) [sw, sh] = [sh, sw];
  const cols = Math.floor((sw - 2 * margin + gap) / (w + gap)), rows = Math.floor((sh - 2 * margin + gap) / (h + gap));
  const want = Math.min(cols * rows, +el('pp-count').value || cols * rows);
  const c = makeCanvas(mm(sw), mm(sh));
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  const one = single();
  const offX = (sw - cols * w - (cols - 1) * gap) / 2, offY = (sh - rows * h - (rows - 1) * gap) / 2;
  let n = 0;
  for (let r = 0; r < rows && n < want; r++) for (let q = 0; q < cols && n < want; q++, n++) {
    const x = mm(offX + q * (w + gap)), y = mm(offY + r * (h + gap));
    ctx.drawImage(one, x, y);
    ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, y - 0.5, one.width + 1, one.height + 1);
  }
  return { canvas: c, count: n };
}

let drag: { x: number; y: number; px: number; py: number } | null = null;
view.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, px: panX, py: panY }; view.setPointerCapture(e.pointerId); });
view.addEventListener('pointermove', (e) => { if (!drag) return; panX = drag.px + (e.clientX - drag.x) / view.clientWidth; panY = drag.py + (e.clientY - drag.y) / view.clientHeight; redraw(); });
view.addEventListener('pointerup', () => (drag = null));
view.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.max(1, Math.min(5, zoom * (e.deltaY < 0 ? 1.06 : 0.94))); el('pp-zoom').value = String(zoom); redraw(); }, { passive: false });
el('pp-zoom').addEventListener('input', () => { zoom = +el('pp-zoom').value; redraw(); });
['pp-size', 'pp-bright', 'pp-contrast', 'pp-guide'].forEach((id) => el(id).addEventListener('input', redraw));
$('#pp-rotate').addEventListener('click', () => {
  if (!src) return;
  const r = makeCanvas(src.height, src.width), x = r.getContext('2d')!;
  x.translate(r.width, 0); x.rotate(Math.PI / 2); x.drawImage(src, 0, 0);
  src = r; original = r; whitened = null; panX = panY = 0;
  if (el('pp-white').checked) applyWhite(); else redraw();
});

async function applyWhite() {
  if (!original) return;
  if (!el('pp-white').checked) { src = original; redraw(); return; }
  setStatus(status, 'Making the background white (AI on your device)…', 'info');
  try {
    const { removeBackground } = await import('../lib/segment');
    whitened ??= await removeBackground(original, { bg: '#ffffff', feather: 1, tightness: 1.6 });
    src = whitened;
    redraw();
    setStatus(status, 'White background applied. Check the edges, then align your face with the guide.', 'ok');
  } catch (e) { setStatus(status, 'Could not change the background: ' + errorMessage(e), 'err'); }
}
el('pp-white').addEventListener('change', applyWhite);

onFiles($('#pp-drop'), async ([f]) => {
  try {
    const bmp = await decodeImage(f);
    const s = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    src = original = drawScaled(bmp, Math.round(bmp.width * s), Math.round(bmp.height * s));
    whitened = null;
    bmp.close();
    if (el('pp-white').checked) await applyWhite();
    zoom = 1; panX = panY = 0; el('pp-zoom').value = '1';
    $('#pp-panel').classList.remove('hidden');
    $('#pp-drop').classList.add('compact');
    redraw();
    setStatus(status, 'Zoom and drag so your head sits between the two red lines inside the oval.', 'info');
  } catch (e) { alert('Could not open this photo. ' + errorMessage(e)); }
});

async function jpeg(c: HTMLCanvasElement) {
  const bytes = setJpegDpi(new Uint8Array(await (await canvasToBlob(c, 'image/jpeg', 0.95)).arrayBuffer()), DPI);
  return new Blob([bytes as BlobPart], { type: 'image/jpeg' });
}
$('#pp-dl-one').addEventListener('click', async () => {
  if (!src) return;
  const { w, h } = size();
  downloadBlob(await jpeg(single()), `passport-photo-${w}x${h}mm.jpg`);
});
$('#pp-dl-sheet').addEventListener('click', async () => {
  if (!src) return;
  const { canvas, count } = sheet();
  downloadBlob(await jpeg(canvas), `passport-photos-${el('pp-sheet').value}-${count}.jpg`);
  setStatus(status, `Sheet with ${count} photos downloaded. Print at "actual size" / 100% (no "fit to page").`, 'ok');
});
$('#pp-dl-pdf').addEventListener('click', async () => {
  if (!src) return;
  const { canvas, count } = sheet();
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.create();
  const img = await doc.embedJpg(new Uint8Array(await (await jpeg(canvas)).arrayBuffer()));
  const pw = (canvas.width / DPI) * 72, ph = (canvas.height / DPI) * 72;
  doc.addPage([pw, ph]).drawImage(img, { x: 0, y: 0, width: pw, height: ph });
  downloadBlob(pdfBlob(await doc.save()), `passport-photos-${el('pp-sheet').value}-${count}.pdf`);
  setStatus(status, `PDF with ${count} photos downloaded. Print at 100% scale.`, 'ok');
});
addEventListener('resize', redraw);
