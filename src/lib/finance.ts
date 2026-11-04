/** Finance formulas. Pure functions: no DOM, unit tested in tests/unit.mjs. */

export interface YearRow { year: number; a: number; b: number; balance: number; extra?: number }

// ---------------- EMI ----------------
export function emi(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0) return 0;
  const r = annualRatePct / 12 / 100;
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

/** Year-wise schedule: a = principal paid, b = interest paid, balance = outstanding. */
export function amortization(principal: number, annualRatePct: number, months: number) {
  const r = annualRatePct / 12 / 100;
  const pay = emi(principal, annualRatePct, months);
  let bal = principal;
  const years: YearRow[] = [];
  const monthsRows: { month: number; principal: number; interest: number; balance: number }[] = [];
  let yp = 0, yi = 0;
  for (let m = 1; m <= months; m++) {
    const interest = bal * r;
    let princ = pay - interest;
    if (m === months) princ = bal;
    bal = Math.max(0, bal - princ);
    yp += princ; yi += interest;
    monthsRows.push({ month: m, principal: princ, interest, balance: bal });
    if (m % 12 === 0 || m === months) {
      years.push({ year: Math.ceil(m / 12), a: yp, b: yi, balance: bal });
      yp = 0; yi = 0;
    }
  }
  return { emi: pay, totalInterest: pay * months - principal, totalPaid: pay * months, years, months: monthsRows };
}

// ---------------- SIP ----------------
/**
 * Monthly SIP with optional annual step-up and an initial lump sum.
 * Uses the same convention as most Indian calculators: monthly rate = annual/12, payment at the start of each month.
 * a = invested so far, b = gains so far.
 */
export function sip(monthly: number, annualRatePct: number, years: number, stepUpPct = 0, lumpSum = 0) {
  const i = annualRatePct / 12 / 100;
  let bal = 0, invested = lumpSum, amount = monthly;
  const rows: YearRow[] = [];
  const months = Math.round(years * 12);
  for (let m = 1; m <= months; m++) {
    if (m > 1 && (m - 1) % 12 === 0) amount *= 1 + stepUpPct / 100;
    bal = (bal + amount) * (1 + i);
    invested += amount;
    if (m % 12 === 0 || m === months) {
      const lumpVal = lumpSum * Math.pow(1 + annualRatePct / 100, m / 12);
      const total = bal + lumpVal;
      rows.push({ year: Math.ceil(m / 12), a: invested, b: total - invested, balance: total, extra: amount });
    }
  }
  const last = rows[rows.length - 1] ?? { a: lumpSum, b: 0, balance: lumpSum };
  return { invested: last.a, gains: last.b, value: last.balance, rows };
}

// ---------------- FD ----------------
export function fd(principal: number, annualRatePct: number, months: number, compoundsPerYear: number) {
  const t = months / 12;
  if (compoundsPerYear === 0) {
    const interest = (principal * annualRatePct * t) / 100;
    return { maturity: principal + interest, interest };
  }
  const maturity = principal * Math.pow(1 + annualRatePct / 100 / compoundsPerYear, compoundsPerYear * t);
  return { maturity, interest: maturity - principal };
}

// ---------------- PPF ----------------
/** Deposits at the start of each financial year (before 5 April), interest compounded yearly. */
export function ppf(yearly: number, annualRatePct: number, years: number, contributeYears = years) {
  let bal = 0, invested = 0;
  const rows: YearRow[] = [];
  for (let y = 1; y <= years; y++) {
    const dep = y <= contributeYears ? yearly : 0;
    invested += dep;
    const interest = (bal + dep) * (annualRatePct / 100);
    bal = bal + dep + interest;
    rows.push({ year: y, a: invested, b: bal - invested, balance: bal, extra: interest });
  }
  return { invested, interest: bal - invested, maturity: bal, rows };
}

// ---------------- GST ----------------
export function gst(amount: number, ratePct: number, mode: 'add' | 'remove') {
  if (mode === 'add') {
    const tax = (amount * ratePct) / 100;
    return { base: amount, tax, total: amount + tax };
  }
  const base = amount / (1 + ratePct / 100);
  return { base, tax: amount - base, total: amount };
}

