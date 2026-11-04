import fs from 'node:fs';
export default (test, { BASE, newPage, download, assert }) => {
  const txt = (page, sel) => page.textContent(sel).then((s) => s.trim());

  test('emi-calculator: defaults + URL state', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/emi-calculator?p=1000000&r=8.5&y=20`);
    await page.waitForFunction(() => document.querySelector('#o-emi').textContent.includes('8,678'));
    assert((await page.$$('#o-table tr')).length === 20, 'schedule rows');
    assert(await page.$('#o-chart svg'), 'chart missing');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('sip-calculator: 10k x 10y @12% = 23.2L', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/sip-calculator?m=10000&r=12&y=10&s=0&l=0`);
    await page.waitForFunction(() => document.querySelector('#o-value').textContent.includes('23,23,39'));
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('income-tax-calculator: 13L salary new regime = 26,000', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/income-tax-calculator?s=1300000&o=0&a=below60&e=0&c=0&d=0&n=0&h=0&x=0&t=0&pt=0`);
    await page.waitForFunction(() => document.querySelector('#o-new').textContent.includes('26,000'));
    const v = await txt(page, '#o-verdict');
    assert(/New regime saves/.test(v), v);
    await page.click('#h-use');
    assert(+(await page.inputValue('#dhra')) === 180000, 'HRA not applied');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('gst-calculator: remove 18% from 1180', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/gst-calculator?a=1180&m=remove&r=18&t=intra`);
    await page.waitForFunction(() => document.querySelector('#o-base').textContent.includes('1,000.00'));
  });

  test('fd + ppf calculators render', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/fd-calculator?p=100000&r=7&m=36&c=4`);
    await page.waitForFunction(() => document.querySelector('#o-mat').textContent.includes('1,23,14'));
    await page.goto(`${BASE}/ppf-calculator?d=150000&r=7.1&y=15&c=1`);
    await page.waitForFunction(() => document.querySelector('#o-mat').textContent.includes('40,68,2'));
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('attendance + cgpa', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/attendance-calculator?a=30&t=50&r=75`);
    await page.waitForFunction(() => /next 30 classes/.test(document.querySelector('#o-msg').textContent));
    await page.goto(`${BASE}/cgpa-to-percentage?c=8.4&f=cbse`);
    await page.waitForFunction(() => document.querySelector('#o-pct').textContent === '79.80%');
  });

  test('age + percentage + number-to-words', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/age-calculator?d=2000-01-15&o=2026-08-01`);
    await page.waitForFunction(() => document.querySelector('#o-age').textContent === '26 years, 6 months, 17 days');
    await page.goto(`${BASE}/percentage-calculator`);
    assert((await txt(page, '[data-pc=of] .pc-out')) === '100', 'pct of');
    await page.goto(`${BASE}/number-to-words?n=12500050&s=indian&c=inr`);
    await page.waitForFunction(() => document.querySelector('#n-out').textContent === 'Rupees One Crore Twenty-Five Lakh Fifty Only');
  });

  test('word-counter counts', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/word-counter`);
    await page.fill('#w-text', 'Hello world. This is a well-known test!\n\nSecond paragraph here.');
    assert((await txt(page, '#w-words')) === '10', 'words ' + (await txt(page, '#w-words')));
    assert((await txt(page, '#w-para')) === '2', 'paras');
  });

  test('qr-code-generator: PNG + SVG + wifi', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/qr-code-generator`);
    await page.waitForSelector('#q-status.ok');
    const png = await download(page, '#q-png');
    assert(png.size > 1000, 'png');
    const svg = await download(page, '#q-svg');
    assert(fs.readFileSync(svg.path, 'utf8').includes('<svg'), 'svg');
    await page.click('[data-type=wifi]');
    await page.fill('#q-ssid', 'Home;Net');
    await page.fill('#q-pass', 'p@ss:1');
    await page.waitForFunction(() => document.querySelector('#q-payload').textContent.startsWith('WIFI:T:WPA;S:Home\\;Net;P:p@ss\\:1;'));
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('upi-qr-code-generator: poster', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/upi-qr-code-generator`);
    await page.fill('#u-vpa', 'shop@okicici');
    await page.fill('#u-name', 'Sharma Store');
    await page.fill('#u-amt', '250');
    await page.waitForSelector('#u-status.ok');
    const link = await txt(page, '#u-link');
    assert(link === 'upi://pay?pa=shop%40okicici&pn=Sharma%20Store&am=250.00&cu=INR', link);
    const d = await download(page, '#u-dl-poster');
    assert(d.size > 10000, 'poster');
  });

  test('text-to-handwriting: renders and exports PDF', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/text-to-handwriting`);
    await page.waitForSelector('#hw-status.ok', { timeout: 20000 });
    assert((await page.$$('.hw-page canvas')).length >= 1, 'no pages');
    const d = await download(page, '#hw-pdf');
    assert(d.name.endsWith('.pdf') && d.size > 10000, 'pdf');
  });

  test('home page search filters tools', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/`);
    await page.fill('#tool-search', 'emi');
    const visible = await page.$$eval('[data-cat] .tool-tile:not(.hidden)', (els) => els.map((e) => e.textContent));
    assert(visible.length >= 1 && visible.every((v) => /emi/i.test(v)), visible.join('|'));
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
