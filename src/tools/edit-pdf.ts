import { $, $$, onFiles, downloadBlob, setStatus, errorMessage, baseName, track, h } from '../lib/ui';
import { loadDoc, readFile, pdfBlob, openPdfJs, closePdf, rasterizePdf, loadPdfJs, loadPdfLib } from '../lib/pdf';
import { decodeImage, makeCanvas } from '../lib/image';
import { PdfOverlay, type OverlayItem } from '../lib/pdf-overlay';

type Tool = 'edittext' | 'text' | 'whiteout' | 'highlight' | 'rect' | 'draw' | 'tick' | 'image';
const status = $('#ep-status');
const host = $('#ep-pages');
const overlay = new PdfOverlay(host);
let file: File | null = null;
let tool: Tool = 'edittext';
const val = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value;

// ---------- Undo: every action pushes a function that reverses it ----------
const history: (() => void)[] = [];
const undoBtn = $<HTMLButtonElement>('#ep-undo');
function pushUndo(fn: () => void) { history.push(fn); undoBtn.disabled = false; }
function addItem(partial: Omit<OverlayItem, 'el'>, opts?: { keepRatio?: boolean; select?: boolean }) {
  const it = overlay.add(partial, opts);
  pushUndo(() => overlay.remove(it));
  return it;
}
undoBtn.addEventListener('click', () => { history.pop()?.(); undoBtn.disabled = !history.length; });
addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !(e.target as HTMLElement).isContentEditable && file) { e.preventDefault(); undoBtn.click(); }
});

