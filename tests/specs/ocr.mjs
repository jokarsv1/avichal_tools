export default (test, { BASE, newPage, fixture, assert }) => {
  test('image-to-text: reads English text (self-hosted tesseract)', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/image-to-text`);
    await page.setInputFiles('#ocr-drop input[type=file]', fixture('text.png'));
    await page.waitForSelector('#ocr-status.ok, #ocr-status.warn, #ocr-status.err', { timeout: 90000 });
    const txt = await page.inputValue('#ocr-out');
    assert(/Invoice Number 4521/.test(txt) && /18,500/.test(txt), 'got: ' + txt + ' | ' + (await page.textContent('#ocr-status')));
  });
};
