import { $, onFiles, downloadBlob, setStatus, setProgress, errorMessage, nextFrame, formatBytes } from '../lib/ui';
import { FileList } from '../lib/filelist';
import { loadPdfLib, pdfBlob } from '../lib/pdf';
import { decodeImage, drawScaled, makeCanvas, canvasToBlob, isHeicFile } from '../lib/image';

const SIZES: Record<string, [number, number]> = { a4: [595.28, 841.89], letter: [612, 792], legal: [612, 1008], a5: [419.53, 595.28] };
const status = $('#jp-status');
const bar = $('#jp-progress');
const go = $<HTMLButtonElement>('#jp-go');
const list = new FileList($('#jp-list'), () => {
  go.disabled = !list.files.length;
  $('#jp-panel').classList.toggle('hidden', !list.files.length);
  $('#jp-count').textContent = `${list.files.length} image${list.files.length === 1 ? '' : 's'} · ${formatBytes(list.files.reduce((s, f) => s + f.size, 0))}`;
}, async (f) => (isHeicFile(f) ? null : URL.createObjectURL(f)));

onFiles($('#jp-drop'), (files) => list.add(files));
$('#jp-sort').addEventListener('click', () => list.sortByName());
$('#jp-clear').addEventListener('click', () => list.clear());

go.addEventListener('click', async () => {
  go.disabled = true;
  try {
    const { PDFDocument } = await loadPdfLib();
    const doc = await PDFDocument.create();
    const size = ($<HTMLSelectElement>('#jp-size')).value;
    const orient = ($<HTMLSelectElement>('#jp-orient')).value;
    const margin = +($<HTMLSelectElement>('#jp-margin')).value;
    const small = ($<HTMLInputElement>('#jp-small')).checked;
    for (let i = 0; i < list.files.length; i++) {
      const f = list.files[i];
      setStatus(status, `Adding image ${i + 1} of ${list.files.length}…`, 'info');
      setProgress(bar, i / list.files.length);
      await nextFrame();
      const bmp = await decodeImage(f); // applies EXIF rotation, so phone photos are upright
      const maxDim = small ? 2000 : 4000;
      const s = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
      const keepPng = /png|gif|bmp|svg/i.test(f.type) && !small;
      let canvas: HTMLCanvasElement;
      if (s < 1) canvas = drawScaled(bmp, Math.round(bmp.width * s), Math.round(bmp.height * s), keepPng ? undefined : '#fff');
      else {
        canvas = makeCanvas(bmp.width, bmp.height);
        const cx = canvas.getContext('2d')!;
        if (!keepPng) { cx.fillStyle = '#fff'; cx.fillRect(0, 0, canvas.width, canvas.height); }
        cx.drawImage(bmp, 0, 0);
      }
      bmp.close();
      const bytes = new Uint8Array(await (await canvasToBlob(canvas, keepPng ? 'image/png' : 'image/jpeg', small ? 0.75 : 0.92)).arrayBuffer());
      const img = keepPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      const iw = canvas.width * 0.75, ih = canvas.height * 0.75; // px at 96 DPI -> points
      let pw: number, ph: number;
      if (size === 'fit') { pw = iw + margin * 2; ph = ih + margin * 2; }
      else {
        [pw, ph] = SIZES[size];
        const land = orient === 'landscape' || (orient === 'auto' && canvas.width > canvas.height);
        if (land) [pw, ph] = [ph, pw];
      }
      const k = Math.min((pw - margin * 2) / iw, (ph - margin * 2) / ih, size === 'fit' ? 1 : Infinity);
      const w = iw * k, h = ih * k;
      const page = doc.addPage([pw, ph]);
      page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
      canvas.width = canvas.height = 1;
    }
    setProgress(bar, 1);
    const bytes = await doc.save({ useObjectStreams: true });
    const name = ($<HTMLInputElement>('#jp-name').value.trim() || 'images').replace(/\.pdf$/i, '') + '.pdf';
    downloadBlob(pdfBlob(bytes), name);
    setStatus(status, `Done: ${doc.getPageCount()} page PDF, ${formatBytes(bytes.length)}.`, 'ok');
  } catch (e) {
    setStatus(status, errorMessage(e), 'err');
  } finally {
    go.disabled = !list.files.length;
    bar.classList.add('hidden');
  }
});