const HINTS: Record<Tool, string> = {
  edittext: 'Click any text in the PDF to change it. The old words are covered and you type the new ones in the same place and size.',
  text: 'Click anywhere on a page to add new text, then type.',
  whiteout: 'Drag over anything you want to hide (covers it with white). Tick "Flatten" for true redaction.',
  highlight: 'Drag over text to highlight it.',
  rect: 'Drag to draw a box.',
  draw: 'Draw with your mouse or finger. Each stroke can be moved or deleted.',
  tick: 'Click where you want a ✓ tick mark (handy for forms).',
  image: 'Choose an image; it is added to the current page.',
};
function setTool(t: Tool) {
  tool = t;
  $$('.ep-tools [data-tool]').forEach((x) => x.setAttribute('aria-pressed', String((x as HTMLElement).dataset.tool === t)));
  host.classList.toggle('mode-draw', t !== 'image');
  host.classList.toggle('mode-edittext', t === 'edittext');
  host.classList.toggle('mode-pen', t === 'draw');
  $('#ep-text-opts').classList.toggle('hidden', !['text', 'tick', 'edittext'].includes(t));
  $('#ep-rect-opts').classList.toggle('hidden', t !== 'rect');
  $('#ep-pen-opts').classList.toggle('hidden', t !== 'draw');
  setStatus(status, HINTS[t], 'info');
  if (t === 'edittext') host.querySelectorAll<HTMLElement>('.ov-page').forEach((w) => { if (w.querySelector('.ov-canvas')) addTextRuns(w); });
  if (t === 'image') $<HTMLInputElement>('#ep-image').click();
}
$$<HTMLButtonElement>('.ep-tools [data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool as Tool)));

// ---------- Edit existing text: clickable boxes over each line of text ----------
async function addTextRuns(wrap: HTMLElement) {
  if (wrap.dataset.runs || !overlay.pdf) return;
  wrap.dataset.runs = '1';
  const pdfjs = await loadPdfJs();
  const pageNo = +wrap.dataset.page!;
  const page = await overlay.pdf.getPage(pageNo);
  const vp1 = page.getViewport({ scale: 1, rotation: page.rotate });
  const W = wrap.clientWidth, H = wrap.clientHeight;
  const vp = page.getViewport({ scale: W / vp1.width, rotation: page.rotate });
  const tc = await page.getTextContent();
  type Run = { str: string; x: number; yb: number; w: number; h: number };
  const runs: Run[] = [];
  for (const item of tc.items as any[]) {
    if (typeof item.str !== 'string' || !item.str.trim()) continue;
    const tx = pdfjs.Util.transform(vp.transform, item.transform);
    const fh = Math.hypot(tx[2], tx[3]);
    if (fh < 3 || Math.abs(tx[1]) > 0.05 * fh || Math.abs(tx[2]) > 0.05 * fh) continue; // skip tiny or rotated text
    runs.push({ str: item.str, x: tx[4], yb: tx[5], w: item.width * vp.scale, h: fh });
  }
  // Join pieces that sit on the same line into one editable run.
  runs.sort((a, b) => a.yb - b.yb || a.x - b.x);
  const lines: Run[] = [];
  for (const r of runs) {
    const p = lines[lines.length - 1];
    const gap = p ? r.x - (p.x + p.w) : Infinity;
    if (p && Math.abs(r.yb - p.yb) < 0.3 * p.h && gap > -0.5 * p.h && gap < 0.9 * p.h && Math.abs(r.h - p.h) < 0.25 * p.h) {
      p.str += (gap > 0.12 * p.h && !p.str.endsWith(' ') && !r.str.startsWith(' ') ? ' ' : '') + r.str;
      p.w = r.x + r.w - p.x;
    } else lines.push({ ...r });
  }
  for (const r of lines) {
    const top = r.yb - r.h * 0.88, ht = r.h * 1.18;
    const btn = h('button', { type: 'button', class: 'ov-run', title: 'Click to edit this text', 'aria-label': `Edit text: ${r.str.trim()}`, style: `left:${(r.x / W) * 100}%;top:${(top / H) * 100}%;width:${(r.w / W) * 100}%;height:${(ht / H) * 100}%` });
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    btn.addEventListener('click', () => {
      const pad = r.h * 0.12;
      const cover = overlay.add({ kind: 'rect', page: pageNo, fx: (r.x - pad) / W, fy: (top - pad) / H, fw: (r.w + 2 * pad) / W, fh: (ht + 2 * pad) / H, fill: '#ffffff', stroke: null, opacity: 1 });
      const text = overlay.add({ kind: 'text', page: pageNo, fx: (r.x - 0.12 * r.h) / W, fy: (r.yb - 0.98 * r.h) / H, fw: r.w / W, fh: (r.h * 1.25) / H, text: r.str.trim(), sizeFrac: r.h / W, color: val('ep-color') });
      btn.hidden = true;
      pushUndo(() => { overlay.remove(text); overlay.remove(cover); btn.hidden = false; });
      track('pdf_text_edited');
    });
    wrap.append(btn);
  }
  if (!lines.length && pageNo === 1) setStatus(status, 'This page has no editable text (it may be a scan). Use White-out and Text instead, or run Image to Text first.', 'warn');
}
// Pages render lazily; add runs to newly visible pages while in edit-text mode.
new MutationObserver(() => { if (tool === 'edittext') host.querySelectorAll<HTMLElement>('.ov-page').forEach((w) => { if (w.querySelector('.ov-canvas')) addTextRuns(w); }); }).observe(host, { subtree: true, childList: true });

// ---------- Clicks and drags on a page ----------
overlay.onPagePointer = (page, wrap, e) => {
  if (tool === 'image' || tool === 'edittext') return;
  const r = wrap.getBoundingClientRect();
  const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
  if (tool === 'text' || tool === 'tick') {
    const tick = tool === 'tick';
    addItem({ kind: 'text', page, fx, fy: Math.max(0, fy - 0.012), fw: 0.1, fh: 0.02, text: tick ? '✓' : 'Type here', sizeFrac: (+val('ep-size') * (tick ? 1.4 : 1)) / 600, color: tick ? '#0a7d32' : val('ep-color') }, { select: !tick });
    return;
  }
  e.preventDefault();
  if (tool === 'draw') return drawStroke(page, wrap, r, e);
  // Drag to draw a rectangle-type item.
  const style = tool === 'whiteout' ? { fill: '#ffffff', stroke: null, opacity: 1 }
    : tool === 'highlight' ? { fill: '#ffe100', stroke: null, opacity: 0.38 }
    : { fill: null, stroke: val('ep-stroke'), opacity: 1 };
  const it = addItem({ kind: 'rect', page, fx, fy, fw: 0.005, fh: 0.005, ...style });
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

/** Freehand pen: draw live on a temporary canvas, then keep the stroke as a movable image. */
function drawStroke(page: number, wrap: HTMLElement, r: DOMRect, e: PointerEvent) {
  const live = makeCanvas(r.width * 2, r.height * 2);
  live.className = 'ov-live';
  wrap.append(live);
  const ctx = live.getContext('2d')!;
  const color = val('ep-pen'), width = +val('ep-pen-w') * 2;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.lineWidth = width;
  const pts: [number, number][] = [[(e.clientX - r.left) * 2, (e.clientY - r.top) * 2]];
  const move = (ev: PointerEvent) => {
    const p: [number, number] = [(ev.clientX - r.left) * 2, (ev.clientY - r.top) * 2];
    const q = pts[pts.length - 1];
    ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
    pts.push(p);
  };
  const up = () => {
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', up);
    live.remove();
    if (pts.length < 2) return;
    const pad = width;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.max(0, Math.min(...xs) - pad), y0 = Math.max(0, Math.min(...ys) - pad);
    const x1 = Math.min(live.width, Math.max(...xs) + pad), y1 = Math.min(live.height, Math.max(...ys) + pad);
    const c = makeCanvas(Math.max(2, x1 - x0), Math.max(2, y1 - y0));
    const g = c.getContext('2d')!;
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = color; g.lineWidth = width;
    g.beginPath(); g.moveTo(pts[0][0] - x0, pts[0][1] - y0);
    for (const p of pts.slice(1)) g.lineTo(p[0] - x0, p[1] - y0);
    g.stroke();
    addItem({ kind: 'image', page, png: c, fx: x0 / live.width, fy: y0 / live.height, fw: c.width / live.width, fh: c.height / live.height }, { keepRatio: true });
  };
  addEventListener('pointermove', move);
  addEventListener('pointerup', up);
}

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
  addItem({ kind: 'image', page: overlay.currentPage, png: c, fx: 0.32, fy: 0.3, fw, fh: Math.min(fh, 0.9) }, { keepRatio: true });
  (e.target as HTMLInputElement).value = '';
});

