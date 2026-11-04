/** Indian-friendly number formatting and number-to-words. Pure functions (unit tested in Node). */

const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export const rupees = (n: number, paise = false) => (Number.isFinite(n) ? (paise ? inr2 : inr0).format(n) : '–');
export const fmtNum = (n: number) => (Number.isFinite(n) ? num.format(n) : '–');

/** ₹1.25 Cr, ₹12.4 L, ₹45.2K */
export function rupeesShort(n: number): string {
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(a >= 1e9 ? 0 : 2).replace(/\.?0+$/, '')} Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2).replace(/\.?0+$/, '')} L`;
  if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return `${s}₹${Math.round(a)}`;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function below1000(n: number): string {
  const h = Math.floor(n / 100), r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (r) parts.push(r < 20 ? ONES[r] : `${TENS[Math.floor(r / 10)]}${r % 10 ? '-' + ONES[r % 10] : ''}`);
  return parts.join(' ');
}

/** Words for a non-negative integer (up to 10^21 safely via BigInt). */
export function intToWords(value: bigint | number, system: 'indian' | 'international' = 'indian'): string {
  let n = BigInt(value);
  if (n === 0n) return 'Zero';
  const out: string[] = [];
  if (system === 'indian') {
    // ... crore crore, crore, lakh, thousand, hundreds
    const crore = n / 10000000n;
    n %= 10000000n;
    if (crore > 0n) out.push(`${crore >= 1000n ? intToWords(crore, 'indian') : below1000(Number(crore))} Crore`);
    const lakh = Number(n / 100000n); n %= 100000n;
    if (lakh) out.push(`${below1000(lakh)} Lakh`);
    const th = Number(n / 1000n); n %= 1000n;
    if (th) out.push(`${below1000(th)} Thousand`);
    if (n) out.push(below1000(Number(n)));
  } else {
    const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion', 'Quadrillion', 'Quintillion'];
    let i = 0;
    const groups: string[] = [];
    while (n > 0n) {
      const g = Number(n % 1000n);
      if (g) groups.unshift(`${below1000(g)}${scales[i] ? ' ' + scales[i] : ''}`);
      n /= 1000n; i++;
    }
    out.push(...groups);
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

/** "12,34,567.50" -> words. currency adds "Rupees ... and ... Paise Only". */
export function numberToWords(input: string, system: 'indian' | 'international', currency: 'none' | 'inr' | 'usd'): string {
  const clean = input.replace(/[,\s₹$]/g, '');
  if (!/^-?\d*(\.\d*)?$/.test(clean) || !/\d/.test(clean)) return '';
  const neg = clean.startsWith('-');
  const [ip = '0', fp = ''] = clean.replace('-', '').split('.');
  const intWords = intToWords(BigInt(ip || '0'), system);
  let res: string;
  if (currency === 'none') {
    res = intWords + (fp ? ` Point ${fp.split('').map((d) => (d === '0' ? 'Zero' : ONES[+d])).join(' ')}` : '');
  } else {
    const cents = fp ? Math.round(Number('0.' + fp) * 100) : 0;
    const [major, minor] = currency === 'inr' ? ['Rupees', 'Paise'] : ['Dollars', 'Cents'];
    const big = BigInt(ip || '0') + (cents === 100 ? 1n : 0n);
    const words = intToWords(big, system);
    res = `${currency === 'inr' ? 'Rupees ' + words : words + ' ' + major}`;
    if (cents && cents !== 100) res += ` and ${below1000(cents)} ${minor}`;
    res += ' Only';
    if (big === 1n && currency === 'usd') res = res.replace('Dollars', 'Dollar');
  }
  return (neg ? 'Minus ' : '') + res;
}

/** Group digits Indian style: 1234567 -> 12,34,567 */
export function indianGrouping(input: string): string {
  const [i, f] = input.replace(/,/g, '').split('.');
  const x = i.replace(/^(-?)/, '');
  const last3 = x.slice(-3), rest = x.slice(0, -3);
  const g = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  return (i.startsWith('-') ? '-' : '') + g + (f !== undefined ? '.' + f : '');
}
