import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { pdfText } from './pdf.mjs';
const load = async (p) => PDFDocument.load(fs.readFileSync(p));

export default (test, { BASE, newPage, download, fixture, assert }) => {
  test('split-pdf: extract 2-4 from ten.pdf', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/split-pdf`);
    await page.setInputFiles('#sp-drop input[type=file]', fixture('ten.pdf'));
    await page.fill('#sp-range', '2-4');
    const d = await download(page, '#sp-go');
    const doc = await load(d.path);
    assert(doc.getPageCount() === 3, 'count ' + doc.getPageCount());
    assert((await pdfText(d.path)).includes('Ten page 2'), 'wrong pages');
  });

  test('split-pdf: every page -> zip', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/split-pdf`);
    await page.setInputFiles('#sp-drop input[type=file]', fixture('a.pdf'));
    await page.click('label:has(input[value=each]) span');
    const d = await download(page, '#sp-go');
    assert(d.name.endsWith('.zip') && d.size > 1000, d.name);
  });

  test('jpg-to-pdf: 2 images -> 2 A4 pages', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/jpg-to-pdf`);
    await page.setInputFiles('#jp-drop input[type=file]', [fixture('photo.jpg'), fixture('image.png')]);
    const d = await download(page, '#jp-go');
    const doc = await load(d.path);
    assert(doc.getPageCount() === 2, 'pages');
    const { width, height } = doc.getPage(1).getSize();
    assert(Math.round(width) === 842 && Math.round(height) === 595, `landscape A4 expected, got ${width}x${height}`);
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('pdf-to-jpg: 3 pages -> zip', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/pdf-to-jpg`);
    await page.setInputFiles('#pj-drop input[type=file]', fixture('a.pdf'));
    await page.click('#pj-go');
    await page.waitForSelector('#pj-status.ok', { timeout: 30000 });
    assert((await page.$$('#pj-grid .page-thumb')).length === 3, 'thumbs');
    const d = await download(page, '#pj-zip');
    assert(d.name.endsWith('.zip'), d.name);
  });

  test('rotate-pdf: rotate all right', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/rotate-pdf`);
    await page.setInputFiles('#pe-drop input[type=file]', fixture('a.pdf'));
    await page.waitForSelector('#pe-grid .page-thumb canvas', { timeout: 20000 });
    await page.click('#pe-right');
    const d = await download(page, '#pe-save');
    const doc = await load(d.path);
    assert(doc.getPages().every((p) => p.getRotation().angle === 90), 'rotation');
  });

  test('organize-pdf: delete page 2 and reverse', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/organize-pdf`);
    await page.setInputFiles('#pe-drop input[type=file]', fixture('a.pdf'));
    await page.fill('#pe-del', '2');
    await page.click('#pe-del-apply');
    await page.click('#pe-reverse');
    const d = await download(page, '#pe-save');
    const doc = await load(d.path);
    assert(doc.getPageCount() === 2, 'count');
    const txt = await pdfText(d.path);
    assert(txt.indexOf('Doc A page 3') < txt.indexOf('Doc A page 1') && !txt.includes('Doc A page 2'), 'order/delete wrong');
  });

  test('add-page-numbers-to-pdf: Page 1 of 3', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/add-page-numbers-to-pdf`);
    await page.setInputFiles('#st-drop input[type=file]', fixture('a.pdf'));
    await page.selectOption('#st-fmt', 'Page {n} of {total}');
    const d = await download(page, '#st-go');
    assert((await pdfText(d.path)).includes('Page 2 of 3'), 'numbers missing');
  });

  test('watermark-pdf: adds image to each page', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/watermark-pdf`);
    await page.setInputFiles('#st-drop input[type=file]', fixture('a.pdf'));
    await page.fill('#st-text', 'गोपनीय CONFIDENTIAL');
    const d = await download(page, '#st-go');
    const orig = fs.statSync(fixture('a.pdf')).size;
    assert(d.size > orig, 'not stamped');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('sign-pdf: draw + place + save', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/sign-pdf`);
    await page.setInputFiles('#sg-drop input[type=file]', fixture('a.pdf'));
    await page.waitForSelector('.sg-page canvas', { timeout: 20000 });
    const box = await page.locator('#sg-pad').boundingBox();
    await page.mouse.move(box.x + 30, box.y + 40);
    await page.mouse.down();
    for (let i = 0; i < 20; i++) await page.mouse.move(box.x + 30 + i * 15, box.y + 40 + Math.sin(i) * 20);
    await page.mouse.up();
    await page.click('#sg-add');
    await page.waitForSelector('.sg-item');
    await page.click('#sg-add-date');
    const d = await download(page, '#sg-save');
    const doc = await load(d.path);
    assert(doc.getPageCount() === 3, 'pages');
    assert(d.size > fs.statSync(fixture('a.pdf')).size, 'not signed');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
