import { $, onFiles, downloadBlob, setStatus, setProgress, errorMessage, baseName } from '../lib/ui';
import { decodeImage, makeCanvas } from '../lib/image';
import { openPdfJs, readFile, renderPage, closePdf } from '../lib/pdf';

const status = $('#ocr-status');
const bar = $('#ocr-progress');
const out = $<HTMLTextAreaElement>('#ocr-out');
const preview = $<HTMLImageElement>('#ocr-preview');
let worker: any = null;
let workerLang = '';
let name = 'text';

async function getWorker(lang: string) {
  if (worker && workerLang === lang) return worker;
  if (worker) await worker.terminate();
  const { createWorker } = await import('tesseract.js');
  worker = await createWorker(lang.split('+'), 1, {
    workerPath: '/vendor/tesseract/worker.min.js',
    corePath: '/vendor/tesseract',
    langPath: '/vendor/tesseract/lang',
    gzip: true,
    logger: (m: any) => {
      if (m.status === 'recognizing text') { setProgress(bar, m.progress); status.textContent = `Reading text… ${Math.round(m.progress * 100)}%`; }
      else if (m.status) status.textContent = `${m.status[0].toUpperCase()}${m.status.slice(1)}…`;
    },
  });
  workerLang = lang;
  return worker;
}

/** Upscale small images: Tesseract works best when text is ~30 px tall. */
function prepare(src: CanvasImageSource & { width: number; height: number }) {
  const scale = Math.max(1, Math.min(2.5, 1600 / Math.max(src.width, src.height)));
  const c = makeCanvas(src.width * scale, src.height * scale);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

onFiles($('#ocr-drop'), async ([f]) => {
  name = baseName(f.name);
  out.value = '';
  $('#ocr-result').classList.remove('hidden');
  const lang = (document.getElementById('ocr-lang') as HTMLSelectElement).value;
  try {
    setStatus(status, 'Loading the OCR engine (first time only, about 5 MB)…', 'info');
    const w = await getWorker(lang);
    const pages: HTMLCanvasElement[] = [];
    if (/pdf/i.test(f.type) || /\.pdf$/i.test(f.name)) {
      const doc = await openPdfJs(await readFile(f));
      const n = Math.min(doc.numPages, 20);
      for (let i = 1; i <= n; i++) pages.push(await renderPage(doc, i, 200 / 72));
      closePdf(doc);
      if (doc.numPages > 20) setStatus(status, 'Only the first 20 pages are read in one go.', 'warn');
    } else {
      const bmp = await decodeImage(f);
      pages.push(prepare(bmp));
      bmp.close();
    }
    if (preview.src) URL.revokeObjectURL(preview.src);
    pages[0].toBlob((b) => b && (preview.src = URL.createObjectURL(b)), 'image/jpeg', 0.8);
    const texts: string[] = [];
    for (let i = 0; i < pages.length; i++) {
      if (pages.length > 1) status.textContent = `Reading page ${i + 1} of ${pages.length}…`;
      const { data } = await w.recognize(pages[i]);
      texts.push(data.text.trim());
      out.value = texts.join('\n\n— — —\n\n');
    }
    bar.classList.add('hidden');
    const words = out.value.split(/\s+/).filter(Boolean).length;
    setStatus(status, words ? `Done: ${words} words found. Check and correct the text before using it.` : 'No text found. Try a sharper, well-lit image or another language.', words ? 'ok' : 'warn');
  } catch (e) {
    bar.classList.add('hidden');
    setStatus(status, errorMessage(e), 'err');
  }
});

$('#ocr-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(out.value); setStatus(status, 'Copied to clipboard.', 'ok'); } catch { out.select(); } });
$('#ocr-download').addEventListener('click', () => downloadBlob(new Blob([out.value], { type: 'text/plain;charset=utf-8' }), `${name}.txt`));
