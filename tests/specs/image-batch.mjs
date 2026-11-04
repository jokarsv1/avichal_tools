import fs from 'node:fs';
export default (test, { BASE, newPage, download, fixture, assert }) => {
  test('image-compressor: JPG + PNG shrink, ZIP download', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/image-compressor`);
    await page.setInputFiles('#bi-drop input[type=file]', [fixture('photo.jpg'), fixture('image.png')]);
    await page.waitForFunction(() => !document.querySelector('.bi-zip').disabled, null, { timeout: 30000 });
    const sizes = await page.$$eval('.bi-list .size', (els) => els.map((e) => e.textContent));
    assert(sizes.every((s) => s.includes('→')), sizes.join(' | '));
    const z = await download(page, '.bi-zip');
    assert(z.name.endsWith('.zip') && z.size > 1000, 'zip ' + z.size);
    const total = await page.textContent('.bi-summary');
    assert(/saved/.test(total), total);
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('resize-image: Instagram preset gives 1080x1080', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/resize-image`);
    await page.selectOption('.bi-preset', '1080x1080');
    await page.setInputFiles('#bi-drop input[type=file]', fixture('photo.jpg'));
    await page.waitForFunction(() => document.querySelector('.bi-list .size')?.textContent.includes('1080×1080'), null, { timeout: 30000 });
    const d = await download(page, '.bi-list .dl');
    assert(d.name.includes('1080x1080'), d.name);
  });

  test('heic-to-jpg: converts a real HEIC', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/heic-to-jpg`);
    await page.setInputFiles('#bi-drop input[type=file]', fixture('sample.heic'));
    await page.waitForFunction(() => !document.querySelector('.bi-zip').disabled, null, { timeout: 60000 });
    const d = await download(page, '.bi-list .dl');
    const b = fs.readFileSync(d.path);
    assert(d.name.endsWith('.jpg') && b[0] === 0xff && b[1] === 0xd8, 'not jpeg ' + d.name);
  });

  test('png-to-jpg and webp-to-jpg convert', async () => {
    for (const [route, f] of [['png-to-jpg', 'image.png'], ['webp-to-jpg', 'image.webp'], ['jpg-to-png', 'photo.jpg']]) {
      const page = await newPage();
      await page.goto(`${BASE}/${route}`);
      await page.setInputFiles('#bi-drop input[type=file]', fixture(f));
      await page.waitForFunction(() => !document.querySelector('.bi-zip').disabled, null, { timeout: 30000 });
      const d = await download(page, '.bi-list .dl');
      assert(d.name.endsWith(route.endsWith('png') ? '.png' : '.jpg'), route + ' ' + d.name);
    }
  });

  test('crop-image: circle crop outputs PNG', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/crop-image`);
    await page.setInputFiles('#crop-drop input[type=file]', fixture('image.png'));
    await page.selectOption('#crop-shape', 'circle');
    const d = await download(page, '#crop-download');
    assert(d.name.endsWith('.png'), d.name);
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
