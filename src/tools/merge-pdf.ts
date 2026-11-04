import { $, onFiles, downloadBlob, setStatus, setProgress, errorMessage, nextFrame, formatBytes } from '../lib/ui';
import { FileList } from '../lib/filelist';
import { loadPdfLib, loadDoc, readFile, pdfBlob, openPdfJs, renderThumb, closePdf } from '../lib/pdf';

const status = $('#mg-status');
const go = $<HTMLButtonElement>('#mg-go');
const bar = $('#mg-progress');
const list = new FileList($('#mg-list'), () => {
  go.disabled = list.files.length < 2;
  $('#mg-panel').classList.toggle('hidden', !list.files.length);
  $('#mg-count').textContent = `${list.files.length} file${list.files.length === 1 ? '' : 's'} · ${formatBytes(list.files.reduce((s, f) => s + f.size, 0))}`;
}, async (f) => {
  try {
    const doc = await openPdfJs(await readFile(f));
    const c = await renderThumb(doc, 1, 88);
    closePdf(doc);
    return c.toDataURL('image/jpeg', 0.7);
  } catch { return null; }
});

onFiles($('#mg-drop'), (files) => list.add(files));
$('#mg-sort').addEventListener('click', () => list.sortByName());
$('#mg-clear').addEventListener('click', () => list.clear());

go.addEventListener('click', async () => {
  go.disabled = true;
  try {
    const { PDFDocument } = await loadPdfLib();
    const out = await PDFDocument.create();
    for (let i = 0; i < list.files.length; i++) {
      const f = list.files[i];
      setStatus(status, `Adding ${f.name} (${i + 1}/${list.files.length})…`, 'info');
      setProgress(bar, i / list.files.length);
      await nextFrame();
      const src = await loadDoc(await readFile(f));
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }
    setProgress(bar, 1);
    const bytes = await out.save({ useObjectStreams: true });
    const name = ($<HTMLInputElement>('#mg-name').value.trim() || 'merged').replace(/\.pdf$/i, '') + '.pdf';
    downloadBlob(pdfBlob(bytes), name);
    setStatus(status, `Done: ${out.getPageCount()} pages, ${formatBytes(bytes.length)}.`, 'ok');
  } catch (e) {
    setStatus(status, errorMessage(e), 'err');
  } finally {
    go.disabled = list.files.length < 2;
  }
});