// ---------------- Income tax (India, FY 2026-27 / AY 2027-28) ----------------
export type Slab = [upTo: number, ratePct: number];
export const NEW_SLABS: Slab[] = [[400000, 0], [800000, 5], [1200000, 10], [1600000, 15], [2000000, 20], [2400000, 25], [Infinity, 30]];
export const OLD_SLABS = (age: 'below60' | '60to80' | 'above80'): Slab[] => {
  const ex = age === 'above80' ? 500000 : age === '60to80' ? 300000 : 250000;
  return [[ex, 0], ...(ex < 500000 ? ([[500000, 5]] as Slab[]) : []), [1000000, 20], [Infinity, 30]];
};

export function slabTax(income: number, slabs: Slab[]) {
  let prev = 0, tax = 0;
  const parts: { from: number; to: number; rate: number; tax: number }[] = [];
  for (const [upTo, rate] of slabs) {
    if (income <= prev) break;
    const amt = Math.min(income, upTo) - prev;
    const t = (amt * rate) / 100;
    parts.push({ from: prev, to: Math.min(income, upTo), rate, tax: t });
    tax += t;
    prev = upTo;
  }
  return { tax, parts };
}

function surchargeRate(income: number, regime: 'new' | 'old') {
  if (income > 50000000 && regime === 'old') return 37;
  if (income > 20000000) return 25;
  if (income > 10000000) return 15;
  if (income > 5000000) return 10;
  return 0;
}

/** Surcharge with marginal relief: extra tax over a threshold can't exceed the extra income. */
function surcharge(income: number, baseTax: number, slabs: Slab[], regime: 'new' | 'old') {
  const rate = surchargeRate(income, regime);
  if (!rate) return 0;
  const thresholds = regime === 'old' ? [5000000, 10000000, 20000000, 50000000] : [5000000, 10000000, 20000000];
  const th = Math.max(...thresholds.filter((t) => income > t));
  const thTax = slabTax(th, slabs).tax;
  const thTotal = thTax * (1 + surchargeRate(th, regime) / 100);
  const s = (baseTax * rate) / 100;
  const relief = Math.max(0, baseTax + s - (thTotal + (income - th)));
  return s - relief;
}

export interface TaxInput {
  salary: number;
  otherIncome: number;
  age: 'below60' | '60to80' | 'above80';
  // old-regime deductions
  d80c: number; d80d: number; dNps: number; dHomeLoan: number; dHra: number; dOther: number; profTax: number;
  // allowed in both regimes
  employerNps: number;
}

export interface TaxResult {
  regime: 'new' | 'old';
  gross: number;
  standardDeduction: number;
  deductions: number;
  taxable: number;
  slabTax: number;
  rebate: number;
  surcharge: number;
  cess: number;
  total: number;
  parts: { from: number; to: number; rate: number; tax: number }[];
}

export function incomeTax(inp: TaxInput, regime: 'new' | 'old'): TaxResult {
  const gross = Math.max(0, inp.salary) + Math.max(0, inp.otherIncome);
  const std = inp.salary > 0 ? Math.min(inp.salary, regime === 'new' ? 75000 : 50000) : 0;
  let ded = Math.max(0, inp.employerNps);
  if (regime === 'old') {
    ded += Math.min(150000, inp.d80c) + Math.min(100000, inp.d80d) + Math.min(50000, inp.dNps) + Math.min(200000, inp.dHomeLoan)
      + Math.max(0, inp.dHra) + Math.max(0, inp.dOther) + Math.min(2500, inp.profTax);
  }
  const taxable = Math.max(0, Math.round((gross - std - ded) / 10) * 10); // income rounded to nearest ₹10 (sec 288A)
  const slabs = regime === 'new' ? NEW_SLABS : OLD_SLABS(inp.age);
  const { tax, parts } = slabTax(taxable, slabs);
  let rebate = 0;
  if (regime === 'new') {
    if (taxable <= 1200000) rebate = Math.min(tax, 60000);
    else if (tax > taxable - 1200000) rebate = tax - (taxable - 1200000); // marginal relief just above ₹12 lakh
  } else if (taxable <= 500000) rebate = Math.min(tax, 12500);
  const afterRebate = Math.max(0, tax - rebate);
  const sc = surcharge(taxable, afterRebate, slabs, regime);
  const cess = (afterRebate + sc) * 0.04;
  const total = Math.round((afterRebate + sc + cess) / 10) * 10; // tax rounded to nearest ₹10 (sec 288B)
  return { regime, gross, standardDeduction: std, deductions: ded, taxable, slabTax: tax, rebate, surcharge: sc, cess, total, parts };
}

