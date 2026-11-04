import { $, $$, onFiles, downloadBlob, downloadZip, setStatus, errorMessage, baseName, formatBytes } from '../lib/ui';
import { loadPdfLib, loadDoc, readFile, pdfBlob, parsePages, parseGroups } from '../lib/pdf';

let file: File | null = null;
let total = 0;
const status = $('#sp-status');
const go = $<HTMLButtonElement>('#sp-go');
const rangeEl = $<HTMLInputElement>('#sp-range');
const everyEl = $<HTMLInputElement>('#sp-every');
const mode = () => document.querySelector<HTMLInputElement>('input[name=sp-mode]:checked')!.value;

function syncMode() {
  const m = mode();
  $('#sp-range-field').classList.toggle('hidden', m === 'each' || m === 'every');
  $('#sp-every-field').classList.toggle('hidden', m !== 'every');
  $('#sp-range-label').textContent = m === 'extract' ? 'Pages to extract (e.g. 1-3, 5, 8-)' : 'Ranges, one file each (e.g. 1-3, 4-6, 7-)';
  preview();
}
$$('input[name=sp-mode]').forEach((el) => el.addEventListener('change', syncMode));
[rangeEl, everyEl].forEach((el) => el.addEventListener('input', preview));

function plan(): number[][] | null {
  const m = mode();
  if (m === 'each') return Array.from({ length: total }, (_, i) => [i + 1]);
  if (m === 'every') {
    const n = Math.max(1, parseInt(everyEl.value) || 1);
    const out: number[][] = [];
    for (let i = 1; i <= total; i += n) out.push(Array.from({ length: Math.min(n, total - i + 1) }, (_, k) => i + k));
    return out;
  }
  if (m === 'extract') { const p = parsePages(rangeEl.value, total); return p ? [p] : null; }
  return parseGroups(rangeEl.value, total);
}

function preview() {
  if (!file) return;
  const p = plan();
  if (!p) { setStatus(status, `Enter pages between 1 and ${total}.`, 'warn'); go.disabled = true; return; }
  go.disabled = false;
  setStatus(status, p.length === 1 ? `Will create 1 PDF with ${p[0].length} page${p[0].length === 1 ? '' : 's'}.` : `Will create ${p.length} PDFs (downloaded as a ZIP).`, 'info');
}

onFiles($('#sp-drop'), async ([f]) => {
  try {
    const doc = await loadDoc(await readFile(f));
    file = f;
    total = doc.getPageCount();
    $('#sp-file').textContent = `${f.name} · ${total} pages · ${formatBytes(f.size)}`;
    $('#sp-panel').classList.remove('hidden');
    rangeEl.value = mode() === 'extract' ? (total > 1 ? `1-${Math.ceil(total / 2)}` : '1') : `1-${Math.ceil(total / 2)}, ${Math.ceil(total / 2) + 1}-${total}`;
    syncMode();
  } catch (e) { alert(errorMessage(e)); }
});

go.addEventListener('click', async () => {
  const p = plan();
  if (!file || !p) return;
  go.disabled = true;
  try {
    const { PDFDocument } = await loadPdfLib();
    const src = await loadDoc(await readFile(file));
    const outs: { name: string; data: Uint8Array }[] = [];
    for (const group of p) {
      setStatus(status, `Creating file ${outs.length + 1} of ${p.length}…`, 'info');
      const out = await PDFDocument.create();
      (await out.copyPages(src, group.map((n) => n - 1))).forEach((pg) => out.addPage(pg));
      const label = group.length === 1 ? `page-${group[0]}` : `pages-${group[0]}-${group[group.length - 1]}`;
      outs.push({ name: `${baseName(file.name)}-${label}.pdf`, data: await out.save({ useObjectStreams: true }) });
    }
    if (outs.length === 1) downloadBlob(pdfBlob(outs[0].data), outs[0].name);
    else await downloadZip(outs, `${baseName(file.name)}-split.zip`);
    setStatus(status, `Done: ${outs.length} file${outs.length === 1 ? '' : 's'} created.`, 'ok');
  } catch (e) { setStatus(status, errorMessage(e), 'err'); }
  go.disabled = false;
});
