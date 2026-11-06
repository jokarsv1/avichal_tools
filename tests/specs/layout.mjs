export default (test, { BASE, newPage, assert }) => {
  test('layout: clean top (H1, one line, tool), all text in the guide below', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/compress-pdf`);
    const hero = await page.$eval('.tool-hero', (h) => h.innerText);
    assert(hero.length < 200, 'hero text is short: ' + hero.length);
    assert((await page.textContent('.tagline')).trim().length > 10, 'tagline');
    assert(!(await page.$('.tool-hero .trust')), 'no badge pills at the top');
    // Order: tool card, then related tools, then the guide with all the reading text.
    const order = await page.evaluate(() => ['.tool-card', '.related', '.guide'].map((s) => document.querySelector(s).getBoundingClientRect().top + scrollY));
    assert(order[0] < order[1] && order[1] < order[2], 'tool → related → guide: ' + order);
    assert(await page.$('.guide .faq details'), 'FAQ inside the guide');
    assert(await page.$('.guide .prose h2'), 'long-form content inside the guide');
    assert(!(await page.$('.embed-box')), 'no embed box on file tools');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('home: short hero, 12 popular tools, compact category lists', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/`);
    assert((await page.$$('#popular .tool-tile')).length === 12, 'popular 12');
    assert((await page.$$('[data-cat] .tool-tile.compact')).length > 50, 'compact tiles in categories');
    assert(await page.$('.guide .prose h2'), 'why-free text moved to the guide');
    // Home search still filters compact tiles.
    await page.fill('#tool-search', 'emi');
    await page.waitForFunction(() => document.querySelectorAll('[data-cat] .tool-tile:not(.hidden)').length >= 1);
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('embed: ?embed=1 shows only the calculator, credits SaralKit, reports its height', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/emi-calculator`);
    const code = await page.inputValue('.embed-code');
    assert(code.includes('/emi-calculator?embed=1') && code.includes('<a href="https://saralkit.com/emi-calculator">'), code);

    await page.goto(`${BASE}/emi-calculator?embed=1`);
    assert(await page.evaluate(() => document.documentElement.classList.contains('embed')), 'embed class');
    for (const sel of ['.site-header', '.site-footer', '.guide', '.related', '.support']) assert(!(await page.isVisible(sel)), sel + ' hidden');
    assert(await page.isVisible('.tool-card'), 'tool visible');
    assert(await page.isVisible('.embed-credit a[href$="/emi-calculator"]'), 'credit link');

    // Inside another site's iframe the page posts its height to the host.
    const host = await newPage();
    await host.setContent(`<iframe src="${BASE}/emi-calculator?embed=1" style="width:700px;height:400px"></iframe><script>window.h=0;addEventListener('message',function(e){if(e.data&&e.data.skH)window.h=e.data.skH})</script>`);
    await host.waitForFunction(() => window.h > 600, null, { timeout: 15000 });
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('seo files: robots blocks internal search, sitemap has hreflang and no noindex pages', async () => {
    const page = await newPage();
    const robots = await (await page.request.get(`${BASE}/robots.txt`)).text();
    assert(robots.includes('Disallow: /search$') && robots.includes('Sitemap: '), robots);
    const sm = await (await page.request.get(`${BASE}/sitemap-0.xml`)).text();
    assert(sm.includes('hreflang="hi"') && sm.includes('/hi/emi-calculator'), 'hreflang alternates in sitemap');
    assert(!sm.includes('/search<'), 'search page not in sitemap');
  });
};
