/**
 * Shared engine for tools that place things on PDF pages (Sign PDF, Edit PDF).
 * - Renders pages lazily with pdf.js
 * - Lets users add, move, resize and delete overlay items (images, text, rectangles)
 * - Writes the items into the PDF with pdf-lib, mapping "what you see" to PDF coordinates
 *   correctly even for rotated pages.
 */
import { h } from './ui';
import { makeCanvas, canvasToBlob } from './image';
import type { PDFDocument, PDFPage } from 'pdf-lib';

export type ItemKind = 'image' | 'text' | 'rect';
export interface OverlayItem {
  kind: ItemKind;
  page: number;
  /** Position/size as fractions of the visible page (0..1, origin top-left). */
  fx: number; fy: number; fw: number; fh: number;
  el: HTMLElement;
  png?: HTMLCanvasElement;
  text?: string;
  /** Font size as a fraction of page width. */
  sizeFrac?: number;
  color?: string;
  fill?: string | null;
  stroke?: string | null;
  opacity?: number;
}

export class PdfOverlay {
  items: OverlayItem[] = [];
  currentPage = 1;
  pdf: any = null;
  /** Called when the user presses on empty page area (for draw-to-create tools). */
  onPagePointer?: (page: number, wrap: HTMLElement, e: PointerEvent) => void;

  constructor(public host: HTMLElement) {}

