import { onFiles, downloadBlob, baseName, track, setStatus } from '../lib/ui';
import { decodeImage, makeCanvas, drawScaled, encodeToTarget, cleanSignature, extFor, type OutType, type TargetResult } from '../lib/image';
import type { ImageSpec } from '../data/exams';

/** Largest side kept in memory for editing. Phone photos (4000+ px) are reduced once on load. */
const WORK_MAX = 2400;

export function initKbResizer(root: HTMLElement) {
  const q = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector(s) as T;
  const presets: ImageSpec[] = JSON.parse(root.dataset.presets || '[]');
  const editor = q('.kb-editor');
  const drop = q('#kb-drop');
  const view = q<HTMLCanvasElement>('.kb-view');
  const zoomEl = q<HTMLInputElement>('.kb-zoom');
  const presetEl = q<HTMLSelectElement>('.kb-preset');
  const minEl = q<HTMLInputElement>('.kb-min');
  const maxEl = q<HTMLInputElement>('.kb-max');
  const wEl = q<HTMLInputElement>('.kb-w');
  const hEl = q<HTMLInputElement>('.kb-h');
  const dpiEl = q<HTMLInputElement>('.kb-dpi');
  const fmtEl = q<HTMLSelectElement>('.kb-fmt');
  const cleanEl = q<HTMLInputElement>('.kb-clean');
  const grayEl = q<HTMLInputElement>('.kb-gray');
  const whiteEl = q<HTMLInputElement>('.kb-white');
  const statusEl = q('.kb-status');
  const outImg = q<HTMLImageElement>('.kb-out-img');
  const dlBtn = q<HTMLButtonElement>('.kb-download');

  let src: HTMLCanvasElement | null = null; // working copy, already rotated
  let original: HTMLCanvasElement | null = null;
  let whitened: HTMLCanvasElement | null = null;
  let fileName = 'photo';
  let zoom = 1, panX = 0, panY = 0;
  let fit: 'cover' | 'contain' = 'cover';
  let result: TargetResult | null = null;
  let runId = 0;

  // ---------- presets ----------
  const urlPreset = new URLSearchParams(location.search).get('preset');
  const initial = presets.find((p) => p.id === urlPreset) ? urlPreset! : root.dataset.default || 'custom';
  presetEl.value = presets.some((p) => p.id === initial) ? initial : 'custom';
  if (root.dataset.signature === '1') cleanEl.checked = true;

  function applyPreset(id: string) {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    minEl.value = p.minKB ? String(p.minKB) : '';
    maxEl.value = String(p.maxKB);
    wEl.value = p.width ? String(p.width) : '';
    hEl.value = p.height ? String(p.height) : '';
    dpiEl.value = p.dpi ? String(p.dpi) : '';
    fmtEl.value = 'image/jpeg';
    cleanEl.checked = p.kind === 'signature' || p.kind === 'thumb' || p.kind === 'document' ? true : root.dataset.signature === '1' && p.kind !== 'photo';
    zoom = 1; panX = 0; panY = 0; zoomEl.value = '1';
  }
  applyPreset(presetEl.value);
  if (!maxEl.value) maxEl.value = '50';
  presetEl.addEventListener('change', () => { applyPreset(presetEl.value); redraw(); schedule(); });
  [minEl, maxEl, wEl, hEl, dpiEl].forEach((el) => el.addEventListener('input', () => { if (presetEl.value !== 'custom') presetEl.value = 'custom'; redraw(); schedule(); }));
  [fmtEl, cleanEl, grayEl].forEach((el) => el.addEventListener('change', () => { redraw(); schedule(); }));

  // ---------- target geometry ----------
  function target(): { W: number; H: number; crop: boolean } {
    if (!src) return { W: 1, H: 1, crop: false };
    const iw = src.width, ih = src.height;
    let W = parseInt(wEl.value) || 0, H = parseInt(hEl.value) || 0;
    if (W && H) return { W, H, crop: true };
    if (W) return { W, H: Math.round((W * ih) / iw), crop: false };
    if (H) return { W: Math.round((H * iw) / ih), H, crop: false };
    return { W: iw, H: ih, crop: false };
  }

  function geometry(W: number, H: number) {
    const iw = src!.width, ih = src!.height;
    const base = fit === 'cover' ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih);
    const s = base * zoom;
    const dw = iw * s, dh = ih * s;
    // Keep the frame filled in cover mode.
    const maxX = Math.max(0, (dw - W) / 2 / W), maxY = Math.max(0, (dh - H) / 2 / H);
    if (fit === 'cover') { panX = Math.max(-maxX, Math.min(maxX, panX)); panY = Math.max(-maxY, Math.min(maxY, panY)); }
    return { dw, dh, x: (W - dw) / 2 + panX * W, y: (H - dh) / 2 + panY * H };
  }

  function paint(canvas: HTMLCanvasElement, W: number, H: number, final: boolean) {
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    const g = geometry(W, H);
    if (final) {
      // Downscale in steps for sharp, alias-free small photos.
      const scaled = g.dw < src!.width ? drawScaled(src!, Math.max(1, Math.round(g.dw)), Math.max(1, Math.round(g.dh))) : src!;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(scaled, g.x, g.y, g.dw, g.dh);
    } else {
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(src!, g.x, g.y, g.dw, g.dh);
    }
  }

  function redraw() {
    if (!src) return;
    const { W, H, crop } = target();
    const maxView = Math.min(view.parentElement!.clientWidth - 20 || 360, 420);
    const scale = Math.min(maxView / W, 380 / H);
    view.width = Math.max(1, Math.round(W * scale));
    view.height = Math.max(1, Math.round(H * scale));
    paint(view, view.width, view.height, false);
    const cropTools = q('.kb-crop-tools');
    zoomEl.disabled = !crop;
    q('.kb-drag-hint').classList.toggle('hidden', !crop);
    cropTools.querySelectorAll<HTMLButtonElement>('.kb-fit').forEach((b) => (b.disabled = !crop));
  }

  // ---------- pan & zoom ----------
  let drag: { x: number; y: number; px: number; py: number } | null = null;
  view.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, px: panX, py: panY }; view.setPointerCapture(e.pointerId); });
  view.addEventListener('pointermove', (e) => {
    if (!drag) return;
    panX = drag.px + (e.clientX - drag.x) / view.clientWidth;
    panY = drag.py + (e.clientY - drag.y) / view.clientHeight;
    redraw();
  });
  const endDrag = () => { if (drag) { drag = null; schedule(); } };
  view.addEventListener('pointerup', endDrag);
  view.addEventListener('pointercancel', endDrag);
  view.addEventListener('wheel', (e) => {
    if (zoomEl.disabled) return;
    e.preventDefault();
    zoom = Math.max(1, Math.min(4, zoom * (e.deltaY < 0 ? 1.06 : 0.94)));
    zoomEl.value = String(zoom);
    redraw(); schedule();
  }, { passive: false });
  zoomEl.addEventListener('input', () => { zoom = parseFloat(zoomEl.value); redraw(); schedule(); });
  root.querySelectorAll<HTMLButtonElement>('.kb-fit').forEach((b) => b.addEventListener('click', () => {
    fit = b.dataset.fit as 'cover' | 'contain';
    root.querySelectorAll('.kb-fit').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    panX = panY = 0; redraw(); schedule();
  }));
  q('.kb-rotate').addEventListener('click', () => {
    if (!src) return;
    const r = makeCanvas(src.height, src.width);
    const ctx = r.getContext('2d')!;
    ctx.translate(r.width, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(src, 0, 0);
    src = original = r; whitened = null; panX = panY = 0;
    if (whiteEl.checked) applyWhite(); else { redraw(); schedule(); }
  });

  async function applyWhite() {
    if (!original) return;
    if (!whiteEl.checked) { src = original; redraw(); schedule(); return; }
    setStatus(statusEl, '', 'info'); statusEl.textContent = 'Making the background white (AI on your device)…';
    try {
      const { removeBackground } = await import('../lib/segment');
      whitened ??= await removeBackground(original, { bg: '#ffffff', feather: 1, tightness: 1.6 });
      src = whitened; redraw(); schedule();
    } catch (e) { setStatus(statusEl, '', 'err'); statusEl.textContent = 'Could not change the background.'; }
  }
  whiteEl.addEventListener('change', applyWhite);

  // ---------- processing ----------
  let timer: number | undefined;
  function schedule() { clearTimeout(timer); timer = window.setTimeout(process, 250); }

  async function process() {
    if (!src) return;
    const id = ++runId;
    const { W, H } = target();
    const maxKB = parseFloat(maxEl.value) || 0;
    const minKB = parseFloat(minEl.value) || 0;
    if (!maxKB) { setStatus(statusEl, '', 'warn'); statusEl.textContent = 'Enter a maximum size in KB.'; return; }
    setStatus(statusEl, '', 'info'); statusEl.textContent = 'Compressing…';
    dlBtn.disabled = true;

    const out = makeCanvas(W, H);
    paint(out, W, H, true);
    if (cleanEl.checked) cleanSignature(out);
    if (grayEl.checked) {
      const ctx = out.getContext('2d', { willReadFrequently: true })!;
      const img = ctx.getImageData(0, 0, W, H);
      for (let i = 0; i < img.data.length; i += 4) {
        const l = img.data[i] * 0.299 + img.data[i + 1] * 0.587 + img.data[i + 2] * 0.114;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = l;
      }
      ctx.putImageData(img, 0, 0);
    }
    const type = fmtEl.value as OutType;
    const maxBytes = Math.floor(maxKB * 1000);
    let minBytes = Math.ceil(minKB * 1024);
    if (minBytes > maxBytes) minBytes = Math.floor(maxBytes * 0.97);
    const fixedDims = !!(parseInt(wEl.value) || parseInt(hEl.value));
    const dpi = parseInt(dpiEl.value) || (fixedDims ? 0 : 0);
    const r = await encodeToTarget(out, { maxBytes, minBytes, type, dpi: dpi || undefined, allowDownscale: !fixedDims });
    if (id !== runId) return; // a newer run started
    result = r;
    showResult(r, minKB, maxKB, fixedDims);
  }

  function showResult(r: TargetResult, minKB: number, maxKB: number, fixedDims: boolean) {
    const size = r.blob.size;
    q('.kb-out-size').textContent = `${(size / 1024).toFixed(1)} KB`;
    q('.kb-out-bytes').textContent = `${size.toLocaleString('en-IN')} bytes`;
    q('.kb-out-dim').textContent = `${r.width} × ${r.height}`;
    const okMin = !minKB || size >= minKB * 1024 - 1;
    const okMax = size <= maxKB * 1000;
    const check = q('.kb-out-check');
    check.textContent = okMin && okMax ? '✓ Pass' : '✗ Check';
    check.style.color = okMin && okMax ? 'var(--ok)' : 'var(--err)';
    q('.kb-out-range').textContent = minKB ? `${minKB}–${maxKB} KB` : `≤ ${maxKB} KB`;
    if (outImg.src) URL.revokeObjectURL(outImg.src);
    outImg.src = URL.createObjectURL(r.blob);
    const notes: string[] = [];
    if (r.blob.type !== 'image/png') notes.push(`Quality ${Math.round(r.quality * 100)}%`);
    if (r.padded) notes.push('padded to meet the minimum size (picture unchanged)');
    if (r.downscaled) notes.push('pixel size reduced to fit the limit');
    if (parseInt(dpiEl.value) && r.blob.type === 'image/jpeg') notes.push(`${dpiEl.value} DPI written`);
    if (r.overLimit) {
      setStatus(statusEl, '', 'err'); statusEl.textContent = fixedDims
        ? `Could not get under ${maxKB} KB at ${r.width}×${r.height} px. Use a smaller pixel size, or choose JPG.`
        : `Could not get under ${maxKB} KB. Try JPG format or a smaller size.`;
    } else if (!okMin) {
      setStatus(statusEl, '', 'warn'); statusEl.textContent = 'File is below the minimum size. Choose JPG format so it can be padded.';
    } else {
      setStatus(statusEl, '', 'ok'); statusEl.textContent = `Ready: ${notes.join(' · ')}`;
    }
    dlBtn.disabled = false;
  }

  dlBtn.addEventListener('click', () => {
    if (!result) return;
    const kb = Math.round(result.blob.size / 1024);
    const preset = presetEl.value !== 'custom' ? `-${presetEl.value}` : '';
    downloadBlob(result.blob, `${baseName(fileName)}${preset}-${kb}kb.${extFor(result.blob.type)}`);
    track('kb_resize', { preset: presetEl.value, kb });
  });
  q('.kb-reset').addEventListener('click', () => {
    src = null; result = null;
    editor.classList.add('hidden');
    drop.classList.remove('hidden');
  });

  onFiles(drop, async (files) => {
    const f = files[0];
    fileName = f.name;
    setStatus(statusEl, '', 'info'); statusEl.textContent = 'Loading photo…';
    try {
      const bmp = await decodeImage(f);
      const s = Math.min(1, WORK_MAX / Math.max(bmp.width, bmp.height));
      src = s < 1 ? drawScaled(bmp, Math.round(bmp.width * s), Math.round(bmp.height * s)) : (() => {
        const c = makeCanvas(bmp.width, bmp.height); c.getContext('2d')!.drawImage(bmp, 0, 0); return c;
      })();
      bmp.close?.();
      original = src; whitened = null;
      zoom = 1; panX = panY = 0; zoomEl.value = '1';
      drop.classList.add('hidden');
      editor.classList.remove('hidden');
      redraw();
      if (whiteEl.checked) await applyWhite(); else process();
    } catch (e) {
      alert('Could not open this image. ' + (e instanceof Error ? e.message : ''));
    }
  });
  window.addEventListener('resize', () => redraw());
}
