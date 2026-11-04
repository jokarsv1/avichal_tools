import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
const pages = async (p) => (await PDFDocument.load(fs.readFileSync(p))).getPageCount();
async function pdfText(p) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(p)), verbosity: 0 }).promise;
  let out = '';
  for (let i = 1; i <= doc.numPages; i++) out += (await (await doc.getPage(i)).getTextContent()).items.map((x) => x.str).join(' ') + '\n';
  return out;
}
export { pdfText };
export default (test, { BASE, newPage, download, fixture, assert }) => {
  test('merge-pdf: 3 + 2 pages = 5', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/merge-pdf`);
    await page.setInputFiles('#mg-drop input[type=file]', [fixture('a.pdf'), fixture('b.pdf')]);
    const d = await download(page, '#mg-go');
    assert((await pages(d.path)) === 5, 'pages');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('compress-pdf smart: shrinks scanned.pdf and keeps text', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/compress-pdf`);
    await page.setInputFiles('#cp-drop input[type=file]', fixture('scanned.pdf'));
    await page.waitForSelector('#cp-status.ok, #cp-status.warn, #cp-status.err', { timeout: 60000 });
    const msg = await page.textContent('#cp-status');
    assert(!(await page.$('#cp-status.err')), msg);
    const d = await download(page, '#cp-download');
    const orig = fs.statSync(fixture('scanned.pdf')).size;
    assert(d.size < orig * 0.8, `not smaller: ${d.size} vs ${orig} (${msg})`);
    assert((await pages(d.path)) === 4, 'page count');
    assert((await pdfText(d.path)).includes('text must stay selectable'), 'text lost');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('compress-pdf raster mode works', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/compress-pdf`);
    await page.setInputFiles('#cp-drop input[type=file]', fixture('scanned.pdf'));
    await page.waitForSelector('#cp-status.ok, #cp-status.warn, #cp-status.err', { timeout: 60000 });
    await page.click('label:has(input[value=raster]) span');
    await page.waitForFunction(() => /Done|kept|optimised|password|valid|wrong|error/i.test(document.querySelector('#cp-status').textContent) && !document.querySelector('#cp-go').disabled, null, { timeout: 60000 }).catch(async () => { throw new Error('status: ' + await page.textContent('#cp-status') + ' errors: ' + page.errors.join(';')); });
    assert(!(await page.$('#cp-status.err')), await page.textContent('#cp-status'));
    const d = await download(page, '#cp-download');
    assert((await pages(d.path)) === 4, 'page count');
  });
};
