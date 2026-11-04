import { $, onFiles, downloadBlob, setStatus, errorMessage, baseName, formatBytes, nextFrame } from '../lib/ui';
import { loadPdfLib, loadDoc, readFile, pdfBlob } from '../lib/pdf';
import { makeCanvas, canvasToBlob } from '../lib/image';
import type { PDFPage } from 'pdf-lib';

const root = $('[data-stamp]');
const mode = root.dataset.mode as 'numbers' | 'watermark';
const status = $('#st-status');
const go = $<HTMLButtonElement>('#st-go');
let file: File | null = null;
const val = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)?.value ?? '';

onFiles($('#st-drop'), async ([f]) => {
  try {
    const doc = await loadDoc(await readFile(f));
    file = f;
    $('#st-file').textContent = `${f.name} · ${doc.getPageCount()} pages · ${formatBytes(f.size)}`;
    $('#st-panel').classList.remove('hidden');
  } catch (e) { alert(errorMessage(e)); }
});

/** Map a point in "visual" page space (what the reader sees, origin bottom-left) to PDF user space. */
function mapper(page: PDFPage) {
  const box = page.getCropBox();
  const r = ((page.getRotation().angle % 360) + 360) % 360;
  const w = box.width, hh = box.height;
  const vw = r % 180 ? hh : w, vh = r % 180 ? w : hh;
  const map = (vx: number, vy: number): [number, number] => {
    let x = vx, y = vy;
    if (r === 90) { x = w - vy; y = vx; }
    else if (r === 180) { x = w - vx; y = hh - vy; }
    else if (r === 270) { x = vy; y = hh - vx; }
    return [x + box.x, y + box.y];
  };
  return { vw, vh, map, rot: r };
}

function formatNumber(fmt: string, n: number, total: number) {
  return fmt.replace('{n}', String(n)).replace('{total}', String(total));
}

go.addEventListener('click', async () => {
  if (!file) return;
  go.disabled = true;
  try {
    const { StandardFonts, rgb, degrees } = await loadPdfLib();
    const doc = await loadDoc(await readFile(file));
    const pages = doc.getPages();
    if (mode === 'numbers') {
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const size = +val('st-size') || 11;
      const pos = val('st-pos');
      const fmt = val('st-fmt');
      const startPage = Math.max(1, +val('st-from') || 1);
      const startNum = +val('st-start') || 1;
      const margin = 28;
      const counted = pages.length - startPage + 1;
      pages.forEach((page, i) => {
        if (i + 1 < startPage) return;
        const n = startNum + (i + 1 - startPage);
        const text = formatNumber(fmt, n, counted + startNum - 1);
        const m = mapper(page);
        const tw = font.widthOfTextAtSize(text, size);
        const vx = pos.endsWith('left') ? margin : pos.endsWith('right') ? m.vw - margin - tw : (m.vw - tw) / 2;
        const vy = pos.startsWith('top') ? m.vh - margin - size : margin;
        const [x, y] = m.map(vx, vy);
        page.drawText(text, { x, y, size, font, color: rgb(0.15, 0.15, 0.15), rotate: degrees(m.rot) });
      });
    } else {
      const text = val('st-text').trim() || 'CONFIDENTIAL';
      const color = val('st-color') || '#e11d48';
      const opacity = (+val('st-opacity') || 25) / 100;
      const angle = +val('st-angle') || 0;
      const layout = val('st-layout');
      const scalePct = (+val('st-scale') || 60) / 100;
      // Render the text with the browser's fonts, so any language (Hindi, Tamil, emoji…) works.
      const px = 160;
      const probe = makeCanvas(10, 10).getContext('2d')!;
      probe.font = `700 ${px}px system-ui, "Noto Sans", "Noto Sans Devanagari", Arial, sans-serif`;
      const tw = Math.ceil(probe.measureText(text).width) + 40;
      const c = makeCanvas(tw, Math.ceil(px * 1.35));
      const cx = c.getContext('2d')!;
      cx.font = probe.font;
      cx.fillStyle = color;
      cx.textBaseline = 'middle';
      cx.fillText(text, 20, c.height / 2);
      const png = await doc.embedPng(new Uint8Array(await (await canvasToBlob(c, 'image/png')).arrayBuffer()));
      const rad = (angle * Math.PI) / 180;
      for (let i = 0; i < pages.length; i++) {
        if (i % 10 === 0) { setStatus(status, `Stamping page ${i + 1} of ${pages.length}…`, 'info'); await nextFrame(); }
        const page = pages[i];
        const m = mapper(page);
        const iw = (layout === 'tile' ? m.vw * 0.35 : m.vw * scalePct);
        const ih = (iw * c.height) / c.width;
        const centers: [number, number][] = [];
        if (layout === 'tile') {
          for (let gy = m.vh * 0.12; gy < m.vh; gy += ih * 3.2) for (let gx = m.vw * 0.2; gx < m.vw; gx += iw * 1.25) centers.push([gx, gy]);
        } else centers.push([m.vw / 2, m.vh / 2]);
        for (const [cxv, cyv] of centers) {
          // bottom-left corner of the rotated image, in visual space
          const bx = cxv - (Math.cos(rad) * iw) / 2 + (Math.sin(rad) * ih) / 2;
          const by = cyv - (Math.sin(rad) * iw) / 2 - (Math.cos(rad) * ih) / 2;
          const [x, y] = m.map(bx, by);
          page.drawImage(png, { x, y, width: iw, height: ih, rotate: degrees(angle + m.rot), opacity });
        }
      }
    }
    const bytes = await doc.save({ useObjectStreams: true });
    downloadBlob(pdfBlob(bytes), `${baseName(file.name)}-${mode === 'numbers' ? 'numbered' : 'watermarked'}.pdf`);
    setStatus(status, 'Done! Your PDF has been downloaded.', 'ok');
  } catch (e) { setStatus(status, errorMessage(e), 'err'); }
  go.disabled = false;
});
