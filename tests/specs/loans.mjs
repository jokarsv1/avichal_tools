export default (test, { BASE, newPage, assert }) => {
  test('emi-calculator: prepayment panel shows both savings', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/emi-calculator?p=5000000&r=8.5&y=20&pl=500000&pm=12&pe=0`);
    await page.waitForFunction(() => document.querySelector('#o-emi').textContent.includes('43,391'));
    const t = await page.textContent('#pp-t-saved'), e = await page.textContent('#pp-e-emi'), m = await page.textContent('#pp-t-months');
    assert(/₹/.test(t) && /yr/.test(m) && /₹/.test(e), `${t} ${m} ${e}`);
    const tv = +t.replace(/[^\d]/g, ''), ev = +(await page.textContent('#pp-e-saved')).replace(/[^\d]/g, '');
    assert(tv > ev && ev > 0, 'tenure reduction should save more than EMI reduction');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('loan-type pages + new loan tools render', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/car-loan-emi-calculator`);
    await page.waitForFunction(() => document.querySelector('#amount').value === '800000' && document.querySelector('#o-emi').textContent.includes('₹'));
    await page.goto(`${BASE}/balance-transfer-calculator?o=4000000&m=180&r1=9.5&r2=8.5&f=20000`);
    await page.waitForFunction(() => document.querySelector('#o-v').textContent.includes('Worth switching'));
    await page.goto(`${BASE}/loan-eligibility-calculator?n=100000&e=0&f=50&r=8.5&t=20&a=30`);
    await page.waitForFunction(() => document.querySelector('#o-ls').textContent.includes('57.6'));
    await page.goto(`${BASE}/loan-comparison-calculator`);
    await page.waitForFunction(() => document.querySelector('#lc-verdict').textContent.includes('Bank A is cheapest'));
    await page.goto(`${BASE}/home-loan-prepayment-calculator?p=5000000&r=8.5&y=20&l=500000&lm=12&me=0&ye=0&m=tenure`);
    await page.waitForFunction(() => document.querySelector('#cmp-verdict').textContent.includes('more in interest'));
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
