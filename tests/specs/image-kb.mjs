import fs from 'node:fs';
export default (test, { BASE, newPage, download, fixture, assert }) => {
  test('resize-image-to-kb: 50 KB from a 3000x4000 photo', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/resize-image-to-kb`);
    await page.setInputFiles('#kb-drop input[type=file]', fixture('photo.jpg'));
    await page.waitForSelector('.kb-status.ok', { timeout: 30000 });
    const d = await download(page, '.kb-download');
    assert(d.size <= 50000, `size ${d.size} > 50000`);
    assert(d.size > 20000, `suspiciously small ${d.size}`);
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('ibps-photo-resizer: 200x230, padded to >= 20 KB, <= 50 KB', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/ibps-photo-resizer`);
    await page.setInputFiles('#kb-drop input[type=file]', fixture('photo.jpg'));
    await page.waitForSelector('.kb-status.ok', { timeout: 30000 });
    const dim = await page.textContent('.kb-out-dim');
    assert(dim.includes('200 × 230'), 'dims ' + dim);
    const d = await download(page, '.kb-download');
    assert(d.size >= 20480 && d.size <= 50000, `size ${d.size}`);
    const b = fs.readFileSync(d.path);
    assert(b[0] === 0xff && b[1] === 0xd8 && b[b.length - 2] === 0xff && b[b.length - 1] === 0xd9, 'not a valid JPEG');
    // signature preset
    await page.selectOption('.kb-preset', 'ibps-sign');
    await page.waitForFunction(() => document.querySelector('.kb-out-dim')?.textContent?.includes('140 × 60') && document.querySelector('.kb-status')?.classList.contains('ok'), null, { timeout: 20000 });
    const s = await download(page, '.kb-download');
    assert(s.size >= 10240 && s.size <= 20000, `sign size ${s.size}`);
  });

  test('pan-card-photo-resizer: writes 200 DPI into JFIF', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/pan-card-photo-resizer`);
    await page.setInputFiles('#kb-drop input[type=file]', fixture('photo.jpg'));
    await page.waitForSelector('.kb-status.ok', { timeout: 30000 });
    const d = await download(page, '.kb-download');
    const b = fs.readFileSync(d.path);
    assert(b.toString('latin1', 6, 10) === 'JFIF', 'no JFIF');
    assert(b[13] === 1 && b.readUInt16BE(14) === 200, `dpi ${b[13]} ${b.readUInt16BE(14)}`);
    assert(d.size <= 50000, 'size ' + d.size);
  });

  test('signature-resizer: cleans background to white', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/signature-resizer`);
    await page.setInputFiles('#kb-drop input[type=file]', fixture('signature.jpg'));
    await page.waitForSelector('.kb-status.ok', { timeout: 30000 });
    const corner = await page.evaluate(async () => {
      const img = document.querySelector('.kb-out-img');
      await img.decode();
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      return Array.from(x.getImageData(2, 2, 1, 1).data);
    });
    assert(corner[0] > 245 && corner[1] > 245 && corner[2] > 245, 'background not white: ' + corner);
  });

  test('compress-image-to-20kb page works', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/compress-image-to-20kb`);
    await page.setInputFiles('#kb-drop input[type=file]', fixture('photo.jpg'));
    await page.waitForSelector('.kb-status.ok', { timeout: 30000 });
    const d = await download(page, '.kb-download');
    assert(d.size <= 20000, 'size ' + d.size);
  });
};
