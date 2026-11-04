import { $, $$, onFiles, downloadBlob, setStatus, errorMessage, baseName } from '../lib/ui';
import { loadDoc, readFile, pdfBlob, openPdfJs, closePdf } from '../lib/pdf';
import { makeCanvas, decodeImage } from '../lib/image';
import { PdfOverlay, textToCanvas } from '../lib/pdf-overlay';

const status = $('#sg-status');
const overlay = new PdfOverlay($('#sg-pages'));
let file: File | null = null;

// ---------------- Signature pad ----------------
const pad = $<HTMLCanvasElement>('#sg-pad');
const pctx = pad.getContext('2d')!;
let inkColor = '#0a1f8f';
let drawing = false, last: [number, number] | null = null, hasInk = false;
function sizePad() {
  const r = pad.getBoundingClientRect();
  const dpr = Math.min(2, devicePixelRatio || 1);
  pad.width = Math.max(300, Math.round(r.width * dpr));
  pad.height = Math.round(pad.width * 0.38);
  pctx.lineCap = 'round';
  pctx.lineJoin = 'round';
  hasInk = false;
}
const padPos = (e: PointerEvent): [number, number] => { const r = pad.getBoundingClientRect(); return [((e.clientX - r.left) * pad.width) / r.width, ((e.clientY - r.top) * pad.height) / r.height]; };
pad.addEventListener('pointerdown', (e) => { drawing = true; last = padPos(e); pad.setPointerCapture(e.pointerId); });
pad.addEventListener('pointermove', (e) => {
  if (!drawing || !last) return;
  const p = padPos(e);
  const speed = Math.hypot(p[0] - last[0], p[1] - last[1]);
  pctx.strokeStyle = inkColor;
  pctx.lineWidth = Math.max(2, (+($<HTMLInputElement>('#sg-thick')).value || 4) * (pad.width / 600) * (1.2 - Math.min(0.6, speed / 80)));
  pctx.beginPath(); pctx.moveTo(last[0], last[1]); pctx.lineTo(p[0], p[1]); pctx.stroke();
  last = p; hasInk = true;
});
['pointerup', 'pointercancel'].forEach((ev) => pad.addEventListener(ev, () => { drawing = false; last = null; }));
$('#sg-clear').addEventListener('click', () => { pctx.clearRect(0, 0, pad.width, pad.height); hasInk = false; });
$$<HTMLButtonElement>('[data-ink]').forEach((b) => b.addEventListener('click', () => {
  inkColor = b.dataset.ink!;
  $$('[data-ink]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
}));
$$<HTMLButtonElement>('[data-tab]').forEach((b) => b.addEventListener('click', () => {
  $$('[data-tab]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  $$('[data-pane]').forEach((p) => p.classList.toggle('hidden', p.dataset.pane !== b.dataset.tab));
  if (b.dataset.tab === 'draw') sizePad();
}));

/** Crop a canvas to its non-transparent pixels (+ padding). */
function trim(c: HTMLCanvasElement, padPx = 6): HTMLCanvasElement | null {
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - padPx); y0 = Math.max(0, y0 - padPx); x1 = Math.min(width - 1, x1 + padPx); y1 = Math.min(height - 1, y1 + padPx);
  const out = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
  out.getContext('2d')!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

async function makeSignature(): Promise<HTMLCanvasElement | null> {
  const tab = document.querySelector<HTMLElement>('[data-tab][aria-pressed=true]')!.dataset.tab;
  if (tab === 'draw') return hasInk ? trim(pad) : null;
  if (tab === 'type') {
    const t = ($<HTMLInputElement>('#sg-typed')).value.trim();
    if (!t) return null;
    const font = ($<HTMLSelectElement>('#sg-font')).value;
    await document.fonts.load(`120px ${font}`).catch(() => {});
    return trim(textToCanvas([t], inkColor, 120, font));
  }
  const f = ($<HTMLInputElement>('#sg-upload')).files?.[0];
  if (!f) return null;
  const bmp = await decodeImage(f);
  const s = Math.min(1, 1200 / bmp.width);
  const c = makeCanvas(bmp.width * s, bmp.height * s);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  // Make the paper transparent and keep the ink.
  const img = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const l = img.data[i] * 0.299 + img.data[i + 1] * 0.587 + img.data[i + 2] * 0.114;
    img.data[i + 3] = Math.min(img.data[i + 3], Math.max(0, Math.min(255, (200 - l) * 3)));
  }
  ctx.putImageData(img, 0, 0);
  return trim(c);
}

function place(png: HTMLCanvasElement, page: number, fw: number) {
  const wrap = overlay.wrapOf(page);
  if (!wrap) return;
  const fh = (fw * wrap.clientWidth * png.height) / png.width / wrap.clientHeight;
  overlay.add({ kind: 'image', page, png, fx: 0.5 - fw / 2, fy: Math.min(0.62, 1 - fh - 0.02), fw, fh }, { keepRatio: true });
  wrap.scrollIntoView({ block: 'nearest' });
}

onFiles($('#sg-drop'), async ([f]) => {
  try {
    const bytes = await readFile(f);
    await loadDoc(bytes); // validates + friendly error for encrypted files
    if (overlay.pdf) closePdf(overlay.pdf);
    file = f;
    $('#sg-panel').classList.remove('hidden');
    $('#sg-drop').classList.add('compact');
    sizePad();
    await overlay.load(await openPdfJs(bytes));
  } catch (e) { alert(errorMessage(e)); }
});

$('#sg-add').addEventListener('click', async () => {
  const sig = await makeSignature();
  if (!sig) return setStatus(status, 'Draw, type or upload your signature first.', 'warn');
  place(sig, overlay.currentPage, 0.3);
  setStatus(status, `Signature added to page ${overlay.currentPage}. Drag it into place; drag the corner to resize.`, 'ok');
});
$('#sg-add-all').addEventListener('click', async () => {
  const sig = await makeSignature();
  if (!sig) return setStatus(status, 'Draw, type or upload your signature first.', 'warn');
  for (let i = 1; i <= overlay.pdf.numPages; i++) place(sig, i, 0.22);
  setStatus(status, `Signature added to all ${overlay.pdf.numPages} pages.`, 'ok');
});
$('#sg-add-date').addEventListener('click', () => {
  const c = trim(textToCanvas([new Date().toLocaleDateString('en-GB')], '#111111', 80));
  if (c) place(c, overlay.currentPage, 0.16);
});
$('#sg-add-text').addEventListener('click', () => {
  const t = prompt('Text to add (name, place, initials…)');
  if (!t) return;
  const c = trim(textToCanvas([t], '#111111', 80));
  if (c) place(c, overlay.currentPage, Math.min(0.6, 0.03 * t.length + 0.06));
});

$('#sg-save').addEventListener('click', async () => {
  if (!file || !overlay.items.length) return setStatus(status, 'Add at least one signature first.', 'warn');
  const btn = $<HTMLButtonElement>('#sg-save');
  btn.disabled = true;
  try {
    const doc = await loadDoc(await readFile(file));
    await overlay.apply(doc);
    const bytes = await doc.save({ useObjectStreams: true });
    downloadBlob(pdfBlob(bytes), `${baseName(file.name)}-signed.pdf`);
    setStatus(status, 'Signed PDF downloaded.', 'ok');
  } catch (e) { setStatus(status, errorMessage(e), 'err'); }
  btn.disabled = false;
});
addEventListener('resize', () => { if ($('[data-pane=draw]').offsetParent) sizePad(); });
