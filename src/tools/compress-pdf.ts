import { $, $$, onFiles, downloadBlob, setStatus, setProgress, errorMessage, nextFrame, formatBytes, baseName } from '../lib/ui';
import { loadPdfLib, loadDoc, readFile, pdfBlob, openPdfJs, renderPage, closePdf } from '../lib/pdf';
import { makeCanvas, drawScaled, canvasToBlob } from '../lib/image';

/**
 * Two strategies:
 *  1. "Smart" (default): find every embedded photo/scan in the PDF, downscale + re-encode it as JPEG,
 *     and deflate uncompressed streams. Text, links and vector graphics stay untouched and selectable.
 *  2. "Pages to images": render each page and rebuild the PDF from JPEGs. Biggest savings for scans,
 *     but text is no longer selectable.
 */
const LEVELS = {
  low: { q: 0.82, maxDim: 3000, dpi: 150, label: 'Light' },
  medium: { q: 0.68, maxDim: 2000, dpi: 120, label: 'Recommended' },
  high: { q: 0.5, maxDim: 1400, dpi: 96, label: 'Strong' },
  extreme: { q: 0.4, maxDim: 1000, dpi: 72, label: 'Extreme' },
} as const;
type Level = keyof typeof LEVELS;

const drop = $('#cp-drop');
const panel = $('#cp-panel');
const status = $('#cp-status');
const bar = $('#cp-progress');
const go = $<HTMLButtonElement>('#cp-go');
const dl = $<HTMLButtonElement>('#cp-download');
let file: File | null = null;
let output: Uint8Array | null = null;

onFiles(drop, ([f]) => {
  file = f;
  output = null;
  $('#cp-file').textContent = `${f.name} · ${formatBytes(f.size)}`;
  panel.classList.remove('hidden');
  drop.classList.add('compact');
  $('#cp-result').classList.add('hidden');
  run();
});
go.addEventListener('click', run);
$$<HTMLInputElement>('input[name=cp-level], input[name=cp-mode]').forEach((el) => el.addEventListener('change', () => file && run()));
dl.addEventListener('click', () => output && file && downloadBlob(pdfBlob(output), `${baseName(file.name)}-compressed.pdf`));

async function run() {
  if (!file) return;
  go.disabled = true;
  dl.disabled = true;
  $('#cp-result').classList.add('hidden');
  const level = (document.querySelector<HTMLInputElement>('input[name=cp-level]:checked')?.value || 'medium') as Level;
  const mode = document.querySelector<HTMLInputElement>('input[name=cp-mode]:checked')?.value || 'smart';
  try {
    const input = await readFile(file);
    const out = mode === 'raster' ? await rasterize(input, LEVELS[level]) : await smart(input, LEVELS[level]);
    const saved = 1 - out.length / input.length;
    if (out.length >= input.length) {
      output = input;
      setStatus(status, mode === 'smart'
        ? 'This PDF is already well optimised: it has no large images to shrink. Try "Pages to images" for scanned documents, or keep the original.'
        : 'Converting pages to images would make this file bigger, so we kept the original.', 'warn');
    } else {
      output = out;
      setStatus(status, `Done! ${formatBytes(input.length)} → ${formatBytes(out.length)}`, 'ok');
    }
    $('#cp-before').textContent = formatBytes(input.length);
    $('#cp-after').textContent = formatBytes(output.length);
    $('#cp-saved').textContent = output === input ? '0%' : `−${Math.round(saved * 100)}%`;
    $('#cp-result').classList.remove('hidden');
    dl.disabled = false;
  } catch (e) {
    setStatus(status, errorMessage(e), 'err');
  } finally {
    go.disabled = false;
    bar.classList.add('hidden');
  }
}

// ---------------- Smart image recompression ----------------

