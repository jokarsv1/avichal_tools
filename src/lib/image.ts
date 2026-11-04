/** Image decoding/encoding helpers. Everything uses the browser's own codecs (canvas), so it is fast and free. */

export type OutType = 'image/jpeg' | 'image/png' | 'image/webp';

export function isHeicFile(f: File) {
  return /\.(heic|heif)$/i.test(f.name) || /image\/hei[cf]/i.test(f.type);
}

/** Decode any supported image (incl. iPhone HEIC) to an ImageBitmap with EXIF orientation applied. */
export async function decodeImage(file: Blob & { name?: string }): Promise<ImageBitmap> {
  const asFile = file as File;
  if (asFile.name && isHeicFile(asFile)) {
    // Safari can decode HEIC natively; everywhere else we lazy-load libheif (~3 MB, only on HEIC pages).
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* fall through */ }
    const { heicTo } = await import('heic-to');
    const bmp = (await heicTo({ blob: file, type: 'bitmap' })) as unknown as ImageBitmap;
    return bmp;
  }
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // SVG and some odd formats need an <img> element first.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      const w = img.naturalWidth || 1024, hgt = img.naturalHeight || 1024;
      return await createImageBitmap(img, { resizeWidth: w, resizeHeight: hgt });
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** High-quality downscale (multi-step halving avoids aliasing on big reductions). */
export function drawScaled(src: CanvasImageSource & { width: number; height: number }, w: number, h: number, bg?: string): HTMLCanvasElement {
  let cur: CanvasImageSource & { width: number; height: number } = src;
  let cw = src.width, ch = src.height;
  while (cw / 2 >= w && ch / 2 >= h) {
    const step = makeCanvas(cw / 2, ch / 2);
    const sctx = step.getContext('2d')!;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(cur, 0, 0, step.width, step.height);
    cur = step; cw = step.width; ch = step.height;
  }
  const out = makeCanvas(w, h);
  const ctx = out.getContext('2d')!;
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, out.width, out.height); }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cur, 0, 0, out.width, out.height);
  return out;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: OutType, quality?: number): Promise<Blob> {
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Your browser could not encode this image.'))), type, quality),
  );
}

/** Flatten transparency onto a colour (JPEG has no alpha). */
export function flatten(canvas: HTMLCanvasElement, bg = '#ffffff'): HTMLCanvasElement {
  const out = makeCanvas(canvas.width, canvas.height);
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);
  return out;
}

let webpOk: boolean | null = null;
export async function canEncodeWebp(): Promise<boolean> {
  if (webpOk !== null) return webpOk;
  const b = await canvasToBlob(makeCanvas(2, 2), 'image/webp', 0.8).catch(() => null);
  return (webpOk = !!b && b.type === 'image/webp');
}

export const extFor = (t: string) => (t === 'image/png' ? 'png' : t === 'image/webp' ? 'webp' : 'jpg');

/* ---------------- JPEG byte-level tricks (for exam portals) ---------------- */

/**
 * Write DPI into the JPEG's JFIF header. Some portals (e.g. PAN) check DPI.
 * Canvas JPEGs ship with a JFIF APP0 segment; if it is missing we insert one.
 */
export function setJpegDpi(bytes: Uint8Array, dpi: number): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const d = Math.max(1, Math.min(65535, Math.round(dpi)));
  if (bytes[2] === 0xff && bytes[3] === 0xe0 && bytes[6] === 0x4a && bytes[7] === 0x46 && bytes[8] === 0x49 && bytes[9] === 0x46) {
    const out = bytes.slice();
    out[13] = 1; // units: dots per inch
    out[14] = d >> 8; out[15] = d & 255;
    out[16] = d >> 8; out[17] = d & 255;
    return out;
  }
  const app0 = new Uint8Array([0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 1, d >> 8, d & 255, d >> 8, d & 255, 0, 0]);
  const out = new Uint8Array(bytes.length + app0.length);
  out.set(bytes.subarray(0, 2), 0);
  out.set(app0, 2);
  out.set(bytes.subarray(2), 2 + app0.length);
  return out;
}

/**
 * Grow a JPEG to at least `minBytes` by inserting COM (comment) segments right after SOI.
 * Image data is untouched, so quality is identical. Fixes "file must be at least 20 KB" errors.
 */
