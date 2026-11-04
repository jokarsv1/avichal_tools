import fs from 'node:fs';

export default (test, { BASE, newPage, download, fixture, assert }) => {
  test('search goes straight to the right page (search route, home Enter, 404)', async () => {
    const page = await newPage();
    const cases = [['compress pdf to 200kb', '/compress-pdf-to-200kb'], ['aadhaar pdf password', '/aadhaar-pdf-password'], ['jpg to pdf', '/jpg-to-pdf'], ['dollar to rupee', '/usd-to-inr'], ['ssc photo', '/ssc-photo-resizer']];
    for (const [q, want] of cases) {
      await page.goto(`${BASE}/search?q=${encodeURIComponent(q)}`);
      await page.waitForURL((u) => u.pathname === want, { timeout: 10000 });
    }
    // Ambiguous query shows a list instead of guessing.
    await page.goto(`${BASE}/search?q=pension`);
    await page.waitForFunction(() => document.querySelectorAll('#s-results .tool-tile').length >= 2);
    // Home: type and press Enter.
    await page.goto(`${BASE}/`);
    await page.fill('#tool-search', 'emi calculator');
    await page.press('#tool-search', 'Enter');
    await page.waitForURL((u) => u.pathname === '/emi-calculator');
    // 404 suggests pages from the URL words.
    await page.goto(`${BASE}/pdf-merger-online`);
    await page.waitForFunction(() => document.querySelector('#nf-list a[href="/merge-pdf"]'));
    // OpenSearch is advertised for Chrome's site search.
    assert(await page.$('link[rel=search][href="/opensearch.xml"]'), 'opensearch link');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('compress PDF to a target size (auto ladder)', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/compress-pdf-to-200kb`);
    assert((await page.inputValue('#cp-target')) === '200', 'target prefilled');
    const orig = fs.statSync(fixture('scanned.pdf')).size;
    await page.setInputFiles('#cp-drop input[type=file]', fixture('scanned.pdf'));
    await page.waitForFunction(() => /target|already|smallest/i.test(document.querySelector('#cp-status').textContent), null, { timeout: 120000 });
    const msg = await page.textContent('#cp-status');
    const out = await download(page, '#cp-download');
    assert(out.size < orig, `smaller: ${out.size} < ${orig}`);
    if (msg.includes('under your')) assert(out.size <= 200 * 1024, `under 200 KB: ${out.size}`);
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
