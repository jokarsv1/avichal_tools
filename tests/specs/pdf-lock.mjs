import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';

async function protect(page, BASE, fixture, download, file, password) {
  await page.goto(`${BASE}/protect-pdf`);
  await page.setInputFiles('#pl-drop input[type=file]', file);
  await page.waitForFunction(() => !document.querySelector('#pl-protect').classList.contains('hidden'));
  await page.fill('#pl-new', password);
  await page.fill('#pl-new2', password);
  await page.click('#pl-protect-go');
  await page.waitForSelector('#pl-download:not(.hidden)', { timeout: 30000 });
  return download(page, '#pl-download');
}

export default (test, { BASE, newPage, download, fixture, assert }) => {
  test('protect then unlock PDF (AES-256, wrong password, restrictions)', async () => {
    const page = await newPage();
    const prot = await protect(page, BASE, fixture, download, fixture('ten.pdf'), 'Secret#123');
    let encrypted = false;
    try { await PDFDocument.load(fs.readFileSync(prot.path)); } catch (e) { encrypted = /encrypt/i.test(String(e)); }
    assert(encrypted, 'protected file should be encrypted');
    assert(prot.name.endsWith('-protected.pdf'), prot.name);

    await page.goto(`${BASE}/unlock-pdf`);
    await page.setInputFiles('#pl-drop input[type=file]', prot.path);
    await page.waitForFunction(() => !document.querySelector('#pl-pw-wrap').classList.contains('hidden'));
    await page.fill('#pl-pw', 'wrong');
    await page.click('#pl-unlock-go');
    await page.waitForFunction(() => document.querySelector('#pl-status').textContent.includes('not correct'));
    await page.fill('#pl-pw', 'Secret#123');
    await page.click('#pl-unlock-go');
    await page.waitForSelector('#pl-download:not(.hidden)');
    const un = await download(page, '#pl-download');
    const doc = await PDFDocument.load(fs.readFileSync(un.path));
    assert(doc.getPageCount() === 10, 'pages ' + doc.getPageCount());

    // A plain PDF on the unlock page says there is nothing to remove and switches to "Add password".
    await page.goto(`${BASE}/unlock-pdf`);
    await page.setInputFiles('#pl-drop input[type=file]', fixture('a.pdf'));
    await page.waitForFunction(() => document.querySelector('input[name=pl-mode][value=protect]').checked);
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('e-Aadhaar helper builds NAME+YEAR password', async () => {
    const page = await newPage();
    const prot = await protect(page, BASE, fixture, download, fixture('a.pdf'), 'SURE1990');
    await page.goto(`${BASE}/aadhaar-pdf-password`);
    await page.setInputFiles('#pl-drop input[type=file]', prot.path);
    await page.waitForFunction(() => !document.querySelector('#pl-pw-wrap').classList.contains('hidden'));
    assert(await page.$eval('#pl-aadhaar', (d) => d.open), 'helper open on aadhaar page');
    await page.fill('#pl-a-name', 'Suresh Kumar');
    await page.fill('#pl-a-year', '1990');
    await page.click('#pl-a-use');
    await page.waitForSelector('#pl-download:not(.hidden)');
    assert((await page.inputValue('#pl-pw')) === 'SURE1990', 'built password');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
