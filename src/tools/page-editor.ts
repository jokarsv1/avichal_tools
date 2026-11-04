import { $, onFiles, downloadBlob, setStatus, errorMessage, baseName, formatBytes, h } from '../lib/ui';
import { loadPdfLib, loadDoc, readFile, pdfBlob, openPdfJs, renderThumb, parsePages, closePdf } from '../lib/pdf';

interface P { orig: number; rot: number; deleted: boolean; thumb?: HTMLCanvasElement }

const root = $('[data-page-editor]');
const mode = root.dataset.mode as 'rotate' | 'organize';
const grid = $('#pe-grid');
const status = $('#pe-status');
const save = $<HTMLButtonElement>('#pe-save');
let file: File | null = null;
let pages: P[] = [];
let pdfjsDoc: any = null;

function render() {
  grid.replaceChildren(...pages.map((p, i) => {
    const holder = h('div', { style: 'display:grid;place-items:center;height:170px' });
    if (p.thumb) {
      p.thumb.style.transform = `rotate(${p.rot}deg)`;
      holder.append(p.thumb);
    } else holder.append(h('span', { class: 'hint', text: 'Loading…' }));
    const card = h('div', { class: `page-thumb${p.deleted ? ' deleted' : ''}`, draggable: mode === 'organize' ? 'true' : null, 'data-i': i },
      holder,
      h('div', { class: 'pno', text: `Page ${p.orig + 1}${p.rot ? ` · ${p.rot}°` : ''}${p.deleted ? ' · deleted' : ''}` }),
      h('div', { class: 'tools' },
        h('button', { type: 'button', class: 'icon-btn', title: 'Rotate left', 'aria-label': `Rotate page ${p.orig + 1} left`, text: '⟲', onclick: () => { p.rot = (p.rot + 270) % 360; render(); } }),
        h('button', { type: 'button', class: 'icon-btn', title: 'Rotate right', 'aria-label': `Rotate page ${p.orig + 1} right`, text: '⟳', onclick: () => { p.rot = (p.rot + 90) % 360; render(); } }),
        mode === 'organize' ? h('button', { type: 'button', class: 'icon-btn', title: p.deleted ? 'Restore' : 'Delete', 'aria-label': `${p.deleted ? 'Restore' : 'Delete'} page ${p.orig + 1}`, text: p.deleted ? '↺' : '🗑', onclick: () => { p.deleted = !p.deleted; render(); } }) : null,
        mode === 'organize' ? h('button', { type: 'button', class: 'icon-btn', title: 'Move earlier', 'aria-label': `Move page ${p.orig + 1} earlier`, text: '←', disabled: i === 0, onclick: () => move(i, i - 1) }) : null,
        mode === 'organize' ? h('button', { type: 'button', class: 'icon-btn', title: 'Move later', 'aria-label': `Move page ${p.orig + 1} later`, text: '→', disabled: i === pages.length - 1, onclick: () => move(i, i + 1) }) : null,
      ));
    if (mode === 'organize') {
      card.addEventListener('dragstart', (e) => { e.dataTransfer!.setData('text/plain', String(i)); card.classList.add('dragging'); });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drop-target'); });
      card.addEventListener('dragleave', () => card.classList.remove('drop-target'));
      card.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); const from = Number(e.dataTransfer!.getData('text/plain')); if (!Number.isNaN(from)) move(from, i); });
    }
    return card;
  }));
  const kept = pages.filter((p) => !p.deleted).length;
  save.disabled = kept === 0;
  $('#pe-summary').textContent = `${pages.length} pages${mode === 'organize' ? ` · ${kept} kept` : ''}`;
}

function move(i: number, j: number) {
  if (j < 0 || j >= pages.length) return;
  const [p] = pages.splice(i, 1);
  pages.splice(j, 0, p);
  render();
}

async function loadThumbs() {
  for (const p of pages) {
    if (!pdfjsDoc) return;
    p.thumb = await renderThumb(pdfjsDoc, p.orig + 1, 150);
    render();
  }
}

onFiles($('#pe-drop'), async ([f]) => {
  try {
    const bytes = await readFile(f);
    const doc = await loadDoc(bytes);
    file = f;
    pages = doc.getPages().map((_, i) => ({ orig: i, rot: 0, deleted: false }));
    if (pdfjsDoc) closePdf(pdfjsDoc);
    pdfjsDoc = await openPdfJs(bytes);
    $('#pe-file').textContent = `${f.name} · ${formatBytes(f.size)}`;
    $('#pe-panel').classList.remove('hidden');
    render();
    loadThumbs();
  } catch (e) { alert(errorMessage(e)); }
});

$('#pe-left').addEventListener('click', () => { pages.forEach((p) => (p.rot = (p.rot + 270) % 360)); render(); });
$('#pe-right').addEventListener('click', () => { pages.forEach((p) => (p.rot = (p.rot + 90) % 360)); render(); });
$('#pe-reset').addEventListener('click', () => { pages.sort((a, b) => a.orig - b.orig).forEach((p) => { p.rot = 0; p.deleted = false; }); render(); });
document.getElementById('pe-del-apply')?.addEventListener('click', () => {
  const list = parsePages(($<HTMLInputElement>('#pe-del')).value, pages.length);
  if (!list) return setStatus(status, `Enter page numbers between 1 and ${pages.length}.`, 'warn');
  pages.forEach((p) => { if (list.includes(p.orig + 1)) p.deleted = true; });
  setStatus(status, `Marked ${list.length} page${list.length === 1 ? '' : 's'} for deletion.`, 'info');
  render();
});
document.getElementById('pe-reverse')?.addEventListener('click', () => { pages.reverse(); render(); });

save.addEventListener('click', async () => {
  if (!file) return;
  save.disabled = true;
  try {
    const { PDFDocument, degrees } = await loadPdfLib();
    const src = await loadDoc(await readFile(file));
    const out = await PDFDocument.create();
    const keep = pages.filter((p) => !p.deleted);
    const copied = await out.copyPages(src, keep.map((p) => p.orig));
    copied.forEach((pg, i) => {
      const r = keep[i].rot;
      if (r) pg.setRotation(degrees((pg.getRotation().angle + r) % 360));
      out.addPage(pg);
    });
    const bytes = await out.save({ useObjectStreams: true });
    downloadBlob(pdfBlob(bytes), `${baseName(file.name)}-${mode === 'rotate' ? 'rotated' : 'organized'}.pdf`);
    setStatus(status, `Saved ${keep.length} page${keep.length === 1 ? '' : 's'}.`, 'ok');
  } catch (e) { setStatus(status, errorMessage(e), 'err'); }
  save.disabled = false;
});
