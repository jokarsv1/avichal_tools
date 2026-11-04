// Unit tests for pure finance/format functions. Run: node tests/unit.mjs (Node 22.18+ strips TS types natively).
import { emi, sip, fd, ppf, gst, incomeTax, breakEvenDeductions, hraExemption, attendance, salaryBreakup, prepayment, lumpsum, cagr, swp, rd, gratuity, epf, ssy } from '../src/lib/finance.ts';
import { numberToWords, indianGrouping, rupeesShort } from '../src/lib/format.ts';
import { COUNTRIES, foreignTax, livingCosts, equivalentIndianCtc, INDIA_CITIES } from '../src/lib/abroad.ts';

let fails = 0;
const eq = (name, got, want, tol = 1) => {
  const ok = typeof want === 'number' ? Math.abs(got - want) <= tol : got === want;
  console.log(`${ok ? '✓' : '✗'} ${name}: ${got}${ok ? '' : ` (expected ${want})`}`);
  if (!ok) fails++;
};
const base = { salary: 0, otherIncome: 0, age: 'below60', d80c: 0, d80d: 0, dNps: 0, dHomeLoan: 0, dHra: 0, dOther: 0, profTax: 0, employerNps: 0 };

eq('EMI 10L @8.5% 20y', Math.round(emi(1000000, 8.5, 240)), 8678);
eq('EMI 0% rate', emi(120000, 0, 12), 10000);
eq('SIP 10k @12% 10y', Math.round(sip(10000, 12, 10).value), 2323391, 2);
eq('SIP invested', sip(10000, 12, 10).invested, 1200000);
eq('SIP step-up 10% invested yr2', sip(10000, 12, 2, 10).invested, 120000 + 132000);
eq('Lump sum 1L @12% 10y', Math.round(sip(0, 12, 10, 0, 100000).value), 310585, 2);
eq('FD 1L @7% 3y quarterly', Math.round(fd(100000, 7, 36, 4).maturity), 123144, 2);
eq('PPF 1.5L @7.1% 15y', Math.round(ppf(150000, 7.1, 15).maturity), 4068209, 5);
eq('GST add 18% on 1000', gst(1000, 18, 'add').total, 1180);
eq('GST remove 18% from 1180', gst(1180, 18, 'remove').base, 1000, 0.001);

// Income tax FY 2026-27
eq('New: salary 12.75L -> 0', incomeTax({ ...base, salary: 1275000 }, 'new').total, 0);
eq('New: salary 13L (marginal relief) -> 26,000', incomeTax({ ...base, salary: 1300000 }, 'new').total, 26000);
eq('New: salary 20L -> 1,92,400', incomeTax({ ...base, salary: 2000000 }, 'new').total, 192400);
eq('New: other income 12L (no std ded) -> 0', incomeTax({ ...base, otherIncome: 1200000 }, 'new').total, 0);
eq('Old: salary 10L, 80C 1.5L -> 75,400', incomeTax({ ...base, salary: 1000000, d80c: 150000 }, 'old').total, 75400);
eq('Old: salary 5.5L -> 0 (87A)', incomeTax({ ...base, salary: 550000 }, 'old').total, 0);
eq('Old senior: 7L salary -> 41,600', incomeTax({ ...base, salary: 700000, age: '60to80' }, 'old').total, 41600);
const sc = incomeTax({ ...base, salary: 6000000 }, 'new');
// taxable 59,25,000: slab tax = 3,00,000 (to 24L) + 30% of 35.25L = 10,57,500 -> 13,57,500; surcharge 10% = 1,35,750; cess 4%
eq('New: 60L surcharge', sc.total, Math.round((1357500 + 135750) * 1.04 / 10) * 10);
const mr = incomeTax({ ...base, otherIncome: 5010000 }, 'new');
// just above 50L: surcharge relief limits extra tax to the extra income (10,000)
const at50 = incomeTax({ ...base, otherIncome: 5000000 }, 'new');
eq('Surcharge marginal relief (<= +10,400 incl cess)', mr.total - at50.total <= 10400 + 10 ? 1 : 0, 1);
eq('Break-even deductions >= 0', breakEvenDeductions({ ...base, salary: 1500000, d80c: 150000 }) > 0 ? 1 : 0, 1);
eq('HRA exemption metro', hraExemption(600000, 240000, 240000, true), 180000);
const at = attendance(30, 50, 75);
eq('Attendance 30/50 need for 75%', at.need, 30);
eq('Attendance 40/50 can skip at 75%', attendance(40, 50, 75).skip, 3);

