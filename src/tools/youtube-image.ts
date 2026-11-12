/**
 * YouTube thumbnail / channel banner / profile picture resizer.
 * Composes the photo onto a canvas of YouTube's exact size (fill & crop, or fit on a blurred or plain
 * background), previews it with YouTube's guides (banner safe area, round profile crop, duration badge),
 * and exports a JPG under YouTube's file-size limit. Runs entirely in the browser.
 */
import { onFiles, downloadBlob, baseName, setStatus, formatBytes } from '../lib/ui';
import { decodeImage, makeCanvas, encodeToTarget } from '../lib/image';
import { toolStarted, taskCompleted } from '../lib/analytics';

type Kind = 'thumb' | 'banner' | 'profile';
type Mode = 'fill' | 'blur' | 'color';
const SPECS: Record<Kind, { w: number; h: number; maxBytes: number; name: string }> = {
  thumb: { w: 1280, h: 720, maxBytes: 2 * 1024 * 1024, name: 'thumbnail' },
  banner: { w: 2560, h: 1440, maxBytes: 6 * 1024 * 1024, name: 'banner' },
  profile: { w: 800, h: 800, maxBytes: 2 * 1024 * 1024, name: 'profile-picture' },
};

const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as unknown as T;
const drop = $<HTMLElement>('yi-drop');
const panel = $<HTMLElement>('yi-panel');
const preview = $<HTMLCanvasElement>('yi-preview');
const st = $<HTMLElement>('yi-status');
let bmp: ImageBitmap | null = null;
let fileName = 'image';

const kind = () => (document.querySelector<HTMLInputElement>('input[name=yi-kind]:checked')?.value || 'thumb') as Kind;
const mode = () => (document.querySelector<HTMLInputElement>('input[name=yi-mode]:checked')?.value || 'fill') as Mode;