// Apply size/colour changes to the focused text box.
['ep-size', 'ep-color'].forEach((id) => document.getElementById(id)!.addEventListener('input', () => {
  const active = document.activeElement?.closest('.ov-item');
  const it = overlay.items.find((x) => x.el === active);
  if (it && it.kind === 'text') { it.sizeFrac = +val('ep-size') / 600; it.color = val('ep-color'); overlay.style(it); overlay.fitText(it); }
}));

// ---------- Fillable form fields (AcroForm) ----------
interface FormInput { name: string; kind: 'text' | 'check' | 'choice' | 'radio'; el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement }
let formInputs: FormInput[] = [];
async function buildForm(bytes: Uint8Array) {
  const box = $('#ep-form'), list = $('#ep-form-fields');
  list.replaceChildren(); formInputs = [];
  const lib = await loadPdfLib();
  const doc = await loadDoc(bytes);
  let fields: any[] = [];
  try { fields = doc.getForm().getFields(); } catch { /* no form */ }
  const label = (f: any) => {
    try { const tu = f.acroField.dict.lookup(lib.PDFName.of('TU')); if (tu?.decodeText) return tu.decodeText(); } catch {}
    return f.getName().split('.').pop().replace(/\[\d+\]/g, '').replace(/[_]+/g, ' ').trim() || f.getName();
  };
  for (const f of fields) {
    const name = f.getName(), text = label(f);
    let el: FormInput['el'] | null = null, kind: FormInput['kind'] | null = null;
    if (f instanceof lib.PDFTextField) {
      kind = 'text';
      el = f.isMultiline() ? h('textarea', { rows: '2' }) as HTMLTextAreaElement : h('input', { type: 'text' }) as HTMLInputElement;
      el.value = f.getText() ?? '';
      const max = f.getMaxLength(); if (max) el.setAttribute('maxlength', String(max));
    } else if (f instanceof lib.PDFCheckBox) {
      kind = 'check'; el = h('input', { type: 'checkbox' }) as HTMLInputElement; (el as HTMLInputElement).checked = f.isChecked();
    } else if (f instanceof lib.PDFDropdown || f instanceof lib.PDFOptionList || f instanceof lib.PDFRadioGroup) {
      kind = f instanceof lib.PDFRadioGroup ? 'radio' : 'choice';
      el = h('select', {}) as HTMLSelectElement;
      el.append(h('option', { value: '', text: '—' }), ...f.getOptions().map((o: string) => h('option', { value: o, text: o })));
      const cur = f instanceof lib.PDFRadioGroup ? f.getSelected() : f.getSelected()?.[0];
      el.value = cur ?? '';
    }
    if (!el || !kind) continue;
    el.id = `ep-f-${formInputs.length}`;
    formInputs.push({ name, kind, el });
    list.append(kind === 'check'
      ? h('label', { class: 'check' }, el, ` ${text}`)
      : h('div', { class: 'field' }, h('label', { for: el.id, text }), el));
  }
  box.classList.toggle('hidden', !formInputs.length);
  $('#ep-form-count').textContent = String(formInputs.length);
}
async function fillForm(doc: any) {
  if (!formInputs.length) return;
  const lib = await loadPdfLib();
  const form = doc.getForm();
  for (const fi of formInputs) {
    const f = form.getField(fi.name);
    try {
      if (fi.kind === 'text') f.setText((fi.el as HTMLInputElement).value || undefined);
      else if (fi.kind === 'check') (fi.el as HTMLInputElement).checked ? f.check() : f.uncheck();
      else if (fi.el.value) f.select(fi.el.value);
      else if (f instanceof lib.PDFRadioGroup) f.clear();
    } catch (e) {
      throw new Error(/WinAnsi|cannot encode/i.test(String(e)) ? 'Form fields can only hold English letters and numbers. For Hindi or other scripts, use the Text tool instead.' : errorMessage(e));
    }
  }
  if ($<HTMLInputElement>('#ep-form-flatten').checked) form.flatten();
}

