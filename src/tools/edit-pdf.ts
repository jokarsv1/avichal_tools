import { $, $$, onFiles, downloadBlob, setStatus, errorMessage, baseName } from '../lib/ui';
import { loadDoc, readFile, pdfBlob, openPdfJs, closePdf, rasterizePdf } from '../lib/pdf';
import { decodeImage, makeCanvas } from '../lib/image';
import { PdfOverlay } from '../lib/pdf-overlay';

type Tool = 'text' | 'whiteout' | 'highlight' | 'rect' | 'image';
const status = $('#ep-status');
const host = $('#ep-pages');
const overlay = new PdfOverlay(host);
let file: File | null = null;
let tool: Tool = 'text';
const val = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value;

$$<HTMLButtonElement>('[data-tool]').forEach((b) => b.addEventListener('click', () => {
  tool = b.dataset.tool as Tool;
  $$('[data-tool]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  host.classList.toggle('mode-draw', tool !== 'image');
  $('#ep-text-opts').classList.toggle('hidden', tool !== 'text');
  $('#ep-rect-opts').classList.toggle('hidden', tool !== 'rect');
  const hints: Record<Tool, string> = {
    text: 'Click anywhere on a page to add text, then type.',
    whiteout: 'Drag over anything you want to hide (covers it with white). Tick "Flatten" for true redaction.',
    highlight: 'Drag over text to highlight it.',
    rect: 'Drag to draw a box.',
    image: 'Choose an image; it is added to the current page.',
  };
  setStatus(status, hints[tool], 'info');
  if (tool === 'image') ($<HTMLInputElement>('#ep-image')).click();
}));

overlay.onPagePointer = (page, wrap, e) => {
  if (tool === 'image') return;
  const r = wrap.getBoundingClientRect();
  const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
  if (tool === 'text') {
    overlay.add({ kind: 'text', page, fx, fy: Math.max(0, fy - 0.012), fw: 0.1, fh: 0.02, text: 'Type here', sizeFrac: +val('ep-size') / 600, color: val('ep-color') });
    return;
  }
  // Drag to draw a rectangle-type item.
  const style = tool === 'whiteout' ? { fill: '#ffffff', stroke: null, opacity: 1 }
    : tool === 'highlight' ? { fill: '#ffe100', stroke: null, opacity: 0.38 }
    : { fill: null, stroke: val('ep-stroke'), opacity: 1 };
  const it = overlay.add({ kind: 'rect', page, fx, fy, fw: 0.005, fh: 0.005, ...style });
  e.preventDefault();
  const move = (ev: PointerEvent) => {
    const x2 = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), y2 = Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height));
    it.fx = Math.min(fx, x2); it.fy = Math.min(fy, y2);
    it.fw = Math.max(0.005, Math.abs(x2 - fx)); it.fh = Math.max(0.004, Math.abs(y2 - fy));
    overlay.style(it);
  };
  const up = () => {
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', up);
    if (it.fw < 0.01 && it.fh < 0.01) { // a click, not a drag: make a sensible default size
      it.fw = tool === 'highlight' ? 0.25 : 0.2; it.fh = tool === 'highlight' ? 0.022 : 0.05;
      it.fx = Math.min(it.fx, 1 - it.fw); it.fy = Math.min(it.fy, 1 - it.fh);
      overlay.style(it);
    }
  };
  addEventListener('pointermove', move);
  addEventListener('pointerup', up);
};

$<HTMLInputElement>('#ep-image').addEventListener('change', async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  const bmp = await decodeImage(f);
  const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = makeCanvas(bmp.width * s, bmp.height * s);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const wrap = overlay.wrapOf(overlay.currentPage)!;
  const fw = 0.35, fh = (fw * wrap.clientWidth * c.height) / c.width / wrap.clientHeight;
  overlay.add({ kind: 'image', page: overlay.currentPage, png: c, fx: 0.32, fy: 0.3, fw, fh: Math.min(fh, 0.9) }, { keepRatio: true });
  (e.target as HTMLInputElement).value = '';
});

// Apply size/colour changes to the focused text box.
['ep-size', 'ep-color'].forEach((id) => document.getElementById(id)!.addEventListener('input', () => {
  const active = document.activeElement?.closest('.ov-item');
  const it = overlay.items.find((x) => x.el === active);
  if (it && it.kind === 'text') { it.sizeFrac = +val('ep-size') / 600; it.color = val('ep-color'); overlay.style(it); overlay.fitText(it); }
}));

onFiles($('#ep-drop'), async ([f]) => {
  try {
    const bytes = await readFile(f);
    await loadDoc(bytes);
    if (overlay.pdf) closePdf(overlay.pdf);
    file = f;
    $('#ep-panel').classList.remove('hidden');
    $('#ep-drop').classList.add('compact');
    host.classList.add('mode-draw');
    await overlay.load(await openPdfJs(bytes));
    setStatus(status, 'Click anywhere on a page to add text, then type.', 'info');
  } catch (e) { alert(errorMessage(e)); }
});

$('#ep-save').addEventListener('click', async () => {
  if (!file) return;
  overlay.items.filter((i) => i.kind === 'text').forEach((i) => overlay.fitText(i));
  if (!overlay.items.length) return setStatus(status, 'Add some text or shapes first.', 'warn');
  const btn = $<HTMLButtonElement>('#ep-save');
  btn.disabled = true;
  try {
    const doc = await loadDoc(await readFile(file));
    await overlay.apply(doc);
    let bytes = await doc.save({ useObjectStreams: true });
    if (($<HTMLInputElement>('#ep-flatten')).checked) {
      bytes = await rasterizePdf(bytes, 150, 0.85, (i, n) => setStatus(status, `Flattening page ${i} of ${n}…`, 'info'));
    }
    downloadBlob(pdfBlob(bytes), `${baseName(file.name)}-edited.pdf`);
    setStatus(status, 'Edited PDF downloaded.', 'ok');
  } catch (e) { setStatus(status, errorMessage(e), 'err'); }
  btn.disabled = false;
});