// Salary: 12L CTC, no variable, 50% basic, capped PF, gratuity in CTC, PT 2400, new regime
const sal = salaryBreakup({ ctc: 1200000, variable: 0, basicPct: 50, hraPct: 50, pfMode: 'capped', gratuityInCtc: true, profTax: 2400, regime: 'new', rentPaid: 0, metro: true, otherDeductions80c: 0, d80d: 0 });
eq('Salary employer PF capped (21,600)', sal.employerPf, 21600);
eq('Salary gratuity 4.81% of basic', Math.round(sal.gratuity), 28860);
eq('Salary gross = CTC - PF - gratuity', Math.round(sal.gross), 1149540);
eq('Salary tax 0 (under 12.75L)', sal.tax, 0);
eq('Salary in-hand monthly', Math.round(sal.inHandMonthly), Math.round((1149540 - 21600 - 2400) / 12));
// Prepayment: 50L @8.5% 20y, 5L lump in month 12, reduce tenure
const pre = prepayment({ principal: 5000000, ratePct: 8.5, months: 240, lump: 500000, lumpMonth: 12, monthlyExtra: 0, yearlyExtra: 0, mode: 'tenure' });
eq('Prepay saves interest (> 0)', pre.saved > 1000000 ? 1 : 0, 1);
eq('Prepay shortens tenure', pre.monthsSaved > 30 ? 1 : 0, 1);
const none = prepayment({ principal: 5000000, ratePct: 8.5, months: 240, lump: 0, lumpMonth: 1, monthlyExtra: 0, yearlyExtra: 0, mode: 'tenure' });
eq('No prepayment = baseline interest', Math.round(none.interest), Math.round(none.baseInterest), 5);

eq('Lumpsum 1L @12% 10y', Math.round(lumpsum(100000, 12, 10).value), 310585, 2);
eq('CAGR 1L -> 2L in 6y', +cagr(100000, 200000, 6).toFixed(2), 12.25, 0.01);
eq('SWP 10L, 10k/m @8% 10y keeps corpus', swp(1000000, 10000, 8, 10).depletedAt, 0);
eq('SWP depletes when withdrawal too high', swp(1000000, 20000, 8, 10).depletedAt > 0 ? 1 : 0, 1);
eq('RD 5k x 12m @7% (bank formula)', Math.round(rd(5000, 7, 12).maturity), 62335, 40);
eq('Gratuity 50k x 10y 7m (=11y)', Math.round(gratuity(50000, 10, 7).amount), Math.round(50000 * 15 * 11 / 26));

const e1 = epf({ basic: 30000, age: 30, retireAge: 31, balance: 0, ratePct: 8.25, hikePct: 0 });
eq('EPF 1 year contributions (30k basic)', Math.round(e1.invested), Math.round(12 * (3600 + 3600 - 1249.5)));
eq('SSY 1.5L x 15y @8.2% maturity ~ 69-70L', ssy(150000, 8.2, 2).maturity > 6800000 && ssy(150000, 8.2, 2).maturity < 7200000 ? 1 : 0, 1);

// Abroad tax models (2026 estimates)
const C = (id) => COUNTRIES.find((c) => c.id === id);
const ft = (id, g, o = {}) => foreignTax(C(id), C(id).cities[0], g, { married: false, kids: 0, ruling: false, ...o });
eq('UK £60k net', Math.round(ft('uk', 60000).net), 45357, 2);
eq('SG S$120k tax', Math.round(ft('singapore', 120000).total), 7950, 1);
eq('AU A$120k tax+medicare', Math.round(ft('australia', 120000).total), 28920, 1);
eq('US $150k single federal (2026 brackets)', Math.round(ft('usa', 150000).parts['Federal income tax']), 24734, 2);
const de60 = ft('germany', 60000).net;
eq('DE €60k net in 36.5k-38k', de60 > 36500 && de60 < 38000 ? 1 : 0, 1);
eq('UAE zero tax', ft('uae', 300000).total, 0);
eq('Tax override %', ft('usa', 100000, { overridePct: 30 }).total, 30000);
const lc = livingCosts(C('uk').cities[0].costs, { spouse: false, kids: 0, paidSchool: false, lifestyle: 'moderate' });
eq('London single moderate costs', Math.round(lc.total), 2000 + 450 + 190 + 300 + 86 + 300);
const eqv = equivalentIndianCtc(100000, 60000);
eq('Equivalent Indian CTC positive', eqv > 1500000 ? 1 : 0, 1);

// Words
eq('Words 1,25,00,050 INR', numberToWords('12500050', 'indian', 'inr'), 'Rupees One Crore Twenty-Five Lakh Fifty Only');
eq('Words paise', numberToWords('101.5', 'indian', 'inr'), 'Rupees One Hundred One and Fifty Paise Only');
eq('Words international', numberToWords('1250000', 'international', 'none'), 'One Million Two Hundred Fifty Thousand');
eq('Grouping', indianGrouping('1234567.89'), '12,34,567.89');
eq('Short', rupeesShort(12500000), '₹1.25 Cr');

console.log(fails ? `\n${fails} FAILED` : '\nAll unit tests passed');
process.exit(fails ? 1 : 0);
