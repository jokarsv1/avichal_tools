import path from 'node:path';
const astro = path.resolve('tests/fixtures/astronaut.png');

async function cornerOf(page, sel) {
  return page.evaluate(async (s) => {
    const el = document.querySelector(s);
    let c = el;
    if (el.tagName === 'IMG') { await el.decode(); c = document.createElement('canvas'); c.width = el.naturalWidth; c.height = el.naturalHeight; c.getContext('2d').drawImage(el, 0, 0); }
    return Array.from(c.getContext('2d').getImageData(c.width - 3, 3, 1, 1).data);
  }, sel);
}

export default (test, { BASE, newPage, download, assert }) => {
  test('background-remover: portrait -> transparent corners + white option', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/background-remover`);
    await page.setInputFiles('#bg-drop input[type=file]', astro);
    await page.waitForSelector('#bg-status.ok, #bg-status.err', { timeout: 60000 });
    assert(!(await page.$('#bg-status.err')), await page.textContent('#bg-status'));
    const px = await cornerOf(page, '#bg-preview');
    assert(px[3] < 40, 'top-right corner should be transparent: ' + px);
    const d = await download(page, '#bg-png');
    assert(d.name.endsWith('.png') && d.size > 10000, d.name);
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('exam resizer: AI white background', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/ibps-photo-resizer`);
    await page.setInputFiles('#kb-drop input[type=file]', astro);
    await page.waitForSelector('.kb-status.ok', { timeout: 60000 });
    await page.check('.kb-white');
    await page.waitForFunction(() => document.querySelector('.kb-status').classList.contains('info'), null, { timeout: 10000 });
    await page.waitForSelector('.kb-status.ok', { timeout: 60000 });
    const px = await cornerOf(page, '.kb-out-img');
    assert(px[0] > 235 && px[1] > 235 && px[2] > 235, 'corner should be white: ' + px);
  });
};
