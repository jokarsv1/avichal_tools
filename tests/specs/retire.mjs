export default (test, { BASE, newPage, assert }) => {
  test('nps calculator: corpus, 80% rule, govt 40%', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/nps-calculator?a=30&x=60&m=5000&e=0&s=0&b=0&r=10&p=40&ar=6&sec=private`);
    await page.waitForFunction(() => document.querySelector('#o-corpus').textContent.includes('1,13,96,6'));
    assert((await page.textContent('#o-pension')).includes('22,79'), 'pension ' + (await page.textContent('#o-pension')));
    await page.fill('#ann', '0');
    await page.waitForFunction(() => document.querySelector('#o-rule').textContent.includes('raised to 20%'));
    assert((await page.textContent('#o-taxfree')).includes('may be taxable'), 'taxable note');
    await page.selectOption('#sec', 'govt');
    await page.waitForFunction(() => document.querySelector('#o-rule').textContent.includes('raised to 40%'));
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('retirement planner: corpus, SIP, shortfall', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/retirement-planner?a=30&ra=60&la=85&ex=50000&inf=6&pre=12&post=7&sv=0&cm=10000&st=0`);
    await page.waitForFunction(() => document.querySelector('#o-words').textContent.includes('7.71 Cr'));
    assert((await page.textContent('#o-msg')).includes('falls short'), 'shortfall msg');
    await page.fill('#cur', '400000');
    await page.waitForFunction(() => document.querySelector('#o-msg').textContent.includes('on track'));
    assert((await page.$$('#o-table tr')).length === 55, 'path rows ' + (await page.$$('#o-table tr')).length);
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
