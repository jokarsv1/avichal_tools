export default (test, { BASE, newPage, assert }) => {
  test('ppp-salary-calculator: USA offer -> savings in INR + equivalent CTC', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/ppp-salary-calculator?c=usa&ct=seattle&s=150000&fx=94.75`);
    await page.waitForFunction(() => document.querySelector('#ab-save-inr').textContent.includes('₹'), null, { timeout: 15000 });
    const save = await page.textContent('#ab-save-inr');
    const eq = await page.textContent('#ab-eq-ctc');
    assert(/₹/.test(save) && /L|Cr/.test(eq), `save=${save} eq=${eq}`);
    // Family should save less than single
    const single = +save.replace(/[^\d]/g, '');
    await page.selectOption('#ab-spouse', '1');
    await page.selectOption('#ab-kids', '2');
    const fam = +(await page.textContent('#ab-save-inr')).replace(/[^\d-]/g, '');
    assert(fam < single, `family ${fam} >= single ${single}`);
    assert((await page.$$('#ab-tax-table tr')).length >= 4, 'tax table');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('country page + currency converter render', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/salary-in-uae-vs-india`);
    await page.waitForFunction(() => document.querySelector('#ab-country').value === 'uae');
    const tax = await page.textContent('#ab-tax');
    assert(tax.includes('0.0%'), 'UAE tax should be 0: ' + tax);
    await page.goto(`${BASE}/usd-to-inr`);
    await page.fill('#fx-amt', '100');
    await page.waitForFunction(() => /INR/.test(document.querySelector('#fx-out').textContent));
    const out = await page.textContent('#fx-out');
    const v = +out.replace(/[^\d.]/g, '');
    assert(v > 7000 && v < 12000, 'USD->INR implausible: ' + out);
    await page.click('#fx-swap');
    await page.waitForFunction(() => document.querySelector('#fx-from').value === 'INR');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