async function smart(input: Uint8Array, opt: (typeof LEVELS)[Level]): Promise<Uint8Array> {
  const lib = await loadPdfLib();
  const { PDFName, PDFRawStream, PDFArray, PDFNumber, PDFDict, PDFRef, PDFBool } = lib;
  setStatus(status, 'Reading PDF…', 'info');
  const doc = await loadDoc(input);
  const ctx = doc.context;
  const N = (s: string) => PDFName.of(s);
  const objects = ctx.enumerateIndirectObjects();

  // Never touch images used as soft masks / masks: they must stay greyscale and lossless.
  const maskRefs = new Set<string>();
  for (const [, obj] of objects) {
    if (!(obj instanceof PDFRawStream)) continue;
    for (const key of ['SMask', 'Mask']) {
      const v = obj.dict.get(N(key));
      if (v instanceof PDFRef) maskRefs.add(v.toString());
    }
  }

  const filtersOf = (dict: any): string[] => {
    const f = dict.lookup(N('Filter'));
    if (!f) return [];
    if (f instanceof PDFName) return [f.asString().replace('/', '')];
    if (f instanceof PDFArray) return f.asArray().map((x: any) => String(x.asString?.() ?? x).replace('/', ''));
    return ['?'];
  };
  const components = (dict: any): number => {
    let cs = dict.lookup(N('ColorSpace'));
    if (cs instanceof PDFName) {
      const n = cs.asString();
      return n === '/DeviceRGB' || n === '/CalRGB' ? 3 : n === '/DeviceGray' || n === '/CalGray' ? 1 : 0;
    }
    if (cs instanceof PDFArray) {
      const kind = cs.lookup(0);
      if (kind instanceof PDFName && kind.asString() === '/ICCBased') {
        const icc = cs.lookup(1);
        const n = (icc as any)?.dict?.lookup(N('N'));
        const v = n instanceof PDFNumber ? n.asNumber() : 0;
        return v === 1 || v === 3 ? v : 0;
      }
    }
    return 0;
  };

  const images: [any, any][] = [];
  for (const [ref, obj] of objects) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    const subtype = dict.lookup(N('Subtype'));
    if (subtype === N('Image')) {
      if (maskRefs.has(ref.toString())) continue;
      if (dict.lookup(N('ImageMask')) === PDFBool.True) continue;
      if (dict.lookup(N('Decode'))) continue;
      images.push([ref, obj]);
    } else if (!filtersOf(dict).length && obj.contents.length > 2048) {
      const type = dict.lookup(N('Type'));
      if (type === N('XRef') || type === N('ObjStm') || type === N('Metadata')) continue;
      // Uncompressed content/font streams: deflate them (lossless).
      const z = await deflate(obj.contents);
      if (z.length < obj.contents.length * 0.9) {
        const ns = ctx.stream(z, {});
        for (const [k, v] of dict.entries()) if (k !== N('Length')) ns.dict.set(k, v);
        ns.dict.set(N('Filter'), N('FlateDecode'));
        ctx.assign(ref, ns);
      }
    }
  }

  let done = 0, replaced = 0;
  for (const [ref, obj] of images) {
    done++;
    setStatus(status, `Compressing image ${done} of ${images.length}…`, 'info');
    setProgress(bar, done / Math.max(1, images.length));
    if (done % 3 === 0) await nextFrame();
    const dict = obj.dict;
    const w = (dict.lookup(N('Width')) as any)?.asNumber?.() ?? 0;
    const h = (dict.lookup(N('Height')) as any)?.asNumber?.() ?? 0;
    const bpc = (dict.lookup(N('BitsPerComponent')) as any)?.asNumber?.() ?? 8;
    if (!w || !h || w * h < 64 * 64) continue;
    const filters = filtersOf(dict);
    const n = components(dict);
    if (!n) continue;
    let canvas: HTMLCanvasElement | null = null;
    try {
      if (filters.length === 1 && filters[0] === 'DCTDecode') {
        const bmp = await createImageBitmap(new Blob([obj.contents], { type: 'image/jpeg' }));
        canvas = makeCanvas(bmp.width, bmp.height);
        canvas.getContext('2d')!.drawImage(bmp, 0, 0);
        bmp.close();
      } else if (filters.length === 1 && filters[0] === 'FlateDecode' && bpc === 8 && obj.contents.length > 50_000) {
        const parms = dict.lookup(N('DecodeParms'));
        const predictor = (parms instanceof PDFDict ? (parms.lookup(N('Predictor')) as any)?.asNumber?.() : 1) ?? 1;
        if (predictor !== 1 && predictor < 10) continue;
        let raw = await inflate(obj.contents);
        if (predictor >= 10) raw = pngUnfilter(raw, w, n);
        if (raw.length < w * h * n) continue;
        canvas = makeCanvas(w, h);
        const cx = canvas.getContext('2d')!;
        const id = cx.createImageData(w, h);
        for (let i = 0, j = 0; i < w * h; i++, j += n) {
          id.data[i * 4] = raw[j];
          id.data[i * 4 + 1] = n === 3 ? raw[j + 1] : raw[j];
          id.data[i * 4 + 2] = n === 3 ? raw[j + 2] : raw[j];
          id.data[i * 4 + 3] = 255;
        }
        cx.putImageData(id, 0, 0);
      } else continue;
    } catch { continue; }

    const s = Math.min(1, opt.maxDim / Math.max(canvas.width, canvas.height));
    const target = s < 1 ? drawScaled(canvas, Math.round(canvas.width * s), Math.round(canvas.height * s), '#fff') : canvas;
    const jpg = new Uint8Array(await (await canvasToBlob(target, 'image/jpeg', opt.q)).arrayBuffer());
    if (jpg.length >= obj.contents.length * 0.9) continue;
    const ns = ctx.stream(jpg, {
      Type: 'XObject', Subtype: 'Image', Width: target.width, Height: target.height,
      BitsPerComponent: 8, ColorSpace: 'DeviceRGB', Filter: 'DCTDecode',
    });
    for (const key of ['SMask', 'Intent', 'Interpolate', 'OC', 'Metadata', 'Name']) {
      const v = dict.get(N(key));
      if (v) ns.dict.set(N(key), v);
    }
    ctx.assign(ref, ns);
    replaced++;
  }
  setStatus(status, `Saving… (${replaced} image${replaced === 1 ? '' : 's'} recompressed)`, 'info');
  await nextFrame();
  return doc.save({ useObjectStreams: true, addDefaultPage: false });
}

