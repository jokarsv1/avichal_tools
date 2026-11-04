import fs from 'node:fs';
import { pdfText } from './pdf.mjs';

export default (test, { BASE, newPage, download, assert }) => {
  test('compound, simple interest, inflation, discount calculators', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/compound-interest-calculator?p=100000&r=10&y=5&n=1&m=0`);
    await page.waitForFunction(() => document.querySelector('#o-mat').textContent.includes('1,61,051'));
    assert((await page.textContent('#o-si')).includes('50,000'), 'SI comparison');
    await page.selectOption('#n', '12');
    await page.waitForFunction(() => document.querySelector('#o-eff').textContent === '10.47%');
    await page.goto(`${BASE}/simple-interest-calculator?p=50000&r=12&t=6&u=m`);
    await page.waitForFunction(() => document.querySelector('#o-si').textContent.includes('3,000'));
    assert((await page.textContent('#o-work')).includes('6/12'), 'working shown');
    await page.goto(`${BASE}/inflation-calculator?a=100000&r=6&y=10`);
    await page.waitForFunction(() => document.querySelector('#o-cost').textContent.includes('1,79,08'));
    assert((await page.textContent('#o-msg')).includes('11.9 years'), 'doubling time');
    await page.goto(`${BASE}/discount-calculator?p=1000&d=20&e=10&g=0`);
    await page.waitForFunction(() => document.querySelector('#o-final').textContent.includes('720'));
    assert((await page.textContent('#o-eff')) === '28%', 'effective discount');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('salary slip generator: fill from gross, LOP, PDF', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/salary-slip-generator`);
    await page.fill('#ss-co', 'Sharma Traders Pvt Ltd');
    await page.fill('#ss-name', 'Ravi Kumar');
    await page.fill('#ss-month', '2026-11');
    await page.fill('#ss-gross', '30000');
    await page.click('#ss-fill');
    assert((await page.inputValue('#ss-basic')) === '15000' && (await page.inputValue('#ss-special')) === '7500', 'split');
    // Full month: 30000 - PF 1800 - PT 200 = 28000
    await page.waitForFunction(() => document.querySelector('#ss-preview').textContent.includes('Net pay: ₹28,000'));
    await page.fill('#ss-paid', '27'); // 3 days LOP in a 30-day month
    await page.waitForFunction(() => document.querySelector('#ss-preview').textContent.includes('Net pay: ₹25,180'));
    const d = await download(page, '#ss-go');
    const txt = await pdfText(d.path);
    assert(txt.includes('Payslip for the month of November 2026') && txt.includes('Ravi Kumar') && txt.includes('25,180.00'), 'pdf content: ' + txt.slice(0, 300));
    assert(fs.statSync(d.path).size > 1000, 'pdf size');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
