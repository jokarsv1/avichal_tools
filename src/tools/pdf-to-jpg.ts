import { $, onFiles, downloadBlob, downloadZip, setStatus, setProgress, errorMessage, baseName, formatBytes, h, nextFrame } from '../lib/ui';
import { openPdfJs, readFile, renderPage, parsePages, closePdf } from '../lib/pdf';
import { canvasToBlob, extFor, type OutType } from '../lib/image';

let file: File | null = null;
let doc: any = null;
const status = $('#pj-status');
const bar = $('#pj-progress');
const go = $<HTMLButtonElement>('#pj-go');
const grid = $('#pj-grid');
let outputs: { name: string; data: Blob }[] = [];

onFiles($('#pj-drop'), async ([f]) => {
  try {
    if (doc) closePdf(doc);
    file = f;
    doc = await openPdfJs(await readFile(f));
    $('#pj-file').textContent = `${f.name} · ${doc.numPages} page${doc.numPages === 1 ? '' : 's'} · ${formatBytes(f.size)}`;
    ($<HTMLInputElement>('#pj-pages')).placeholder = `all (1-${doc.numPages})`;
    $('#pj-panel').classList.remove('hidden');
    grid.replaceChildren();
    $('#pj-zip').classList.add('hidden');
  } catch (e) { alert(errorMessage(e)); }
});

go.addEventListener('click', async () => {
  if (!doc || !file) return;
  const pagesInput = ($<HTMLInputElement>('#pj-pages')).value.trim();
  const pages = pagesInput ? parsePages(pagesInput, doc.numPages) : Array.from({ length: doc.numPages }, (_, i) => i + 1);
  if (!pages) { setStatus(status, `Enter pages between 1 and ${doc.numPages}.`, 'warn'); return; }
  const type = ($<HTMLSelectElement>('#pj-fmt')).value as OutType;
  const dpi = +($<HTMLSelectElement>('#pj-dpi')).value;
  go.disabled = true;
  outputs = [];
  grid.replaceChildren();
  try {
    for (let i = 0; i < pages.length; i++) {
      setStatus(status, `Converting page ${pages[i]} (${i + 1} of ${pages.length})…`, 'info');
      setProgress(bar, i / pages.length);
      await nextFrame();
      const canvas = await renderPage(doc, pages[i], dpi / 72);
      const blob = await canvasToBlob(canvas, type, 0.92);
      const name = `${baseName(file.name)}-page-${pages[i]}.${extFor(type)}`;
      outputs.push({ name, data: blob });
      const url = URL.createObjectURL(blob);
      grid.append(h('div', { class: 'page-thumb' },
        h('img', { src: url, alt: `Page ${pages[i]}`, loading: 'lazy' }),
        h('div', { class: 'pno', text: `Page ${pages[i]} · ${canvas.width}×${canvas.height} · ${formatBytes(blob.size)}` }),
        h('div', { class: 'tools' }, h('button', { type: 'button', class: 'btn btn-sm', text: '⬇ Save', onclick: () => downloadBlob(blob, name) }))));
      canvas.width = canvas.height = 1;
    }
    setProgress(bar, 1);
    setStatus(status, `Done: ${outputs.length} image${outputs.length === 1 ? '' : 's'}.`, 'ok');
    if (outputs.length === 1) downloadBlob(outputs[0].data, outputs[0].name);
    $('#pj-zip').classList.toggle('hidden', outputs.length < 2);
  } catch (e) { setStatus(status, errorMessage(e), 'err'); }
  bar.classList.add('hidden');
  go.disabled = false;
});

$('#pj-zip').addEventListener('click', () => file && downloadZip(outputs, `${baseName(file.name)}-images.zip`));