export function padJpeg(bytes: Uint8Array, minBytes: number): Uint8Array {
  let need = minBytes - bytes.length;
  if (need <= 0 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const segs: Uint8Array[] = [];
  while (need > 0) {
    const payload = Math.min(65533, Math.max(1, need - 4));
    const seg = new Uint8Array(payload + 4);
    seg[0] = 0xff; seg[1] = 0xfe;
    seg[2] = (payload + 2) >> 8; seg[3] = (payload + 2) & 255;
    seg.fill(0x20, 4); // spaces
    segs.push(seg);
    need -= seg.length;
  }
  // Insert after the JFIF APP0 if present (keeps JFIF first, as some validators expect).
  let at = 2;
  if (bytes[2] === 0xff && bytes[3] === 0xe0) at = 4 + ((bytes[4] << 8) | bytes[5]);
  const total = bytes.length + segs.reduce((s, x) => s + x.length, 0);
  const out = new Uint8Array(total);
  out.set(bytes.subarray(0, at), 0);
  let off = at;
  for (const s of segs) { out.set(s, off); off += s.length; }
  out.set(bytes.subarray(at), off);
  return out;
}

export interface TargetResult {
  blob: Blob;
  quality: number;
  width: number;
  height: number;
  padded: boolean;
  /** true if we had to shrink the pixel size to get under the limit */
  downscaled: boolean;
  /** true if the max limit could not be met */
  overLimit: boolean;
}

/**
 * Encode a canvas so the file lands between minBytes and maxBytes.
 * 1) binary-search JPEG/WebP quality, 2) if still too big and allowed, shrink dimensions,
 * 3) if too small, pad (JPEG only). Also writes DPI for JPEG.
 */
export async function encodeToTarget(
  canvas: HTMLCanvasElement,
  opts: { maxBytes: number; minBytes?: number; type?: OutType; dpi?: number; allowDownscale?: boolean },
): Promise<TargetResult> {
  const type = opts.type ?? 'image/jpeg';
  const minBytes = opts.minBytes ?? 0;
  const finalize = async (blob: Blob, q: number, c: HTMLCanvasElement, downscaled: boolean): Promise<TargetResult> => {
    let bytes = new Uint8Array(await blob.arrayBuffer());
    let padded = false;
    if (type === 'image/jpeg') {
      if (opts.dpi) bytes = setJpegDpi(bytes, opts.dpi) as Uint8Array<ArrayBuffer>;
      if (minBytes && bytes.length < minBytes) {
        const goal = Math.min(opts.maxBytes, minBytes + Math.min(2048, Math.max(0, (opts.maxBytes - minBytes) / 4)));
        bytes = padJpeg(bytes, Math.max(minBytes, goal)) as Uint8Array<ArrayBuffer>;
        padded = true;
      }
    }
    const out = new Blob([bytes as BlobPart], { type });
    return { blob: out, quality: q, width: c.width, height: c.height, padded, downscaled, overLimit: out.size > opts.maxBytes };
  };

  if (type === 'image/png') {
    const b = await canvasToBlob(canvas, type);
    return finalize(b, 1, canvas, false);
  }

  let c = canvas;
  let downscaled = false;
  // Leave headroom for the DPI header / rounding.
  const limit = opts.maxBytes - 64;
  // When we may shrink pixels, never go below this quality: a smaller sharp photo beats a big blocky one.
  const floor = opts.allowDownscale ? 0.6 : 0.05;
  const search = async (lo: number, top: number) => {
    let best: Blob | null = null, bestQ = lo;
    for (let i = 0; i < 7; i++) {
      const mid = (lo + top) / 2;
      const b = await canvasToBlob(c, type, mid);
      if (b.size <= limit) { best = b; bestQ = mid; lo = mid; } else { top = mid; }
    }
    return { best, bestQ };
  };
  for (let attempt = 0; attempt < 12; attempt++) {
    const hi = await canvasToBlob(c, type, 0.95);
    if (hi.size <= limit) return finalize(hi, 0.95, c, downscaled);
    const atFloor = await canvasToBlob(c, type, floor);
    if (atFloor.size <= limit) {
      const { best, bestQ } = await search(floor, 0.95);
      return finalize(best ?? atFloor, best ? bestQ : floor, c, downscaled);
    }
    if (!opts.allowDownscale) return finalize(atFloor, floor, c, downscaled);
    if (c.width <= 32 || c.height <= 32) return finalize(atFloor, floor, c, downscaled);
    // Too big even at the quality floor: shrink proportionally to the overshoot and retry.
    const scale = Math.max(0.3, Math.min(0.9, Math.sqrt(limit / atFloor.size) * 0.95));
    c = drawScaled(c, Math.max(16, c.width * scale), Math.max(16, c.height * scale));
    downscaled = true;
  }
  const b = await canvasToBlob(c, type, floor);
  return finalize(b, floor, c, downscaled);
}

/**
 * Make a phone photo of a signature look scanned: white paper, dark crisp ink.
 * Estimates paper brightness, stretches levels and clips near-white to pure white.
 */
export function cleanSignature(canvas: HTMLCanvasElement, strength = 0.85): HTMLCanvasElement {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) hist[(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0]++;
  const total = d.length / 4;
  const pct = (p: number) => { let acc = 0; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * p) return v; } return 255; };
  // Paper dominates a signature photo, so the 60th percentile is paper; ink is the darkest 0.5 %.
  const paper = pct(0.6);
  const ink = Math.min(pct(0.005), paper * 0.5);
  // Anything within the paper's noise band (shadows, grain) becomes pure white.
  const white = Math.max(ink + 8, paper - Math.max(12, paper * 0.08) * (0.5 + strength));
  const range = Math.max(1, white - ink);
  for (let i = 0; i < d.length; i += 4) {
    const l = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    if (l >= white) { d[i] = d[i + 1] = d[i + 2] = 255; continue; }
    const t = Math.max(0, (l - ink) / range); // 0 = ink, 1 = paper
    const k = t * t; // push mid-tones towards ink for crisp strokes
    for (let c = 0; c < 3; c++) d[i + c] = Math.round(d[i + c] * (1 - k) * 0.75 + 255 * k);
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Lossy PNG compression via colour quantisation (UPNG.js). cnum = number of colours (0 = lossless). */
export async function compressPng(canvas: HTMLCanvasElement, cnum: number): Promise<Blob> {
  const mod: any = await import('upng-js');
  const UPNG = mod.default ?? mod;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const buf = UPNG.encode([data.buffer], canvas.width, canvas.height, cnum);
  return new Blob([buf], { type: 'image/png' });
}
