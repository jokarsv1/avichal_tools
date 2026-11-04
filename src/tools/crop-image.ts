import { onFiles, downloadBlob, baseName, $ } from '../lib/ui';
import { decodeImage, makeCanvas, canvasToBlob, extFor, type OutType } from '../lib/image';

type Rect = { x: number; y: number; w: number; h: number };
type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move' | 'new';

const drop = $('#crop-drop');
const editor = $('.crop-editor');
const view = $<HTMLCanvasElement>('#crop-view');
const ratioEl = $<HTMLSelectElement>('#crop-ratio');
const shapeEl = $<HTMLSelectElement>('#crop-shape');
const fmtEl = $<HTMLSelectElement>('#crop-fmt');
const wEl = $<HTMLInputElement>('#crop-w');
const hEl = $<HTMLInputElement>('#crop-h');
const info = $('#crop-info');
let src: HTMLCanvasElement | null = null;
let name = 'image';
let r: Rect = { x: 0, y: 0, w: 0, h: 0 };
let scale = 1; // view px per image px

const ratio = () => {
  const v = ratioEl.value;
  if (v === 'free') return 0;
  const [a, b] = v.split(':').map(Number);
  return a / b;
};

function fitView() {
  if (!src) return;
  const maxW = Math.min(view.parentElement!.clientWidth - 4, 900);
  scale = Math.min(maxW / src.width, 520 / src.height, 1.5);
  view.width = Math.round(src.width * scale);
  view.height = Math.round(src.height * scale);
  draw();
}

function resetRect() {
  if (!src) return;
  const k = ratio();
  let w = src.width * 0.8, h = src.height * 0.8;
  if (k) { if (w / h > k) w = h * k; else h = w / k; }
  r = { x: (src.width - w) / 2, y: (src.height - h) / 2, w, h };
  draw();
}

function draw() {
  if (!src) return;
  const ctx = view.getContext('2d')!;
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.drawImage(src, 0, 0, view.width, view.height);
  const x = r.x * scale, y = r.y * scale, w = r.w * scale, h = r.h * scale;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.beginPath();
  ctx.rect(0, 0, view.width, view.height);
  if (shapeEl.value === 'circle') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2, true);
  else { ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y); ctx.closePath(); }
  ctx.fill('evenodd');
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(x + (w * i) / 3, y); ctx.lineTo(x + (w * i) / 3, y + h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + (h * i) / 3); ctx.lineTo(x + w, y + (h * i) / 3); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  for (const [hx, hy] of handles(x, y, w, h)) ctx.fillRect(hx - 6, hy - 6, 12, 12);
  ctx.restore();
  wEl.value = String(Math.round(r.w));
  hEl.value = String(Math.round(r.h));
  info.textContent = `Crop: ${Math.round(r.w)} × ${Math.round(r.h)} px at (${Math.round(r.x)}, ${Math.round(r.y)}) · original ${src.width} × ${src.height}`;
}

function handles(x: number, y: number, w: number, h: number): [number, number, Handle][] {
  return [[x, y, 'nw'], [x + w / 2, y, 'n'], [x + w, y, 'ne'], [x + w, y + h / 2, 'e'], [x + w, y + h, 'se'], [x + w / 2, y + h, 's'], [x, y + h, 'sw'], [x, y + h / 2, 'w']];
}

function hit(px: number, py: number): Handle {
  const x = r.x * scale, y = r.y * scale, w = r.w * scale, h = r.h * scale;
  const tol = matchMedia('(pointer: coarse)').matches ? 22 : 12;
  for (const [hx, hy, k] of handles(x, y, w, h)) if (Math.abs(px - hx) < tol && Math.abs(py - hy) < tol) return k;
  if (px > x && px < x + w && py > y && py < y + h) return 'move';
  return 'new';
}

function clampRect(n: Rect): Rect {
  const W = src!.width, H = src!.height;
  n.w = Math.max(8, Math.min(n.w, W));
  n.h = Math.max(8, Math.min(n.h, H));
  n.x = Math.max(0, Math.min(n.x, W - n.w));
  n.y = Math.max(0, Math.min(n.y, H - n.h));
  return n;
}

