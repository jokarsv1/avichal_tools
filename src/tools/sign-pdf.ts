import { $, $$, onFiles, downloadBlob, setStatus, errorMessage, baseName, h } from '../lib/ui';
import { loadPdfLib, loadDoc, readFile, pdfBlob, openPdfJs, closePdf } from '../lib/pdf';
import { makeCanvas, canvasToBlob, decodeImage } from '../lib/image';

interface Item { page: number; el: HTMLElement; png: HTMLCanvasElement; fx: number; fy: number; fw: number; fh: number }

const status = $('#sg-status');
const pagesEl = $('#sg-pages');
let file: File | null = null;
let pdf: any = null;
let items: Item[] = [];
let current: HTMLCanvasElement | null = null; // signature ready to place
let currentPage = 1;

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

// Tabs
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

function textCanvas(text: string, font: string, color: string, px = 120) {
  const probe = makeCanvas(10, 10).getContext('2d')!;
  probe.font = `${px}px ${font}`;
  const w = Math.ceil(probe.measureText(text).width) + px;
  const c = makeCanvas(w, Math.ceil(px * 1.8));
  const ctx = c.getContext('2d')!;
  ctx.font = probe.font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, px / 2, c.height / 2);
  return trim(c);
}

async function makeSignature(): Promise<HTMLCanvasElement | null> {
  const tab = document.querySelector<HTMLElement>('[data-tab][aria-pressed=true]')!.dataset.tab;
  if (tab === 'draw') return hasInk ? trim(pad) : null;
  if (tab === 'type') {
    const t = ($<HTMLInputElement>('#sg-typed')).value.trim();
    if (!t) return null;
    const font = ($<HTMLSelectElement>('#sg-font')).value;
    await document.fonts.load(`120px ${font}`).catch(() => {});
    return textCanvas(t, font, inkColor);
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
    const a = Math.max(0, Math.min(255, (200 - l) * 3));
    img.data[i + 3] = Math.min(img.data[i + 3], a);
  }
  ctx.putImageData(img, 0, 0);
  return trim(c);
}

// ---------------- PDF pages ----------------
onFiles($('#sg-drop'), async ([f]) => {
  try {
    const bytes = await readFile(f);
    await loadDoc(bytes); // validates + friendly error for encrypted files
    if (pdf) closePdf(pdf);
    pdf = await openPdfJs(bytes);
    file = f;
    items = [];
    $('#sg-panel').classList.remove('hidden');
    $('#sg-drop').classList.add('compact');
    sizePad();
    await renderPages();
  } catch (e) { alert(errorMessage(e)); }
});

async function renderPages() {
  pagesEl.replaceChildren();
  const width = Math.min(pagesEl.clientWidth || 800, 900);
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      const wrap = en.target as HTMLElement;
      if (en.isIntersecting) currentPage = +wrap.dataset.page!;
      if (en.isIntersecting && !wrap.dataset.rendered) {
        wrap.dataset.rendered = '1';
        drawPage(wrap);
      }
    }
  }, { rootMargin: '400px 0px', threshold: 0.01 });
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: 1, rotation: page.rotate });
    const hgt = (width * vp.height) / vp.width;
    const wrap = h('div', { class: 'sg-page', 'data-page': i, style: `width:${width}px;height:${hgt}px` }, h('span', { class: 'sg-pno', text: `Page ${i}` }));
    wrap.addEventListener('pointerdown', () => (currentPage = i));
    pagesEl.append(wrap);
    io.observe(wrap);
  }
}

async function drawPage(wrap: HTMLElement) {
  const i = +wrap.dataset.page!;
  const page = await pdf.getPage(i);
  const cssW = wrap.clientWidth;
  const vp1 = page.getViewport({ scale: 1, rotation: page.rotate });
  const dpr = Math.min(2, devicePixelRatio || 1);
  const vp = page.getViewport({ scale: (cssW / vp1.width) * dpr, rotation: page.rotate });
  const c = makeCanvas(vp.width, vp.height);
  c.className = 'sg-canvas';
  await page.render({ canvas: c, viewport: vp }).promise;
  wrap.prepend(c);
}