  async load(pdf: any) {
    this.pdf = pdf;
    this.items = [];
    this.host.replaceChildren();
    const width = Math.min(this.host.clientWidth - 28 || 800, 900);
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        const wrap = en.target as HTMLElement;
        if (en.isIntersecting) this.currentPage = +wrap.dataset.page!;
        if (en.isIntersecting && !wrap.dataset.rendered) { wrap.dataset.rendered = '1'; this.drawPage(wrap); }
      }
    }, { rootMargin: '400px 0px', threshold: 0.01 });
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 1, rotation: page.rotate });
      const wrap = h('div', { class: 'ov-page', 'data-page': i, style: `width:${width}px;height:${(width * vp.height) / vp.width}px` }, h('span', { class: 'ov-pno', text: `Page ${i}` }));
      wrap.addEventListener('pointerdown', (e) => {
        this.currentPage = i;
        if (e.target === wrap || (e.target as HTMLElement).classList.contains('ov-canvas')) this.onPagePointer?.(i, wrap, e);
      });
      this.host.append(wrap);
      io.observe(wrap);
    }
  }

  private async drawPage(wrap: HTMLElement) {
    const page = await this.pdf.getPage(+wrap.dataset.page!);
    const vp1 = page.getViewport({ scale: 1, rotation: page.rotate });
    const dpr = Math.min(2, devicePixelRatio || 1);
    const vp = page.getViewport({ scale: (wrap.clientWidth / vp1.width) * dpr, rotation: page.rotate });
    const c = makeCanvas(vp.width, vp.height);
    c.className = 'ov-canvas';
    await page.render({ canvas: c, viewport: vp }).promise;
    wrap.prepend(c);
  }

  wrapOf(page: number) {
    return this.host.querySelector<HTMLElement>(`.ov-page[data-page="${page}"]`);
  }

  /** Add an item to the page and make it draggable/resizable. */
  add(partial: Omit<OverlayItem, 'el'>, opts: { keepRatio?: boolean; select?: boolean } = {}): OverlayItem {
    const wrap = this.wrapOf(partial.page)!;
    const el = h('div', { class: `ov-item ov-${partial.kind}`, tabindex: '0' });
    const it: OverlayItem = { ...partial, el };
    if (it.kind === 'image' && it.png) el.append(h('img', { src: it.png.toDataURL('image/png'), alt: '', draggable: 'false' }));
    if (it.kind === 'text') {
      const span = h('span', { class: 'ov-text', contenteditable: 'true', spellcheck: 'false', text: it.text || '' });
      span.addEventListener('input', () => { it.text = span.innerText; this.fitText(it); });
      span.addEventListener('pointerdown', (e) => e.stopPropagation());
      el.append(h('span', { class: 'ov-move', title: 'Drag to move', text: '✥' }), span);
    }
    el.append(
      h('button', { type: 'button', class: 'ov-del', title: 'Remove', 'aria-label': 'Remove', text: '✕', onclick: () => this.remove(it) }),
      it.kind !== 'text' ? h('span', { class: 'ov-resize', title: 'Resize' }) : null,
    );
    wrap.append(el);
    this.items.push(it);
    this.style(it);
    this.bind(it, wrap, !!opts.keepRatio);
    if (it.kind === 'text') { this.fitText(it); if (opts.select !== false) setTimeout(() => { const s = el.querySelector<HTMLElement>('.ov-text')!; s.focus(); document.getSelection()?.selectAllChildren(s); }, 0); }
    return it;
  }

  remove(it: OverlayItem) {
    it.el.remove();
    this.items = this.items.filter((x) => x !== it);
  }

  style(it: OverlayItem) {
    const s = it.el.style;
    s.left = `${it.fx * 100}%`; s.top = `${it.fy * 100}%`;
    if (it.kind !== 'text') { s.width = `${it.fw * 100}%`; s.height = `${it.fh * 100}%`; }
    if (it.kind === 'rect') {
      s.background = it.fill || 'transparent';
      s.border = it.stroke ? `2px solid ${it.stroke}` : '';
      s.opacity = String(it.opacity ?? 1);
    }
    if (it.kind === 'text') {
      const wrap = it.el.parentElement!;
      const span = it.el.querySelector<HTMLElement>('.ov-text')!;
      span.style.fontSize = `${(it.sizeFrac || 0.02) * wrap.clientWidth}px`;
      span.style.color = it.color || '#000';
    }
  }

  /** Measure the text box so fw/fh match what is drawn into the PDF. */
  fitText(it: OverlayItem) {
    const wrap = it.el.parentElement!;
    const span = it.el.querySelector<HTMLElement>('.ov-text')!;
    it.fw = span.offsetWidth / wrap.clientWidth;
    it.fh = span.offsetHeight / wrap.clientHeight;
  }

  private bind(it: OverlayItem, wrap: HTMLElement, keepRatio: boolean) {
    const el = it.el;
    let mode: 'move' | 'resize' | null = null, sx = 0, sy = 0, s0 = { fx: 0, fy: 0, fw: 0, fh: 0 };
    el.addEventListener('pointerdown', (e) => {
      const t = e.target as HTMLElement;
      if (t.classList.contains('ov-del') || t.classList.contains('ov-text')) return;
      e.stopPropagation();
      mode = t.classList.contains('ov-resize') ? 'resize' : 'move';
      sx = e.clientX; sy = e.clientY; s0 = { fx: it.fx, fy: it.fy, fw: it.fw, fh: it.fh };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!mode) return;
      const dx = (e.clientX - sx) / wrap.clientWidth, dy = (e.clientY - sy) / wrap.clientHeight;
      if (mode === 'move') {
        it.fx = Math.max(0, Math.min(1 - it.fw, s0.fx + dx));
        it.fy = Math.max(0, Math.min(1 - it.fh, s0.fy + dy));
      } else if (keepRatio) {
        const ratio = s0.fh / s0.fw;
        it.fw = Math.max(0.03, Math.min(1 - it.fx, s0.fw + dx));
        it.fh = it.fw * ratio;
        if (it.fy + it.fh > 1) { it.fh = 1 - it.fy; it.fw = it.fh / ratio; }
      } else {
        it.fw = Math.max(0.01, Math.min(1 - it.fx, s0.fw + dx));
        it.fh = Math.max(0.005, Math.min(1 - it.fy, s0.fh + dy));
      }
      this.style(it);
    });
    el.addEventListener('pointerup', () => (mode = null));
    el.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).classList.contains('ov-text')) return;
      const step = e.shiftKey ? 0.05 : 0.01;
      if (e.key === 'Delete' || e.key === 'Backspace') { this.remove(it); return; }
      if (e.key === 'ArrowLeft') it.fx = Math.max(0, it.fx - step);
      else if (e.key === 'ArrowRight') it.fx = Math.min(1 - it.fw, it.fx + step);
      else if (e.key === 'ArrowUp') it.fy = Math.max(0, it.fy - step);
      else if (e.key === 'ArrowDown') it.fy = Math.min(1 - it.fh, it.fy + step);
      else return;
      e.preventDefault();
      this.style(it);
    });
  }

  /** Draw every item into the pdf-lib document. */
  async apply(doc: PDFDocument) {
    const { degrees, rgb, StandardFonts } = await import('pdf-lib');
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const cache = new Map<HTMLCanvasElement, any>();
    const hex = (c: string) => { const n = parseInt(c.replace('#', ''), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
    for (const it of this.items) {
      if (it.kind === 'text' && !(it.text || '').trim()) continue;
      const page = doc.getPage(it.page - 1);
      const m = mapPage(page);
      const w = it.fw * m.vw, hh = it.fh * m.vh;
      const vx = it.fx * m.vw, vyBottom = (1 - it.fy - it.fh) * m.vh;
      if (it.kind === 'rect') {
        const [x, y] = m.map(vx, vyBottom);
        page.drawRectangle({
          x, y, width: w, height: hh, rotate: degrees(m.rot),
          color: it.fill ? hex(it.fill) : undefined, borderColor: it.stroke ? hex(it.stroke) : undefined,
          borderWidth: it.stroke ? Math.max(1, m.vw / 400) : 0, opacity: it.opacity ?? 1, borderOpacity: it.opacity ?? 1,
        });
        continue;
      }
      if (it.kind === 'text') {
        const size = (it.sizeFrac || 0.02) * m.vw;
        const lines = (it.text || '').replace(/\r/g, '').split('\n');
        const latin = lines.every((l) => { try { font.encodeText(l); return true; } catch { return false; } });
        if (latin) {
          // Real, selectable text. The line height matches the editor's CSS (1.25).
          lines.forEach((line, i) => {
            const vyBase = (1 - it.fy) * m.vh - size * (0.98 + i * 1.25);
            const [x, y] = m.map(vx + size * 0.12, vyBase);
            page.drawText(line, { x, y, size, font, color: hex(it.color || '#000000'), rotate: degrees(m.rot) });
          });
          continue;
        }
        // Non-Latin scripts (Hindi etc.): draw with the browser's fonts as an image.
        it.png = textToCanvas(lines, it.color || '#000', 64);
      }
      if (!it.png) continue;
      let img = cache.get(it.png);
      if (!img) { img = await doc.embedPng(new Uint8Array(await (await canvasToBlob(it.png, 'image/png')).arrayBuffer())); cache.set(it.png, img); }
      const [x, y] = m.map(vx, vyBottom);
      page.drawImage(img, { x, y, width: w, height: hh, rotate: degrees(m.rot) });
    }
  }
}

/** Map the visible page (origin bottom-left) to PDF user space, for any /Rotate. */
export function mapPage(page: PDFPage) {
  const box = page.getCropBox();
  const rot = ((page.getRotation().angle % 360) + 360) % 360;
  const W = box.width, H = box.height;
  const vw = rot % 180 ? H : W, vh = rot % 180 ? W : H;
  const map = (vx: number, vy: number): [number, number] => {
    let x = vx, y = vy;
    if (rot === 90) { x = W - vy; y = vx; }
    else if (rot === 180) { x = W - vx; y = H - vy; }
    else if (rot === 270) { x = vy; y = H - vx; }
    return [x + box.x, y + box.y];
  };
  return { vw, vh, map, rot };
}

export function textToCanvas(lines: string[], color: string, px: number, font = 'system-ui, "Noto Sans", "Noto Sans Devanagari", Arial, sans-serif') {
  const probe = makeCanvas(10, 10).getContext('2d')!;
  probe.font = `${px}px ${font}`;
  const w = Math.ceil(Math.max(...lines.map((l) => probe.measureText(l).width))) + px * 0.3;
  const c = makeCanvas(w, Math.ceil(px * 1.25 * lines.length + px * 0.1));
  const ctx = c.getContext('2d')!;
  ctx.font = probe.font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, px * 0.12, i * px * 1.25 + px * 0.1));
  return c;
}
