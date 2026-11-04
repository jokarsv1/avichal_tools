import { pdfText } from './pdf.mjs';
export default (test, { BASE, newPage, download, assert }) => {
  test('resume-builder: preview + ATS text PDF + templates', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/resume-builder`);
    await page.waitForSelector('#rs-preview canvas', { timeout: 20000 });
    await page.click('[data-tpl=classic]');
    const nameInput = page.locator('#rs-form input').first();
    await nameInput.fill('Arjun Mehta');
    await page.waitForTimeout(900);
    const d = await download(page, '#rs-download');
    assert(d.name === 'Arjun-Mehta-Resume.pdf', d.name);
    const txt = await pdfText(d.path);
    assert(txt.includes('Arjun Mehta') && txt.includes('EXPERIENCE') && txt.includes('FinPay Technologies'), txt.slice(0, 300));
    const j = await download(page, '#rs-json');
    assert(j.name.endsWith('.json'), j.name);
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
