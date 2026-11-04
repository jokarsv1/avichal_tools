import { pdfText } from './pdf.mjs';
export default (test, { BASE, newPage, download, assert }) => {
  test('salary-calculator: 12 LPA in-hand', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/salary-calculator?c=1200000&v=0&b=50&h=50&p=capped&g=1&t=2400&r=new&rp=0`);
    await page.waitForFunction(() => document.querySelector('#o-month').textContent.includes('93,79'));
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('hra-calculator: example from page', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/hra-calculator?b=50000&h=20000&r=18000&m=1`);
    await page.waitForFunction(() => document.querySelector('#o-ex').textContent.includes('1,56,000'));
  });

  test('home-loan-prepayment-calculator: saves interest', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/home-loan-prepayment-calculator?p=5000000&r=8.5&y=20&l=0&lm=1&me=0&ye=43391&m=tenure`);
    await page.waitForFunction(() => document.querySelector('#o-msaved').textContent.startsWith('3 yr'));
  });

  test('rent-receipt-generator: 12 receipts on 6 pages', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/rent-receipt-generator`);
    await page.fill('#rr-tenant', 'Rahul Sharma');
    await page.fill('#rr-landlord', 'Suresh Gupta');
    await page.fill('#rr-pan', 'ABCDE1234F');
    await page.fill('#rr-addr', 'Flat 302, Sunrise Apartments, Pune');
    await page.fill('#rr-from', '2026-04');
    await page.fill('#rr-to', '2027-03');
    const d = await download(page, '#rr-go');
    const txt = await pdfText(d.path);
    assert((txt.match(/RENT RECEIPT/g) || []).length === 12, 'receipt count');
    assert(txt.includes('Rupees Fifteen Thousand Only') && txt.includes('ABCDE1234F'), 'content');
  });

  test('invoice-generator: IGST invoice with UPI QR', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/invoice-generator`);
    await page.fill('#s-name', 'Sharma Traders');
    await page.fill('#s-state', 'Maharashtra');
    await page.fill('#s-upi', 'sharma@okicici');
    await page.fill('#b-name', 'Acme Pvt Ltd');
    await page.fill('#b-state', 'Karnataka');
    await page.waitForFunction(() => document.querySelector('#supply-type').textContent.includes('IGST'));
    const d = await download(page, '#inv-go');
    const txt = await pdfText(d.path);
    assert(txt.includes('IGST') && txt.includes('29,500.00') && txt.includes('Rupees Twenty-Nine Thousand Five Hundred Only'), txt.slice(0, 400));
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
