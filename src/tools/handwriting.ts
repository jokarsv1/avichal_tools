import { $, downloadBlob, downloadZip, setStatus, store } from '../lib/ui';
import { canvasToBlob } from '../lib/image';
import { loadPdfLib, pdfBlob } from '../lib/pdf';

const W = 1240, H = 1754; // A4 at 150 DPI
const textEl = $<HTMLTextAreaElement>('#hw-text');
const out = $('#hw-pages');
const status = $('#hw-status');
const get = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
let pages: HTMLCanvasElement[] = [];

textEl.value = store.get('hw-text', textEl.value);

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function paper(ctx: CanvasRenderingContext2D, kind: string, lineH: number, top: number, marginX: number) {
  ctx.fillStyle = kind === 'yellow' ? '#fff8d6' : '#fffef9';
  ctx.fillRect(0, 0, W, H);
  if (kind === 'plain') return;
  ctx.lineWidth = 1.5;
  if (kind === 'grid') {
    ctx.strokeStyle = 'rgba(80,130,200,.22)';
    for (let x = 0; x < W; x += lineH / 2) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += lineH / 2) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    return;
  }
  ctx.strokeStyle = 'rgba(70,120,200,.35)';
  for (let y = top; y < H - 40; y += lineH) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(220,60,60,.55)';
  ctx.beginPath(); ctx.moveTo(marginX - 24, 0); ctx.lineTo(marginX - 24, H); ctx.stroke();
}

async function render() {
  const font = get('hw-font').value;
  const size = +get('hw-size').value;
  const ink = get('hw-ink').value;
  const kind = get('hw-paper').value;
  const messy = +get('hw-messy').value / 10;
  const lineH = Math.round(size * (+get('hw-gap').value || 1.6));
  store.set('hw-text', textEl.value);
  await document.fonts.load(`${size}px "${font}"`).catch(() => {});
  const rand = rng(1234);
  const top = 150, marginX = kind === 'lined' || kind === 'yellow' ? 150 : 90, right = W - 80;
  pages = [];
  let ctx!: CanvasRenderingContext2D;
  let y = 0;
  const newPage = () => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    ctx = c.getContext('2d')!;
    paper(ctx, kind, lineH, top, marginX);
    ctx.font = `${size}px "${font}", cursive`;
    ctx.fillStyle = ink;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = ink;
    ctx.shadowBlur = 0.6;
    pages.push(c);
    y = top - Math.round(lineH * 0.18);
  };
  newPage();
  const space = () => ctx.measureText(' ').width * (0.9 + rand() * 0.5 * messy + 0.2);
  for (const para of textEl.value.replace(/\r/g, '').split('\n')) {
    let x = marginX + rand() * 6 * messy;
    if (y > H - 80) newPage();
    for (const word of para.split(/(\s+)/)) {
      if (!word) continue;
      if (/^\s+$/.test(word)) { x += space() * word.length; continue; }
      const w = ctx.measureText(word).width * (1 + 0.04 * messy);
      if (x + w > right && x > marginX + 10) {
        y += lineH;
        x = marginX + rand() * 6 * messy;
        if (y > H - 80) newPage();
      }
      // draw letter by letter with small baseline wobble and slant
      const drift = (rand() - 0.5) * 3 * messy;
      for (const ch of Array.from(word)) {
        const cw = ctx.measureText(ch).width;
        ctx.save();
        ctx.translate(x, y + drift + (rand() - 0.5) * 2.4 * messy);
        ctx.rotate((rand() - 0.5) * 0.06 * messy);
        ctx.globalAlpha = 0.86 + rand() * 0.14;
        ctx.fillText(ch, 0, 0);
        ctx.restore();
        x += cw * (0.98 + rand() * 0.06 * messy);
      }
    }
    y += lineH;
  }
  out.replaceChildren(...pages.map((c, i) => {
    const wrap = document.createElement('figure');
    wrap.className = 'hw-page';
    c.setAttribute('aria-label', `Handwritten page ${i + 1}`);
    const cap = document.createElement('figcaption');
    cap.className = 'hint';
    cap.textContent = `Page ${i + 1}`;
    wrap.append(c, cap);
    return wrap;
  }));
  setStatus(status, `${pages.length} page${pages.length === 1 ? '' : 's'} ready.`, 'ok');
}

let t: number | undefined;
const schedule = () => { clearTimeout(t); t = window.setTimeout(render, 350); };
textEl.addEventListener('input', schedule);
['hw-font', 'hw-size', 'hw-ink', 'hw-paper', 'hw-messy', 'hw-gap'].forEach((id) => get(id).addEventListener('input', schedule));
document.fonts.ready.then(render);

$('#hw-png').addEventListener('click', async () => {
  if (pages.length === 1) return downloadBlob(await canvasToBlob(pages[0], 'image/png'), 'handwriting.png');
  const files = await Promise.all(pages.map(async (c, i) => ({ name: `handwriting-page-${i + 1}.png`, data: await canvasToBlob(c, 'image/png') })));
  downloadZip(files, 'handwriting-pages.zip');
});
$('#hw-pdf').addEventListener('click', async () => {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.create();
  for (const c of pages) {
    const jpg = await doc.embedJpg(new Uint8Array(await (await canvasToBlob(c, 'image/jpeg', 0.9)).arrayBuffer()));
    const p = doc.addPage([595.28, 841.89]);
    p.drawImage(jpg, { x: 0, y: 0, width: 595.28, height: 841.89 });
  }
  downloadBlob(pdfBlob(await doc.save()), 'handwriting.pdf');
});
