/** PDF helpers. pdf-lib (MIT) edits PDFs; pdf.js (Apache-2.0) renders them. Both load only when needed. */
import type * as PdfLib from 'pdf-lib';

export const loadPdfLib = () => import('pdf-lib');

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;
export function loadPdfJs() {
  // The "legacy" build supports older Android/iOS browsers, which matters for low-end phones.
  pdfjsPromise ??= (async () => {
    const [lib, worker] = await Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs') as Promise<typeof import('pdfjs-dist')>,
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]);
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    return lib;
  })();
  return pdfjsPromise;
}

export async function openPdfJs(bytes: Uint8Array, password?: string) {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({
    data: bytes.slice(), // pdf.js transfers (detaches) the buffer, so give it a copy
    password,
    cMapUrl: '/vendor/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/vendor/pdfjs/standard_fonts/',
    wasmUrl: '/vendor/pdfjs/wasm/',
    iccUrl: '/vendor/pdfjs/iccs/',
    isEvalSupported: false,
  } as any);
  return task.promise;
}

/** Render one page (1-based) into a new canvas at the given scale (1 = 72 DPI). */
export async function renderPage(doc: any, pageNo: number, scale: number, opts: { rotate?: number; white?: boolean } = {}) {
  const page = await doc.getPage(pageNo);
  const viewport = page.getViewport({ scale, rotation: ((page.rotate || 0) + (opts.rotate || 0)) % 360 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext('2d')!;
  if (opts.white !== false) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  await page.render({ canvas, viewport }).promise;
  page.cleanup();
  return canvas;
}

/** Thumbnail that fits within `maxPx` on its longest side. */
export async function renderThumb(doc: any, pageNo: number, maxPx = 220, rotate = 0) {
  const page = await doc.getPage(pageNo);
  const vp = page.getViewport({ scale: 1, rotation: ((page.rotate || 0) + rotate) % 360 });
  const scale = Math.min(maxPx / vp.width, maxPx / vp.height) * Math.min(2, window.devicePixelRatio || 1);
  return renderPage(doc, pageNo, scale, { rotate });
}

export async function readFile(f: File): Promise<Uint8Array> {
  return new Uint8Array(await f.arrayBuffer());
}

/** Load with pdf-lib, giving a friendly error for encrypted files. */
export async function loadDoc(bytes: Uint8Array): Promise<PdfLib.PDFDocument> {
  const { PDFDocument } = await loadPdfLib();
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (e: any) {
    if (/encrypt/i.test(String(e?.message))) {
      // Owner-password-only PDFs (printing/editing restrictions) can still be processed.
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      if ((doc as any).isEncrypted) throw new Error('This PDF is password-protected. Remove the password with Unlock PDF (/unlock-pdf) first, then try again.');
      return doc;
    }
    throw new Error('This file does not look like a valid PDF.');
  }
}

export function pdfBlob(bytes: Uint8Array) {
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}

/**
 * Parse "1-3, 5, 8-" into sorted unique 1-based page numbers.
 * Returns null for invalid input.
 */
export function parsePages(input: string, max: number): number[] | null {
  const out = new Set<number>();
  const s = input.replace(/\s+/g, '');
  if (!s) return null;
  for (const part of s.split(',')) {
    if (!part) continue;
    const m = part.match(/^(\d*)-(\d*)$/);
    if (m) {
      const a = m[1] ? +m[1] : 1, b = m[2] ? +m[2] : max;
      if (a < 1 || b > max || a > b) return null;
      for (let i = a; i <= b; i++) out.add(i);
    } else if (/^\d+$/.test(part)) {
      const n = +part;
      if (n < 1 || n > max) return null;
      out.add(n);
    } else return null;
  }
  return [...out].sort((a, b) => a - b);
}

/** Parse "1-3, 4-6, 7" into separate groups (for split into multiple files). */
export function parseGroups(input: string, max: number): number[][] | null {
  const groups: number[][] = [];
  for (const part of input.split(',').map((p) => p.trim()).filter(Boolean)) {
    const g = parsePages(part, max);
    if (!g) return null;
    groups.push(g);
  }
  return groups.length ? groups : null;
}

/** Free a pdf.js document (v6 moved destroy() to the loading task). */
export function closePdf(doc: any) {
  try { (doc?.loadingTask?.destroy ?? doc?.destroy)?.call(doc.loadingTask ?? doc); } catch { /* ignore */ }
}

/**
 * Re-create a PDF where every page is an image ("flatten"). Used for strong compression and for
 * true redaction: anything hidden under a white box is gone for good, not just covered.
 */
export async function rasterizePdf(input: Uint8Array, dpi: number, quality: number, onPage?: (i: number, n: number) => void): Promise<Uint8Array> {
  const { PDFDocument } = await loadPdfLib();
  const src = await openPdfJs(input);
  const out = await PDFDocument.create();
  for (let i = 1; i <= src.numPages; i++) {
    onPage?.(i, src.numPages);
    const page = await src.getPage(i);
    const vp = page.getViewport({ scale: 1, rotation: page.rotate });
    const canvas = await renderPage(src, i, dpi / 72);
    const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', quality));
    const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    out.addPage([vp.width, vp.height]).drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
    canvas.width = canvas.height = 1;
  }
  closePdf(src);
  return out.save({ useObjectStreams: true });
}
