export default (test, { BASE, newPage, assert }) => {
  test('salary-needed-abroad: 30L Bengaluru -> ~$86k Seattle + table', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/salary-needed-abroad?ctc=3000000&ic=bengaluru&c=usa&ct=seattle&sp=0&k=0&l=moderate&m=0`);
    await page.waitForFunction(() => /\$8[5-7],000/.test(document.querySelector('#na-out').textContent), null, { timeout: 15000 });
    assert((await page.$$('#na-table tr')).length >= 20, 'city table');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