/** Extra old-regime deductions needed (beyond what was entered) for the old regime to cost the same as the new one. */
export function breakEvenDeductions(inp: TaxInput): number | null {
  const target = incomeTax(inp, 'new').total;
  const base = incomeTax(inp, 'old');
  if (base.total <= target) return 0;
  let lo = 0, hi = inp.salary + inp.otherIncome;
  const at = (extra: number) => incomeTax({ ...inp, dOther: inp.dOther + extra }, 'old').total;
  if (at(hi) > target) return null;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (at(mid) > target) lo = mid; else hi = mid; }
  return Math.ceil(hi / 100) * 100;
}

/** HRA exemption = least of: HRA received, rent − 10% of basic, 50% (metro) / 40% of basic. */
export function hraExemption(basic: number, hra: number, rent: number, metro: boolean) {
  return Math.max(0, Math.min(hra, rent - 0.1 * basic, (metro ? 0.5 : 0.4) * basic));
}

// ---------------- Attendance ----------------
export function attendance(attended: number, total: number, targetPct: number) {
  const pct = total ? (attended / total) * 100 : 0;
  const t = targetPct / 100;
  // classes needed: (attended + x) / (total + x) >= t  =>  x >= (t*total - attended) / (1 - t)
  const need = pct >= targetPct ? 0 : t >= 1 ? Infinity : Math.ceil((t * total - attended) / (1 - t) - 1e-9);
  // can skip: attended / (total + y) >= t  =>  y <= attended / t - total
  const skip = pct < targetPct || t === 0 ? 0 : Math.floor(attended / t - total + 1e-9);
  return { pct, need: Math.max(0, need), skip: Math.max(0, skip) };
}

// ---------------- Salary: CTC -> in-hand ----------------
export interface SalaryInput {
  ctc: number;
  variable: number;
  basicPct: number;
  hraPct: number;
  pfMode: 'capped' | 'full' | 'none';
  gratuityInCtc: boolean;
  profTax: number;
  regime: 'new' | 'old';
  rentPaid: number;
  metro: boolean;
  otherDeductions80c: number;
  d80d: number;
}

export function salaryBreakup(s: SalaryInput) {
  const fixed = Math.max(0, s.ctc - s.variable);
  const basic = (fixed * s.basicPct) / 100;
  const pfBase = s.pfMode === 'capped' ? Math.min(basic, 15000 * 12) : basic;
  const employerPf = s.pfMode === 'none' ? 0 : pfBase * 0.12;
  const employeePf = employerPf;
  const gratuity = s.gratuityInCtc ? basic * 0.0481 : 0;
  const gross = Math.max(0, fixed - employerPf - gratuity);
  const hra = Math.min((basic * s.hraPct) / 100, Math.max(0, gross - basic));
  const special = Math.max(0, gross - basic - hra);
  const taxable = gross + s.variable;
  const hraEx = s.regime === 'old' && s.rentPaid > 0 ? hraExemption(basic, hra, s.rentPaid, s.metro) : 0;
  const tax = incomeTax({
    salary: taxable, otherIncome: 0, age: 'below60',
    d80c: s.regime === 'old' ? employeePf + s.otherDeductions80c : 0, d80d: s.d80d, dNps: 0, dHomeLoan: 0, dHra: hraEx, dOther: 0,
    profTax: s.profTax, employerNps: 0,
  }, s.regime);
  const fixedShare = taxable ? gross / taxable : 1;
  const taxOnFixed = tax.total * fixedShare;
  const inHandAnnual = gross - employeePf - s.profTax - taxOnFixed;
  return {
    basic, hra, special, gross, employerPf, employeePf, gratuity, hraExemption: hraEx,
    tax: tax.total, taxOnFixed, variableAfterTax: s.variable - (tax.total - taxOnFixed),
    inHandAnnual, inHandMonthly: inHandAnnual / 12,
  };
}

// ---------------- Loan prepayment ----------------
export interface PrepayInput {
  principal: number; ratePct: number; months: number;
  lump: number; lumpMonth: number; monthlyExtra: number; yearlyExtra: number;
  mode: 'tenure' | 'emi';
}

