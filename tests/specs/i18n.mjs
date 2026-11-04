export default (test, { BASE, newPage, assert }) => {
  test('i18n: translated tool page works, labels translated, hreflang', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/ta/emi-calculator?p=1000000&r=8.5&y=20`);
    assert((await page.getAttribute('html', 'lang')) === 'ta-IN', 'html lang');
    assert((await page.textContent('h1')).includes('EMI கால்குலேட்டர்'), 'tamil h1');
    // The calculator still works and in-tool labels are translated in the browser.
    await page.waitForFunction(() => document.body.textContent.includes('8,678'));
    await page.waitForFunction(() => document.querySelector('.tool-card').textContent.includes('கடன் தொகை'));
    const alts = await page.$$eval('link[rel=alternate][hreflang]', (l) => l.map((x) => x.getAttribute('hreflang')));
    assert(['en', 'hi', 'bn', 'mr', 'te', 'ta', 'x-default'].every((h) => alts.includes(h)), 'hreflang ' + alts);
    assert((await page.getAttribute('link[rel=canonical]', 'href')).endsWith('/ta/emi-calculator'), 'canonical');
    // Related tools and nav stay in Tamil.
    assert(await page.$('.tool-grid a[href^="/ta/"]'), 'related tools localized');
    await page.goto(`${BASE}/bn`);
    assert((await page.textContent('h1')).includes('বিনামূল্যের টুল'), 'bengali home');
    await page.goto(`${BASE}/mr/finance-calculators`);
    assert((await page.textContent('h1')).includes('मोफत फायनान्स'), 'marathi hub');
    await page.goto(`${BASE}/te/compress-pdf`);
    await page.waitForFunction(() => document.querySelector('.tool-card').textContent.includes('PDF ఎంచుకోండి') || document.querySelector('.tool-card').textContent.includes('కంప్రెస్ చేయడానికి'));
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('i18n: language picker, remembered choice, back to English', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/emi-calculator`);
    await page.click('.lang-pick summary');
    await page.click('.lang-menu a[data-lang="hi"]');
    await page.waitForURL((u) => u.pathname === '/hi/emi-calculator');
    assert((await page.evaluate(() => localStorage.getItem('lang'))) === 'hi', 'stored');
    // Opening any English tool page now shows the Hindi version.
    await page.goto(`${BASE}/compress-pdf`);
    await page.waitForURL((u) => u.pathname === '/hi/compress-pdf');
    // "Read in English" sticks.
    await page.click('.lang-note a[data-lang="en"]');
    await page.waitForURL((u) => u.pathname === '/compress-pdf');
    assert((await page.evaluate(() => localStorage.getItem('lang'))) === 'en', 'back to en');
    // Pages without translations (about) keep English and the picker links to the localized home.
    await page.goto(`${BASE}/about`);
    assert((await page.getAttribute('.lang-menu a[data-lang="ta"]', 'href')) === '/ta', 'home fallback');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
