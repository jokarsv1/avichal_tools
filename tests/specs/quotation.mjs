import { pdfText } from './pdf.mjs';

export default (test, { BASE, newPage, download, assert }) => {
  test('quotation generator: discount, no GST, validity, convert to invoice', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/quotation-generator`);
    assert((await page.inputValue('#i-no')).startsWith('QT-'), 'quote number');
    await page.fill('#s-name', 'Sharma Interiors');
    await page.fill('#b-name', 'Mehta Residence');
    await page.fill('#b-addr', 'Flat 12, Pune');
    await page.fill('#q-disc', '10');
    await page.uncheck('#q-gst');
    await page.waitForFunction(() => document.querySelector('#supply-type').textContent.includes('without GST'));
    // Default item 25,000 with 10% off and no GST = 22,500.
    await page.waitForFunction(() => document.querySelector('#totals').textContent.includes('22,500'));
    assert(await page.$eval('#bill', (b) => b.classList.contains('no-gst')), 'GST column hidden');
    await page.fill('#i-notes', '50% advance, balance on completion.');
    const d = await download(page, '#inv-go');
    const txt = await pdfText(d.path);
    assert(txt.includes('QUOTATION') && txt.includes('Valid until') && txt.includes('22,500.00') && txt.includes('exclusive of GST') && txt.includes('50% advance'), txt.slice(0, 500));
    assert(!txt.includes('TAX INVOICE') && !txt.includes('CGST'), 'no tax lines on a non-GST quote');

    // Convert to invoice: items (after discount, GST 0) and the customer move across.
    await page.click('#q-convert');
    await page.waitForURL((u) => u.pathname === '/invoice-generator');
    assert((await page.inputValue('#b-name')) === 'Mehta Residence', 'customer carried over');
    assert((await page.inputValue('#s-name')) === 'Sharma Interiors', 'business shared');
    assert((await page.inputValue('#i-no')).startsWith('INV-'), 'invoice number');
    await page.waitForFunction(() => document.querySelector('#totals').textContent.includes('22,500'));
    // Prefill is used once only.
    await page.reload();
    assert((await page.inputValue('#b-name')) === '', 'prefill cleared after use');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
