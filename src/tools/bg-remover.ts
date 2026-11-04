import { $, $$, onFiles, downloadBlob, setStatus, errorMessage, baseName } from '../lib/ui';
import { decodeImage, drawScaled, makeCanvas, canvasToBlob } from '../lib/image';
import { removeBackground } from '../lib/segment';

const status = $('#bg-status');
const preview = $<HTMLCanvasElement>('#bg-preview');
let src: HTMLCanvasElement | null = null;
let cut: HTMLCanvasElement | null = null; // transparent cut-out
let name = 'photo';
let mode = 'transparent';

async function process() {
  if (!src) return;
  setStatus(status, 'Finding the person in your photo…', 'info');
  try {
    cut = await removeBackground(src, { bg: null, feather: +($<HTMLInputElement>('#bg-soft')).value, tightness: 1 + +($<HTMLInputElement>('#bg-tight')).value / 10 });
    render();
    setStatus(status, 'Done. Choose a background and download.', 'ok');
  } catch (e) { setStatus(status, errorMessage(e), 'err'); }
}

function composed(): HTMLCanvasElement {
  const c = makeCanvas(src!.width, src!.height);
  const ctx = c.getContext('2d')!;
  if (mode === 'color') { ctx.fillStyle = ($<HTMLInputElement>('#bg-color')).value; ctx.fillRect(0, 0, c.width, c.height); }
  if (mode === 'white') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); }
  if (mode === 'blur') { ctx.filter = `blur(${Math.max(6, c.width / 90)}px)`; ctx.drawImage(src!, 0, 0); ctx.filter = 'none'; }
  ctx.drawImage(cut!, 0, 0);
  return c;
}

function render() {
  if (!cut || !src) return;
  const c = composed();
  const s = Math.min(1, 900 / c.width);
  preview.width = Math.round(c.width * s); preview.height = Math.round(c.height * s);
  const ctx = preview.getContext('2d')!;
  ctx.clearRect(0, 0, preview.width, preview.height);
  ctx.drawImage(c, 0, 0, preview.width, preview.height);
}

$$<HTMLButtonElement>('[data-bg]').forEach((b) => b.addEventListener('click', () => {
  mode = b.dataset.bg!;
  $$('[data-bg]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  render();
}));
$('#bg-color').addEventListener('input', () => { mode = 'color'; $$('[data-bg]').forEach((x) => x.setAttribute('aria-pressed', String((x as HTMLElement).dataset.bg === 'color'))); render(); });
['bg-soft', 'bg-tight'].forEach((id) => document.getElementById(id)!.addEventListener('change', process));

onFiles($('#bg-drop'), async ([f]) => {
  name = baseName(f.name);
  try {
    const bmp = await decodeImage(f);
    const s = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    src = drawScaled(bmp, Math.round(bmp.width * s), Math.round(bmp.height * s));
    bmp.close();
    $('#bg-panel').classList.remove('hidden');
    $('#bg-drop').classList.add('compact');
    await process();
  } catch (e) { setStatus(status, errorMessage(e), 'err'); }
});

$('#bg-png').addEventListener('click', async () => { if (cut) downloadBlob(await canvasToBlob(composed(), 'image/png'), `${name}-no-bg.png`); });
$('#bg-jpg').addEventListener('click', async () => {
  if (!cut) return;
  const c = composed();
  const flat = makeCanvas(c.width, c.height);
  const x = flat.getContext('2d')!;
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(c, 0, 0);
  downloadBlob(await canvasToBlob(flat, 'image/jpeg', 0.92), `${name}-new-bg.jpg`);
});