export function prepayment(p: PrepayInput) {
  const r = p.ratePct / 12 / 100;
  const baseEmi = emi(p.principal, p.ratePct, p.months);
  const baseInterest = baseEmi * p.months - p.principal;
  let bal = p.principal, pay = baseEmi, interest = 0, m = 0, prepaid = 0;
  const years: YearRow[] = [];
  let yi = 0, yp = 0;
  while (bal > 0.5 && m < p.months * 2) {
    m++;
    const int = bal * r;
    let princ = Math.min(bal, pay - int);
    let extra = 0;
    if (p.monthlyExtra > 0) extra += p.monthlyExtra;
    if (p.yearlyExtra > 0 && m % 12 === 0) extra += p.yearlyExtra;
    if (p.lump > 0 && m === p.lumpMonth) extra += p.lump;
    extra = Math.min(extra, Math.max(0, bal - princ));
    bal -= princ + extra;
    interest += int; prepaid += extra;
    yi += int; yp += princ + extra;
    if (extra > 0 && p.mode === 'emi' && bal > 0) {
      const left = p.months - m;
      if (left > 0) pay = emi(bal, p.ratePct, left);
    }
    if (m % 12 === 0 || bal <= 0.5) { years.push({ year: Math.ceil(m / 12), a: yp, b: yi, balance: Math.max(0, bal) }); yi = 0; yp = 0; }
  }
  return { baseEmi, baseInterest, interest, saved: baseInterest - interest, months: m, monthsSaved: p.months - m, finalEmi: pay, prepaid, years };
}

// ---------------- Lump sum / CAGR ----------------
export function lumpsum(principal: number, annualRatePct: number, years: number) {
  const rows: YearRow[] = [];
  for (let y = 1; y <= Math.ceil(years); y++) {
    const v = principal * Math.pow(1 + annualRatePct / 100, Math.min(y, years));
    rows.push({ year: y, a: principal, b: v - principal, balance: v });
  }
  const value = principal * Math.pow(1 + annualRatePct / 100, years);
  return { value, gains: value - principal, rows };
}

export function cagr(start: number, end: number, years: number) {
  if (start <= 0 || years <= 0) return NaN;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

// ---------------- SWP ----------------
/** Monthly withdrawals from a corpus that keeps growing. Withdrawal at the end of each month. */
export function swp(corpus: number, monthly: number, annualRatePct: number, years: number, stepUpPct = 0) {
  const i = annualRatePct / 12 / 100;
  let bal = corpus, withdrawn = 0, w = monthly, depletedAt = 0;
  const rows: YearRow[] = [];
  let yw = 0;
  for (let m = 1; m <= Math.round(years * 12); m++) {
    if (m > 1 && (m - 1) % 12 === 0) w *= 1 + stepUpPct / 100;
    bal = bal * (1 + i);
    const take = Math.min(w, bal);
    bal -= take; withdrawn += take; yw += take;
    if (bal <= 0 && !depletedAt) depletedAt = m;
    if (m % 12 === 0) { rows.push({ year: m / 12, a: yw, b: 0, balance: bal }); yw = 0; }
    if (bal <= 0) break;
  }
  return { finalBalance: Math.max(0, bal), withdrawn, depletedAt, rows };
}

// ---------------- RD (recurring deposit, quarterly compounding like Indian banks) ----------------
export function rd(monthly: number, annualRatePct: number, months: number) {
  const q = annualRatePct / 400;
  let maturity = 0;
  for (let k = 1; k <= months; k++) maturity += monthly * Math.pow(1 + q, (4 * (months - k + 1)) / 12);
  return { maturity, invested: monthly * months, interest: maturity - monthly * months };
}

// ---------------- Gratuity ----------------
/**
 * Payment of Gratuity Act / Code on Social Security, 2020: 15 days' wages per completed year,
 * using 26 working days a month (15/26). Service of more than 6 months in the last year counts as a full year.
 * Employers not covered by the Act often use 15/30.
 */
export function gratuity(monthlyWages: number, years: number, months: number, covered = true) {
  const y = years + (months > 6 ? 1 : 0);
  const amount = (monthlyWages * 15 * y) / (covered ? 26 : 30);
  return { amount, countedYears: y, taxFree: Math.min(amount, 2000000), taxable: Math.max(0, amount - 2000000) };
}