/** Draw the photo onto a W×H canvas. zoom ≥ 1; px/py in −1…1 pick which part shows when cropping. */
export function compose(src: CanvasImageSource & { width: number; height: number }, W: number, H: number, m: Mode, zoom: number, px: number, py: number, bg: string): HTMLCanvasElement {
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  if (m === 'fill') {
    const s = Math.max(W / src.width, H / src.height) * zoom;
    const dw = src.width * s, dh = src.height * s;
    ctx.drawImage(src, (W - dw) / 2 - ((dw - W) / 2) * px, (H - dh) / 2 - ((dh - H) / 2) * py, dw, dh);
    return c;
  }
  if (m === 'blur') {
    // Cheap, portable blur: cover-draw a tiny copy, then scale it back up with smoothing.
    const small = makeCanvas(Math.max(2, Math.round(W / 28)), Math.max(2, Math.round(H / 28)));
    const sx = small.getContext('2d')!;
    const s = Math.max(small.width / src.width, small.height / src.height);
    sx.drawImage(src, (small.width - src.width * s) / 2, (small.height - src.height * s) / 2, src.width * s, src.height * s);
    ctx.drawImage(small, 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }
  const s = Math.min(W / src.width, H / src.height) * Math.min(zoom, 1.6);
  const dw = src.width * s, dh = src.height * s;
  ctx.drawImage(src, (W - dw) / 2 - Math.max(0, (dw - W) / 2) * px, (H - dh) / 2 - Math.max(0, (dh - H) / 2) * py, dw, dh);
  return c;
}

function settings() {
  return { zoom: +$('yi-zoom').value / 100, px: +$('yi-x').value / 100, py: +$('yi-y').value / 100, bg: $('yi-bg').value };
}

function drawGuides(ctx: CanvasRenderingContext2D, k: Kind, W: number, H: number) {
  ctx.save();
  if (k === 'banner') {
    // Visible everywhere: 1546×423 at 2560×1440 (1235×338 at YouTube's 2048×1152 minimum). Desktop: full width, same height.
    const sh = (423 / 1440) * H, sw = (1546 / 2560) * W;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(0, 0, W, (H - sh) / 2);
    ctx.fillRect(0, (H + sh) / 2, W, (H - sh) / 2);
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.strokeRect((W - sw) / 2, (H - sh) / 2, sw, sh);
    ctx.setLineDash([]);
    ctx.font = `600 ${Math.max(11, W / 60)}px system-ui, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.fillText('Safe area: visible on phones, computers and TVs', (W - sw) / 2 + 6, (H - sh) / 2 - 8);
    ctx.fillText('Only TVs show the dark parts', 8, H - 10);
  } else if (k === 'profile') {
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
  } else {
    // YouTube's duration badge covers the bottom-right corner.
    const bw = W * 0.09, bh = H * 0.075, m = W * 0.015;
    ctx.fillStyle = 'rgba(0,0,0,.8)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(W - bw - m, H - bh - m, bw, bh, 4); else ctx.rect(W - bw - m, H - bh - m, bw, bh);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `600 ${bh * 0.6}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('10:24', W - m - bw / 2, H - m - bh / 2);
  }
  ctx.restore();
}

function render() {
  if (!bmp) return;
  const k = kind(), spec = SPECS[k], s = settings(), m = mode();
  document.getElementById('yi-bg-wrap')!.classList.toggle('hidden', m !== 'color');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = Math.min(preview.parentElement!.clientWidth || 640, k === 'profile' ? 360 : 760);
  const W = Math.round(cssW * dpr), H = Math.round((W * spec.h) / spec.w);
  const img = compose(bmp, W, H, m, s.zoom, s.px, s.py, s.bg);
  preview.width = W; preview.height = H;
  preview.style.width = `${cssW}px`;
  const ctx = preview.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  drawGuides(ctx, k, W, H);
  // How a thumbnail looks where people actually see it: the home feed and the "Up next" list.
  const feed = document.getElementById('yi-feed')!;
  feed.classList.toggle('hidden', k !== 'thumb');
  if (k === 'thumb') {
    for (const [id, w] of [['yi-feed-big', 320], ['yi-feed-small', 168]] as const) {
      const c = document.getElementById(id) as HTMLCanvasElement;
      c.width = w * dpr; c.height = Math.round((w * 9 / 16) * dpr);
      c.style.width = `${w}px`;
      const fc = c.getContext('2d')!;
      fc.imageSmoothingQuality = 'high';
      fc.drawImage(img, 0, 0, c.width, c.height);
      drawGuides(fc, 'thumb', c.width, c.height);
    }
  }
  $<HTMLElement>('yi-dims').textContent = `${spec.w} × ${spec.h} px · JPG under ${formatBytes(spec.maxBytes, 0)}`;
}

async function download() {
  if (!bmp) return;
  const k = kind(), spec = SPECS[k], s = settings();
  const btn = $<HTMLButtonElement>('yi-download');
  btn.disabled = true;
  try {
    const full = compose(bmp, spec.w, spec.h, mode(), s.zoom, s.px, s.py, s.bg);
    const r = await encodeToTarget(full, { maxBytes: spec.maxBytes - 16 * 1024, type: 'image/jpeg', allowDownscale: false });
    downloadBlob(r.blob, `${baseName(fileName)}-youtube-${spec.name}-${spec.w}x${spec.h}.jpg`);
    setStatus(st, `✅ ${spec.w}×${spec.h}, ${formatBytes(r.blob.size)}: within YouTube's ${formatBytes(spec.maxBytes, 0)} limit.`, 'ok');
    taskCompleted('download');
  } catch (e) {
    setStatus(st, `Couldn't save the image: ${(e as Error).message}`, 'err');
  } finally {
    btn.disabled = false;
  }
}

onFiles(drop, async ([f]) => {
  if (!f) return;
  toolStarted('file');
  setStatus(st, 'Opening the image…', 'info');
  try {
    bmp = await decodeImage(f);
    fileName = f.name || 'image';
    panel.classList.remove('hidden');
    drop.classList.add('compact');
    setStatus(st, `${bmp.width} × ${bmp.height} photo loaded. Choose what you're making, then download.`, 'info');
    render();
  } catch (e) {
    setStatus(st, `Couldn't open this image: ${(e as Error).message}`, 'err');
  }
}, { paste: true });

document.querySelectorAll('#yi-panel input').forEach((el) => { el.addEventListener('input', render); el.addEventListener('change', render); });
$<HTMLButtonElement>('yi-download').addEventListener('click', download);
$<HTMLButtonElement>('yi-reset').addEventListener('click', () => { $('yi-zoom').value = '100'; $('yi-x').value = '0'; $('yi-y').value = '0'; render(); });
addEventListener('resize', () => render());