let drag: { k: Handle; sx: number; sy: number; r0: Rect } | null = null;
const pos = (e: PointerEvent) => { const b = view.getBoundingClientRect(); return { x: ((e.clientX - b.left) * view.width) / b.width, y: ((e.clientY - b.top) * view.height) / b.height }; };
view.addEventListener('pointermove', (e) => {
  const p = pos(e);
  if (!drag) {
    const k = hit(p.x, p.y);
    view.style.cursor = k === 'move' ? 'move' : k === 'new' ? 'crosshair' : `${k}-resize`;
    return;
  }
  const dx = (p.x - drag.sx) / scale, dy = (p.y - drag.sy) / scale;
  const o = drag.r0;
  let n: Rect = { ...o };
  const k = ratio();
  if (drag.k === 'move') { n.x = o.x + dx; n.y = o.y + dy; r = clampRect(n); draw(); return; }
  if (drag.k === 'new') {
    const ax = drag.sx / scale, ay = drag.sy / scale;
    let w = Math.abs(dx), h = Math.abs(dy);
    if (k) { if (w / Math.max(h, 1) > k) h = w / k; else w = h * k; }
    n = { x: dx < 0 ? ax - w : ax, y: dy < 0 ? ay - h : ay, w, h };
  } else {
    if (drag.k.includes('e')) n.w = o.w + dx;
    if (drag.k.includes('w')) { n.w = o.w - dx; n.x = o.x + dx; }
    if (drag.k.includes('s')) n.h = o.h + dy;
    if (drag.k.includes('n')) { n.h = o.h - dy; n.y = o.y + dy; }
    if (k) {
      if (drag.k === 'n' || drag.k === 's') { const w = n.h * k; n.x = o.x + (o.w - w) / 2; n.w = w; }
      else { const hh = n.w / k; if (drag.k.includes('n')) n.y = o.y + o.h - hh; else if (drag.k === 'e' || drag.k === 'w') n.y = o.y + (o.h - hh) / 2; n.h = hh; }
    }
  }
  if (n.w < 8 || n.h < 8) return;
  r = clampRect(n);
  draw();
});
view.addEventListener('pointerdown', (e) => {
  if (!src) return;
  const p = pos(e);
  drag = { k: hit(p.x, p.y), sx: p.x, sy: p.y, r0: { ...r } };
  view.setPointerCapture(e.pointerId);
});
const end = () => (drag = null);
view.addEventListener('pointerup', end);
view.addEventListener('pointercancel', end);

ratioEl.addEventListener('change', resetRect);
shapeEl.addEventListener('change', () => {
  if (shapeEl.value === 'circle' && ratioEl.value === 'free') ratioEl.value = '1:1';
  if (shapeEl.value === 'circle') fmtEl.value = 'image/png';
  resetRect();
});
[wEl, hEl].forEach((el) => el.addEventListener('change', () => {
  if (!src) return;
  const k = ratio();
  let w = +wEl.value || r.w, h = +hEl.value || r.h;
  if (k) { if (el === wEl) h = w / k; else w = h * k; }
  r = clampRect({ x: r.x, y: r.y, w, h });
  draw();
}));

function transform(fn: (c: HTMLCanvasElement) => HTMLCanvasElement) {
  if (!src) return;
  src = fn(src);
  fitView();
  resetRect();
}
$('#crop-rotate').addEventListener('click', () => transform((s) => {
  const c = makeCanvas(s.height, s.width), x = c.getContext('2d')!;
  x.translate(c.width, 0); x.rotate(Math.PI / 2); x.drawImage(s, 0, 0); return c;
}));
$('#crop-flip').addEventListener('click', () => transform((s) => {
  const c = makeCanvas(s.width, s.height), x = c.getContext('2d')!;
  x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(s, 0, 0); return c;
}));

$('#crop-download').addEventListener('click', async () => {
  if (!src) return;
  const w = Math.round(r.w), h = Math.round(r.h);
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const type = fmtEl.value as OutType;
  if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
  if (shapeEl.value === 'circle') { ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.clip(); }
  ctx.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, w, h);
  const blob = await canvasToBlob(c, type, 0.92);
  downloadBlob(blob, `${baseName(name)}-cropped.${extFor(type)}`);
});
$('#crop-reset').addEventListener('click', () => { src = null; editor.classList.add('hidden'); drop.classList.remove('hidden'); });

onFiles(drop, async ([f]) => {
  name = f.name;
  try {
    const bmp = await decodeImage(f);
    const c = makeCanvas(bmp.width, bmp.height);
    c.getContext('2d')!.drawImage(bmp, 0, 0);
    bmp.close();
    src = c;
    drop.classList.add('hidden');
    editor.classList.remove('hidden');
    fitView();
    resetRect();
  } catch (e) {
    alert('Could not open this image.');
  }
});
addEventListener('resize', fitView);