// ---------------- Rasterize pages ----------------

async function rasterize(input: Uint8Array, opt: (typeof LEVELS)[Level]): Promise<Uint8Array> {
  const { PDFDocument } = await loadPdfLib();
  setStatus(status, 'Opening PDF…', 'info');
  const src = await openPdfJs(input);
  const out = await PDFDocument.create();
  for (let i = 1; i <= src.numPages; i++) {
    setStatus(status, `Rendering page ${i} of ${src.numPages}…`, 'info');
    setProgress(bar, i / src.numPages);
    const page = await src.getPage(i);
    const vp = page.getViewport({ scale: 1, rotation: page.rotate });
    const canvas = await renderPage(src, i, opt.dpi / 72);
    const jpg = new Uint8Array(await (await canvasToBlob(canvas, 'image/jpeg', opt.q + 0.1)).arrayBuffer());
    const img = await out.embedJpg(jpg);
    const p = out.addPage([vp.width, vp.height]);
    p.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
    canvas.width = canvas.height = 1;
  }
  closePdf(src);
  return out.save({ useObjectStreams: true });
}

// ---------------- helpers ----------------

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const res = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}
const inflate = (b: Uint8Array) => pipe(b, new DecompressionStream('deflate'));
const deflate = (b: Uint8Array) => pipe(b, new CompressionStream('deflate'));

/** Undo PNG row filters (PDF Predictor >= 10). */
function pngUnfilter(data: Uint8Array, width: number, bpp: number): Uint8Array {
  const stride = width * bpp;
  const rows = Math.floor(data.length / (stride + 1));
  const out = new Uint8Array(rows * stride);
  for (let y = 0; y < rows; y++) {
    const type = data[y * (stride + 1)];
    const inOff = y * (stride + 1) + 1, o = y * stride, prev = o - stride;
    for (let x = 0; x < stride; x++) {
      const raw = data[inOff + x];
      const a = x >= bpp ? out[o + x - bpp] : 0;
      const b = y > 0 ? out[prev + x] : 0;
      const c = y > 0 && x >= bpp ? out[prev + x - bpp] : 0;
      let v = raw;
      if (type === 1) v = raw + a;
      else if (type === 2) v = raw + b;
      else if (type === 3) v = raw + ((a + b) >> 1);
      else if (type === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      out[o + x] = v & 255;
    }
  }
  return out;
}
