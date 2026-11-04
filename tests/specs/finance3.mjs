export default (test, { BASE, newPage, assert }) => {
  test('lumpsum + cagr + rd + swp + gratuity render correct values', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/lumpsum-calculator?p=100000&r=12&y=10`);
    await page.waitForFunction(() => document.querySelector('#o-v').textContent.includes('3,10,585'));
    await page.goto(`${BASE}/cagr-calculator?s=100000&e=200000&y=6`);
    await page.waitForFunction(() => document.querySelector('#o-c').textContent === '12.25%');
    await page.goto(`${BASE}/rd-calculator?p=5000&r=7&m=12`);
    await page.waitForFunction(() => document.querySelector('#o-m').textContent.includes('62,3'));
    await page.goto(`${BASE}/swp-calculator?c=1000000&w=20000&r=8&y=10&s=0`);
    await page.waitForFunction(() => document.querySelector('#o-msg').textContent.includes('runs out'));
    await page.goto(`${BASE}/gratuity-calculator?w=50000&y=10&m=7&c=1&t=perm`);
    await page.waitForFunction(() => document.querySelector('#o-g').textContent.includes('3,17,308'));
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