function placeItem(png: HTMLCanvasElement, pageNo: number, widthFrac: number) {
  const wrap = pagesEl.querySelector<HTMLElement>(`.sg-page[data-page="${pageNo}"]`);
  if (!wrap) return;
  const W = wrap.clientWidth, H = wrap.clientHeight;
  const fw = widthFrac, fh = (fw * W * png.height) / png.width / H;
  const img = h('img', { src: png.toDataURL('image/png'), alt: 'Signature', draggable: 'false' });
  const el = h('div', { class: 'sg-item', tabindex: '0' }, img,
    h('button', { type: 'button', class: 'sg-del', title: 'Remove', 'aria-label': 'Remove', text: '✕' }),
    h('span', { class: 'sg-resize', title: 'Resize' }));
  const it: Item = { page: pageNo, el, png, fx: 0.5 - fw / 2, fy: 0.62, fw, fh };
  if (it.fy + fh > 1) it.fy = 1 - fh - 0.02;
  const apply = () => Object.assign(el.style, { left: `${it.fx * 100}%`, top: `${it.fy * 100}%`, width: `${it.fw * 100}%`, height: `${it.fh * 100}%` });
  apply();
  wrap.append(el);
  items.push(it);
  let mode: 'move' | 'resize' | null = null, sx = 0, sy = 0, s0 = { ...it };
  el.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).classList.contains('sg-del')) return;
    e.stopPropagation();
    mode = (e.target as HTMLElement).classList.contains('sg-resize') ? 'resize' : 'move';
    sx = e.clientX; sy = e.clientY; s0 = { ...it };
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!mode) return;
    const dx = (e.clientX - sx) / wrap.clientWidth, dy = (e.clientY - sy) / wrap.clientHeight;
    if (mode === 'move') { it.fx = Math.max(0, Math.min(1 - it.fw, s0.fx + dx)); it.fy = Math.max(0, Math.min(1 - it.fh, s0.fy + dy)); }
    else {
      const ratio = s0.fh / s0.fw;
      it.fw = Math.max(0.04, Math.min(1 - it.fx, s0.fw + dx));
      it.fh = it.fw * ratio;
      if (it.fy + it.fh > 1) { it.fh = 1 - it.fy; it.fw = it.fh / ratio; }
    }
    apply();
  });
  el.addEventListener('pointerup', () => (mode = null));
  el.querySelector('.sg-del')!.addEventListener('click', () => { el.remove(); items = items.filter((x) => x !== it); });
  el.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    if (e.key === 'Delete' || e.key === 'Backspace') { el.remove(); items = items.filter((x) => x !== it); return; }
    if (e.key === 'ArrowLeft') it.fx = Math.max(0, it.fx - step);
    else if (e.key === 'ArrowRight') it.fx = Math.min(1 - it.fw, it.fx + step);
    else if (e.key === 'ArrowUp') it.fy = Math.max(0, it.fy - step);
    else if (e.key === 'ArrowDown') it.fy = Math.min(1 - it.fh, it.fy + step);
    else return;
    e.preventDefault(); apply();
  });
  wrap.scrollIntoView({ block: 'nearest' });
}

$('#sg-add').addEventListener('click', async () => {
  current = await makeSignature();
  if (!current) return setStatus(status, 'Draw, type or upload your signature first.', 'warn');
  placeItem(current, currentPage, 0.3);
  setStatus(status, `Signature added to page ${currentPage}. Drag it into place; drag the corner to resize.`, 'ok');
});
$('#sg-add-date').addEventListener('click', () => {
  const d = new Date().toLocaleDateString('en-GB');
  const c = textCanvas(d, 'system-ui, Arial, sans-serif', '#111111', 80);
  if (c) placeItem(c, currentPage, 0.16);
});
$('#sg-add-text').addEventListener('click', () => {
  const t = prompt('Text to add (name, place, initials…)');
  if (!t) return;
  const c = textCanvas(t, 'system-ui, Arial, sans-serif', '#111111', 80);
  if (c) placeItem(c, currentPage, Math.min(0.6, 0.03 * t.length + 0.06));
});
$('#sg-add-all').addEventListener('click', async () => {
  const sig = await makeSignature();
  if (!sig) return setStatus(status, 'Draw, type or upload your signature first.', 'warn');
  for (let i = 1; i <= pdf.numPages; i++) placeItem(sig, i, 0.22);
  setStatus(status, `Signature added to all ${pdf.numPages} pages.`, 'ok');
});

$('#sg-save').addEventListener('click', async () => {
  if (!file || !items.length) return setStatus(status, 'Add at least one signature first.', 'warn');
  const btn = $<HTMLButtonElement>('#sg-save');
  btn.disabled = true;
  try {
    const { degrees } = await loadPdfLib();
    const doc = await loadDoc(await readFile(file));
    const cache = new Map<HTMLCanvasElement, any>();
    for (const it of items) {
      const page = doc.getPage(it.page - 1);
      let png = cache.get(it.png);
      if (!png) { png = await doc.embedPng(new Uint8Array(await (await canvasToBlob(it.png, 'image/png')).arrayBuffer())); cache.set(it.png, png); }
      const box = page.getCropBox();
      const r = ((page.getRotation().angle % 360) + 360) % 360;
      const vw = r % 180 ? box.height : box.width, vh = r % 180 ? box.width : box.height;
      const w = it.fw * vw, hh = it.fh * vh;
      const vx = it.fx * vw, vy = (1 - it.fy - it.fh) * vh; // visual bottom-left
      let x = vx, y = vy;
      if (r === 90) { x = box.width - vy; y = vx; }
      else if (r === 180) { x = box.width - vx; y = box.height - vy; }
      else if (r === 270) { x = vy; y = box.height - vx; }
      page.drawImage(png, { x: x + box.x, y: y + box.y, width: w, height: hh, rotate: degrees(r) });
    }
    const bytes = await doc.save({ useObjectStreams: true });
    downloadBlob(pdfBlob(bytes), `${baseName(file.name)}-signed.pdf`);
    setStatus(status, 'Signed PDF downloaded.', 'ok');
  } catch (e) { setStatus(status, errorMessage(e), 'err'); }
  btn.disabled = false;
});
addEventListener('resize', () => { if ($('[data-pane=draw]').offsetParent) sizePad(); });
