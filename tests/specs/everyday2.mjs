export default (test, { BASE, newPage, assert }) => {
  test('unit converter: land units, temperature, height', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/unit-converter?c=area&v=100&f=sqyd&t=sqft`);
    await page.waitForFunction(() => document.querySelector('#uc-out').textContent.startsWith('900 '));
    await page.goto(`${BASE}/unit-converter?c=temperature&v=37&f=C&t=F`);
    await page.waitForFunction(() => document.querySelector('#uc-out').textContent.startsWith('98.6'));
    // height ft/in -> cm (5'7" = 170.2 cm)
    assert((await page.inputValue('#hc-cm')) === '170.2', 'height');
    // preset switches category and units
    await page.click('.quick [data-preset]:has-text("kg ↔ lb")');
    await page.fill('#uc-val', '10');
    await page.waitForFunction(() => document.querySelector('#uc-out').textContent.startsWith('22.046'));
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('bmi calculator: Indian and WHO categories', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/bmi-calculator?h=170&w=70`);
    await page.waitForFunction(() => document.querySelector('#o-bmi').textContent === '24.2');
    assert((await page.textContent('#o-in')).startsWith('Overweight'), 'indian scale');
    assert((await page.textContent('#o-who')) === 'Normal', 'who scale');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('days calculator: difference, working days, add days', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/days-calculator?a=2026-01-01&b=2026-12-31`);
    await page.waitForFunction(() => document.querySelector('#o-days').textContent === '364 days');
    assert((await page.textContent('#o-work')) === '260', 'working days ' + (await page.textContent('#o-work')));
    await page.check('#dinc');
    await page.waitForFunction(() => document.querySelector('#o-days').textContent === '365 days');
    await page.fill('#dd-n', '90');
    await page.waitForFunction(() => document.querySelector('#dd-out').textContent.includes('1 April 2026'));
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('password generator: length, sets, strength', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/password-generator`);
    const pw = await page.textContent('#pw-out');
    assert(pw.length === 16 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw), 'default ' + pw);
    await page.click('text=PIN (6 digits)');
    await page.waitForFunction(() => /^\d{6}$/.test(document.querySelector('#pw-out').textContent));
    await page.fill('#pw-check', 'password123');
    assert((await page.textContent('#pw-check-out')).includes('Weak'), 'weak check');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('json formatter: format, error location, fix, csv', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/json-formatter`);
    await page.fill('#js-in', '{"b":1,"a":[1,2]}');
    await page.click('#js-fmt');
    assert((await page.inputValue('#js-out')).includes('\n  "b": 1'), 'formatted');
    await page.fill('#js-in', '{\n  "a": 1,\n  "b": }');
    await page.click('#js-fmt');
    assert((await page.textContent('#js-status')).includes('line 3'), 'error line: ' + (await page.textContent('#js-status')));
    await page.fill('#js-in', "{a: 'x', b: [1, 2,], // note\n c: None}");
    await page.click('#js-fix');
    assert(JSON.parse(await page.inputValue('#js-out')).c === null, 'fixed');
    await page.fill('#js-in', '[{"n":"A","v":1},{"n":"B, C","v":2}]');
    await page.click('#js-csv');
    assert((await page.inputValue('#js-out')) === 'n,v\nA,1\n"B, C",2', 'csv');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('time zone converter: IST to New York with DST, planner', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/time-zone-converter?z=Asia/Kolkata,America/New_York&b=Asia/Kolkata&d=2026-07-01&t=20:00`);
    await page.waitForFunction(() => document.querySelectorAll('.tz-row').length === 2);
    const rows = await page.$$eval('.tz-row', (r) => r.map((x) => x.textContent));
    assert(rows[1].includes('10:30') && rows[1].includes('−9h 30m'), 'summer ' + rows[1]);
    await page.fill('#tz-date', '2026-12-01');
    await page.waitForFunction(() => document.querySelectorAll('.tz-row')[1].textContent.includes('9:30'));
    assert((await page.$$('#tz-grid tbody tr')).length === 24, 'planner rows');
    assert((await page.$$('#tz-grid tr.tz-ok, #tz-grid tr.tz-good')).length > 0, 'overlap found');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