onFiles($('#ep-drop'), async ([f]) => {
  try {
    const bytes = await readFile(f);
    await loadDoc(bytes);
    if (overlay.pdf) closePdf(overlay.pdf);
    file = f;
    history.length = 0; undoBtn.disabled = true;
    $('#ep-panel').classList.remove('hidden');
    $('#ep-drop').classList.add('compact');
    await overlay.load(await openPdfJs(bytes));
    await buildForm(bytes);
    setTool(formInputs.length ? 'text' : tool);
    if (formInputs.length) setStatus(status, `📝 This PDF has ${formInputs.length} fillable fields. Fill them in the box above, or click on the page to add text.`, 'info');
  } catch (e) { setStatus(status, errorMessage(e), 'err'); $('#ep-panel').classList.remove('hidden'); }
});

$('#ep-save').addEventListener('click', async () => {
  if (!file) return;
  overlay.items.filter((i) => i.kind === 'text').forEach((i) => overlay.fitText(i));
  if (!overlay.items.length && !formInputs.length) return setStatus(status, 'Add some text or shapes first.', 'warn');
  const btn = $<HTMLButtonElement>('#ep-save');
  btn.disabled = true;
  try {
    const doc = await loadDoc(await readFile(file));
    await fillForm(doc);
    await overlay.apply(doc);
    let bytes = await doc.save({ useObjectStreams: true });
    if (($<HTMLInputElement>('#ep-flatten')).checked) {
      bytes = await rasterizePdf(bytes, 150, 0.85, (i, n) => setStatus(status, `Flattening page ${i} of ${n}…`, 'info'));
    }
    downloadBlob(pdfBlob(bytes), `${baseName(file.name)}-edited.pdf`);
    setStatus(status, '✅ Edited PDF downloaded.', 'ok');
  } catch (e) { setStatus(status, errorMessage(e), 'err'); }
  btn.disabled = false;
});

setTool('edittext');
