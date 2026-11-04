/**
 * Person segmentation with MediaPipe Selfie Segmentation (Apache-2.0), fully self-hosted under /vendor/mediapipe.
 * Designed for people (portraits, selfies, passport photos), not products or objects.
 */
import { makeCanvas } from './image';

let ready: Promise<any> | null = null;
let queue: Promise<unknown> = Promise.resolve();

function loadScript(src: string) {
  return new Promise<void>((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error('Could not load the segmentation engine.'));
    document.head.append(s);
  });
}

function segmenter() {
  ready ??= (async () => {
    await loadScript('/vendor/mediapipe/selfie_segmentation.js');
    const S = (window as any).SelfieSegmentation;
    const seg = new S({ locateFile: (f: string) => `/vendor/mediapipe/${f}` });
    seg.setOptions({ modelSelection: 0, selfieMode: false });
    await seg.initialize();
    return seg;
  })();
  return ready;
}

/** Returns a soft alpha mask (same size as the input) where the person is opaque. */
export async function personMask(img: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const seg = await segmenter();
  const run = queue.then(() => new Promise<HTMLCanvasElement>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Segmentation timed out.')), 30000);
    seg.onResults((r: any) => {
      clearTimeout(t);
      const m = makeCanvas(img.width, img.height);
      const ctx = m.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(r.segmentationMask, 0, 0, m.width, m.height);
      resolve(m);
    });
    // The model runs at 256 px; feed a reasonably sized copy for speed.
    seg.send({ image: img }).catch(reject);
  }));
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Cut out the person. `feather` softens edges (px), `bg` = colour or null for transparent.
 * The model is low-resolution, so we sharpen the mask slightly (contrast on alpha) to reduce halos.
 */
export async function removeBackground(src: HTMLCanvasElement, opts: { bg?: string | null; feather?: number; tightness?: number } = {}) {
  const mask = await personMask(src);
  const w = src.width, h = src.height;
  const mctx = mask.getContext('2d', { willReadFrequently: true })!;
  const md = mctx.getImageData(0, 0, w, h);
  const k = opts.tightness ?? 1.6; // >1 = crisper edge
  for (let i = 3; i < md.data.length; i += 4) {
    const a = md.data[i] / 255;
    const v = Math.max(0, Math.min(1, (a - 0.5) * k + 0.5));
    md.data[i] = Math.round(v * 255);
  }
  mctx.putImageData(md, 0, 0);
  const out = makeCanvas(w, h);
  const ctx = out.getContext('2d')!;
  if (opts.feather) ctx.filter = `blur(${opts.feather}px)`;
  ctx.drawImage(mask, 0, 0);
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-in';
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  if (opts.bg) {
    const flat = makeCanvas(w, h);
    const f = flat.getContext('2d')!;
    f.fillStyle = opts.bg;
    f.fillRect(0, 0, w, h);
    f.drawImage(out, 0, 0);
    return flat;
  }
  return out;
}
