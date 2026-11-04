export default (test, { BASE, newPage, fixture, assert }) => {
  test('presets: compress-video WhatsApp chip sets 16 MB target', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/compress-video`);
    await page.click('.quick .chip:has-text("WhatsApp")');
    assert((await page.inputValue('#vt-mb')) === '16', 'mb');
    assert(await page.isChecked('input[name=vt-by][value=size]'), 'size mode');
    assert(await page.$('.quick .chip.active'), 'active chip');
  });

  test('presets: deep link ?preset= applies exam spec', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/exam-photo-resizer?preset=ssc-signature`);
    await page.waitForFunction(() => document.querySelector('.kb-preset').value === 'ssc-sign');
    await page.setInputFiles('#kb-drop input[type=file]', fixture('signature.jpg'));
    await page.waitForSelector('.kb-status.ok', { timeout: 30000 });
    const dim = await page.textContent('.kb-out-dim');
    assert(dim.includes('472 × 236'), dim);
  });

  test('presets: URL chips on calculators and QR type buttons', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/emi-calculator`);
    await page.click('.quick .chip:has-text("Car loan")');
    await page.waitForFunction(() => document.querySelector('#amount').value === '800000');
    await page.goto(`${BASE}/qr-code-generator`);
    await page.click('.quick .chip:has-text("Wi-Fi")');
    assert(!(await page.$('[data-form=wifi].hidden')), 'wifi form should show');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
