export default (test, { BASE, newPage, download, fixture, assert }) => {
  test('i18n exam pages: Hindi SSC page resizes, Tamil KB page, hub links', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/hi/ssc-photo-resizer`);
    assert((await page.textContent('h1')).includes('SSC फ़ोटो और सिग्नेचर रिसाइज़र'), 'hindi h1');
    assert((await page.textContent('article')).includes('20–50 KB'), 'spec table');
    assert((await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => x.textContent).join(''))).includes('FAQPage'), 'faq schema on translated exam page');
    await page.setInputFiles('#kb-drop input[type=file]', fixture('photo.jpg'));
    await page.waitForSelector('.kb-status.ok', { timeout: 30000 });
    const d = await download(page, '.kb-download');
    assert(d.size <= 50000 && d.size >= 20 * 1024, 'SSC photo 20–50 KB: ' + d.size);

    await page.goto(`${BASE}/ta/compress-image-to-20kb`);
    assert((await page.textContent('h1')).includes('20 KB'), 'tamil kb h1');
    assert((await page.textContent('.lead')).includes('SSC'), 'computed exam uses listed');
    assert((await page.getAttribute('link[rel=canonical]', 'href')).endsWith('/ta/compress-image-to-20kb'), 'canonical');
    await page.setInputFiles('#kb-drop input[type=file]', fixture('photo.jpg'));
    await page.waitForSelector('.kb-status.ok', { timeout: 30000 });
    const d2 = await download(page, '.kb-download');
    assert(d2.size <= 20000, 'under 20 KB: ' + d2.size);

    await page.goto(`${BASE}/bn/exam-tools`);
    assert(await page.$('a[href="/bn/neet-photo-resizer"]'), 'hub links translated exam pages');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
