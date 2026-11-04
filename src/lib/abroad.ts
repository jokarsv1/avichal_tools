/**
 * "Moving abroad" engine: foreign salary -> tax & social security -> living costs -> savings,
 * shown in INR at live exchange rates, plus PPP (purchasing power) comparisons with India.
 *
 * Accuracy notes (keep these honest in the UI):
 *  - Tax models are simplified estimates for a single earner, standard deductions only, no pre-tax
 *    retirement contributions. They are good for comparing offers, not for filing.
 *  - Living costs are typical 2025-26 monthly figures in local currency for one adult with a
 *    "moderate" lifestyle; users can override every number.
 *  - PPP: World Bank, "PPP conversion factor, GDP (LCU per international $)", 2024 (updated Oct 2026).
 */
import { salaryBreakup, slabTax, type Slab } from './finance.ts';

export type Lifestyle = 'frugal' | 'moderate' | 'comfortable';
export interface Costs { rent: number; food: number; transport: number; utilities: number; health: number; misc: number; childcare: number }
export interface City { id: string; name: string; costs: Costs; state?: number; province?: 'ON' | 'BC' }
export interface Country {
  id: string; name: string; flag: string; currency: string; ppp: number; tax: TaxModel;
  /** Return flight to India per person, in INR (economy, typical). */
  flightInr: number;
  /** Monthly government fee per dependent (e.g. Saudi expat dependent levy), local currency. */
  dependentFee?: number;
  /** Paid schooling is usually needed for expat children (Gulf). */
  paidSchoolDefault: boolean;
  cities: City[];
  notes: string[];
}
export type TaxModel = 'us' | 'uk' | 'de' | 'nl' | 'ie' | 'ca' | 'au' | 'sg' | 'nz' | 'zero';

/** World Bank PPP conversion factors 2024 (LCU per international $). */
export const PPP_INDIA = 20.4522;
/** Gulf currencies are pegged to USD (ECB does not publish them). */
export const USD_PEGS: Record<string, number> = { AED: 3.6725, SAR: 3.75, QAR: 3.64, OMR: 0.3845, BHD: 0.376 };
/** Fallback INR per 1 unit (ECB via Frankfurter, 3 Nov 2026; Gulf via USD peg). Used offline or if the API fails. */
const FALLBACK_PER_USD: Record<string, number> = {
  AUD: 1.4319, BRL: 5.4934, CAD: 1.3975, CHF: 0.81993, CNY: 6.6723, CZK: 21.776, DKK: 6.6853, EUR: 0.89453, GBP: 0.74567,
  HKD: 7.846, HUF: 325.97, IDR: 18137, ILS: 3.157, INR: 94.75, ISK: 121.84, JPY: 158.29, KRW: 1344.59, MXN: 18.5974,
  MYR: 4.077, NOK: 9.2303, NZD: 1.778, PHP: 63.461, PLN: 3.9529, RON: 4.7793, SEK: 9.7965, SGD: 1.2812, THB: 33.755,
  TRY: 49.997, ZAR: 16.6379, USD: 1,
};
export const FALLBACK_INR: Record<string, number> = Object.fromEntries([
  ...Object.entries(FALLBACK_PER_USD).map(([k, v]) => [k, FALLBACK_PER_USD.INR / v]),
  ...Object.entries(USD_PEGS).map(([k, v]) => [k, FALLBACK_PER_USD.INR / v]),
]);
export const FALLBACK_DATE = '2026-11-03';

const c = (rent: number, food: number, transport: number, utilities: number, health: number, misc: number, childcare: number): Costs => ({ rent, food, transport, utilities, health, misc, childcare });

export const COUNTRIES: Country[] = [
  { id: 'usa', name: 'United States', flag: '🇺🇸', currency: 'USD', ppp: 1, tax: 'us', flightInr: 95000, paidSchoolDefault: false,
    cities: [
      { id: 'new-york', name: 'New York City', state: 0.095, costs: c(3800, 750, 132, 250, 300, 500, 2000) },
      { id: 'bay-area', name: 'San Francisco Bay Area', state: 0.075, costs: c(3000, 750, 300, 250, 300, 500, 2200) },
      { id: 'seattle', name: 'Seattle', state: 0, costs: c(2300, 700, 200, 220, 300, 450, 1900) },
      { id: 'austin', name: 'Austin', state: 0, costs: c(1600, 600, 400, 230, 300, 400, 1300) },
      { id: 'dallas', name: 'Dallas', state: 0, costs: c(1550, 600, 450, 250, 300, 400, 1200) },
      { id: 'chicago', name: 'Chicago', state: 0.0495, costs: c(2000, 650, 105, 220, 300, 400, 1700) },
    ],
    notes: ['Federal tax uses 2026 brackets and standard deduction; Social Security (6.2%) and Medicare (1.45%+) apply to H-1B workers.', 'State and city income tax is approximated as a flat rate (0% in Texas and Washington).', 'Health cost is your share of employer insurance premiums plus typical out-of-pocket costs.'] },
  { id: 'uk', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', ppp: 0.6642, tax: 'uk', flightInr: 65000, paidSchoolDefault: false,
    cities: [
      { id: 'london', name: 'London', costs: c(2000, 450, 190, 300, 86, 300, 1500) },
      { id: 'manchester', name: 'Manchester', costs: c(1100, 400, 90, 250, 86, 250, 1100) },
      { id: 'birmingham', name: 'Birmingham', costs: c(950, 380, 80, 240, 86, 230, 1000) },
    ],
    notes: ['Income tax and National Insurance for England, Wales and Northern Ireland (Scotland has different bands).', 'Health = the Immigration Health Surcharge (about £1,035 a year per adult) spread monthly; NHS care is then free.', 'Utilities include council tax.'] },
  { id: 'germany', name: 'Germany', flag: '🇩🇪', currency: 'EUR', ppp: 0.7009, tax: 'de', flightInr: 60000, paidSchoolDefault: false,
    cities: [
      { id: 'berlin', name: 'Berlin', costs: c(1250, 400, 63, 120, 0, 250, 100) },
      { id: 'munich', name: 'Munich', costs: c(1550, 450, 63, 130, 0, 280, 400) },
      { id: 'frankfurt', name: 'Frankfurt', costs: c(1350, 420, 63, 130, 0, 260, 350) },
    ],
    notes: ['Tax class I (single) or III (married, one earner) estimate, including pension, unemployment, health and care insurance.', 'Rent is "warm" rent (including heating). Public health insurance is deducted from salary.', 'Childcare (Kita) is free or cheap in many states, especially Berlin.'] },
  { id: 'netherlands', name: 'Netherlands', flag: '🇳🇱', currency: 'EUR', ppp: 0.7314, tax: 'nl', flightInr: 60000, paidSchoolDefault: false,
    cities: [
      { id: 'amsterdam', name: 'Amsterdam', costs: c(2000, 450, 100, 250, 155, 300, 1000) },
      { id: 'eindhoven', name: 'Eindhoven', costs: c(1450, 400, 80, 230, 155, 250, 900) },
    ],
    notes: ['Includes the 30% ruling for skilled migrants (toggle). The ruling is 30% until 2026 and 27% from 2027.', 'Health = mandatory basic health insurance premium (about €155 a month per adult).'] },
  { id: 'ireland', name: 'Ireland', flag: '🇮🇪', currency: 'EUR', ppp: 0.7409, tax: 'ie', flightInr: 65000, paidSchoolDefault: false,
    cities: [{ id: 'dublin', name: 'Dublin', costs: c(2200, 450, 100, 220, 100, 300, 1100) }],
    notes: ['Income tax (20%/40%), USC and PRSI with standard personal and employee credits.'] },
  { id: 'canada', name: 'Canada', flag: '🇨🇦', currency: 'CAD', ppp: 1.1505, tax: 'ca', flightInr: 105000, paidSchoolDefault: false,
    cities: [
      { id: 'toronto', name: 'Toronto', province: 'ON', costs: c(2500, 600, 156, 250, 30, 400, 1000) },
      { id: 'vancouver', name: 'Vancouver', province: 'BC', costs: c(2700, 620, 135, 220, 30, 400, 900) },
    ],
    notes: ['Federal + provincial tax (Ontario or BC), CPP and EI.', 'Provincial health care is free once you have coverage; health = dental/vision extras.'] },
  { id: 'australia', name: 'Australia', flag: '🇦🇺', currency: 'AUD', ppp: 1.3665, tax: 'au', flightInr: 75000, paidSchoolDefault: false,
    cities: [
      { id: 'sydney', name: 'Sydney', costs: c(3000, 700, 200, 250, 120, 450, 1800) },
      { id: 'melbourne', name: 'Melbourne', costs: c(2300, 650, 180, 230, 120, 400, 1700) },
    ],
    notes: ['Resident tax rates for 2026-27 plus the 2% Medicare levy.', 'Health = overseas visitor/worker health cover required for many visas.', 'Temporary visa holders often cannot claim the childcare subsidy.'] },
  { id: 'singapore', name: 'Singapore', flag: '🇸🇬', currency: 'SGD', ppp: 0.8279, tax: 'sg', flightInr: 28000, paidSchoolDefault: true,
    cities: [{ id: 'singapore', name: 'Singapore', costs: c(3800, 800, 130, 200, 100, 400, 1500) }],
    notes: ['Resident tax rates (after 183 days). Foreigners do not pay CPF.', 'Rent assumes a 1-bedroom condo; an HDB room is much cheaper.', 'Expat children usually need private or international schools.'] },
  { id: 'uae', name: 'UAE', flag: '🇦🇪', currency: 'AED', ppp: 2.327, tax: 'zero', flightInr: 25000, paidSchoolDefault: true,
    cities: [
      { id: 'dubai', name: 'Dubai', costs: c(7000, 1800, 600, 700, 0, 1200, 3500) },
      { id: 'abu-dhabi', name: 'Abu Dhabi', costs: c(6000, 1700, 600, 650, 0, 1100, 3200) },
    ],
    notes: ['No personal income tax.', 'Employer health insurance usually covers you; dependants may cost extra (added per dependant).', 'School fees are the biggest cost for families.'] },
  { id: 'saudi-arabia', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', ppp: 1.852, tax: 'zero', flightInr: 30000, dependentFee: 400, paidSchoolDefault: true,
    cities: [{ id: 'riyadh', name: 'Riyadh', costs: c(4500, 1500, 800, 500, 0, 1000, 2500) }],
    notes: ['No personal income tax for employees.', 'Expat dependant fee of SAR 400 per dependant per month is included.'] },
  { id: 'qatar', name: 'Qatar', flag: '🇶🇦', currency: 'QAR', ppp: 2.174, tax: 'zero', flightInr: 28000, paidSchoolDefault: true,
    cities: [{ id: 'doha', name: 'Doha', costs: c(7000, 1800, 700, 500, 0, 1100, 3000) }],
    notes: ['No personal income tax.'] },
  { id: 'new-zealand', name: 'New Zealand', flag: '🇳🇿', currency: 'NZD', ppp: 1.4639, tax: 'nz', flightInr: 85000, paidSchoolDefault: false,
    cities: [{ id: 'auckland', name: 'Auckland', costs: c(2400, 700, 200, 300, 50, 400, 1400) }],
    notes: ['Income tax plus the ACC earner levy (about 1.67%).'] },
];

export interface IndiaCity { id: string; name: string; costs: Costs }
/** Typical monthly costs in INR for one adult, moderate lifestyle (2025-26). */
export const INDIA_CITIES: IndiaCity[] = [
  { id: 'bengaluru', name: 'Bengaluru', costs: c(28000, 12000, 5000, 4000, 2000, 8000, 12000) },
  { id: 'mumbai', name: 'Mumbai', costs: c(40000, 13000, 4000, 4500, 2000, 9000, 14000) },
  { id: 'delhi-ncr', name: 'Delhi NCR', costs: c(25000, 12000, 5000, 4500, 2000, 8000, 12000) },
  { id: 'hyderabad', name: 'Hyderabad', costs: c(22000, 11000, 4500, 4000, 2000, 7000, 10000) },
  { id: 'pune', name: 'Pune', costs: c(22000, 11000, 4500, 4000, 2000, 7000, 10000) },
  { id: 'chennai', name: 'Chennai', costs: c(20000, 11000, 4000, 4000, 2000, 7000, 10000) },
];

export const LIFESTYLE: Record<Lifestyle, { label: string; rent: number; other: number; misc: number; hint: string }> = {
  frugal: { label: 'Frugal', rent: 0.75, other: 0.75, misc: 0.5, hint: 'Shared or smaller flat, cook at home, public transport' },
  moderate: { label: 'Moderate', rent: 1, other: 1, misc: 1, hint: '1-bed flat in a decent area, eat out sometimes' },
  comfortable: { label: 'Comfortable', rent: 1.45, other: 1.35, misc: 1.9, hint: 'Bigger home in a prime area, car, frequent dining and travel' },
};

export interface Household { spouse: boolean; kids: number; paidSchool: boolean; lifestyle: Lifestyle }

/** Monthly living costs for a household, local currency. */
export function livingCosts(base: Costs, h: Household, dependentFee = 0) {
  const L = LIFESTYLE[h.lifestyle];
  const adults = 1 + (h.spouse ? 1 : 0);
  const rentMult = h.kids >= 3 ? 1.8 : h.kids >= 1 ? 1.45 : adults > 1 ? 1.15 : 1;
  const people = adults + h.kids * 0.55;
  const rows = {
    Rent: base.rent * rentMult * L.rent,
    'Groceries & eating out': base.food * (1 + (adults - 1) * 0.75 + h.kids * 0.45) * L.other,
    Transport: base.transport * (1 + (adults - 1) * 0.6) * L.other,
    'Utilities, internet & phone': base.utilities * (1 + (people - 1) * 0.25) * L.other,
    'Health insurance & medical': base.health * people,
    'Shopping, fun & subscriptions': base.misc * (1 + (adults - 1) * 0.5 + h.kids * 0.3) * L.misc,
    'Childcare / school': h.paidSchool ? base.childcare * h.kids : 0,
    'Dependant fees': dependentFee * ((adults - 1) + h.kids),
  };
  const total = Object.values(rows).reduce((s, v) => s + v, 0);
  return { rows, total };
}

// ---------------- Tax models ----------------
function us(gross: number, married: boolean, kids: number, state: number) {
  const S: Slab[] = married
    ? [[24800, 10], [100800, 12], [211400, 22], [403550, 24], [512450, 32], [768700, 35], [Infinity, 37]]
    : [[12400, 10], [50400, 12], [105700, 22], [201775, 24], [256225, 32], [640600, 35], [Infinity, 37]];
  const std = married ? 32200 : 16100;
  const federal = Math.max(0, slabTax(Math.max(0, gross - std), S).tax - 2200 * kids);
  const ss = Math.min(gross, 184500) * 0.062;
  const medicare = gross * 0.0145 + Math.max(0, gross - (married ? 250000 : 200000)) * 0.009;
  const stateTax = Math.max(0, gross - std) * state;
  return { 'Federal income tax': federal, 'Social Security': ss, Medicare: medicare, 'State/city income tax': stateTax };
}
function uk(gross: number) {
  const pa = Math.max(0, 12570 - Math.max(0, gross - 100000) / 2);
  const taxable = Math.max(0, gross - pa);
  const tax = slabTax(taxable, [[37700, 20], [125140, 40], [Infinity, 45]]).tax;
  const ni = Math.max(0, Math.min(gross, 50270) - 12570) * 0.08 + Math.max(0, gross - 50270) * 0.02;
  return { 'Income tax': tax, 'National Insurance': ni };
}
function deIncomeTax(x: number) {
  // §32a EStG 2025 tariff
  x = Math.floor(x);
  if (x <= 12096) return 0;
  if (x <= 17443) { const y = (x - 12096) / 10000; return (932.3 * y + 1400) * y; }
  if (x <= 68480) { const z = (x - 17443) / 10000; return (176.64 * z + 2397) * z + 1015.13; }
  if (x <= 277825) return 0.42 * x - 10911.92;
  return 0.45 * x - 19246.67;
}
function de(gross: number, married: boolean) {
  const pensionCap = 101400, healthCap = 69750;
  const pension = Math.min(gross, pensionCap) * 0.093, unemp = Math.min(gross, pensionCap) * 0.013;
  const health = Math.min(gross, healthCap) * 0.0875, care = Math.min(gross, healthCap) * (married ? 0.018 : 0.024);
  const taxable = Math.max(0, gross - 1230 - pension - (health + care) * 0.96 - 36);
  const tax = married ? 2 * deIncomeTax(taxable / 2) : deIncomeTax(taxable);
  const soliFree = married ? 39900 : 19950;
  const soli = tax > soliFree ? Math.min(tax * 0.055, (tax - soliFree) * 0.119) : 0;
  return { 'Income tax': tax, 'Solidarity surcharge': soli, 'Pension insurance': pension, 'Health & care insurance': health + care, 'Unemployment insurance': unemp };
}
function nl(gross: number, ruling: boolean) {
  const taxable = gross * (ruling ? 0.7 : 1);
  let tax = slabTax(taxable, [[38883, 35.75], [78426, 37.56], [Infinity, 49.5]]).tax;
  const general = Math.max(0, 3115 - Math.max(0, taxable - 29736) * 0.064);
  const labour = taxable < 45592 ? Math.min(5685, taxable * 0.125) : Math.max(0, 5685 - (taxable - 45592) * 0.065);
  tax = Math.max(0, tax - general - labour);
  return { 'Income tax & national insurance': tax };
}
function ie(gross: number, married: boolean) {
  const band = married ? 53000 : 44000;
  const tax = Math.max(0, slabTax(gross, [[band, 20], [Infinity, 40]]).tax - (married ? 6000 : 4000));
  const usc = gross <= 13000 ? 0 : slabTax(gross, [[12012, 0.5], [28700, 2], [70044, 3], [Infinity, 8]]).tax;
  const prsi = gross * 0.042;
  return { 'Income tax': tax, USC: usc, PRSI: prsi };
}
function ca(gross: number, prov: 'ON' | 'BC') {
  const fed = Math.max(0, slabTax(gross, [[57375, 14], [114750, 20.5], [177882, 26], [253414, 29], [Infinity, 33]]).tax - 16129 * 0.14);
  let provTax: number;
  if (prov === 'ON') {
    const base = Math.max(0, slabTax(gross, [[52886, 5.05], [105775, 9.15], [150000, 11.16], [220000, 12.16], [Infinity, 13.16]]).tax - 12747 * 0.0505);
    const surtax = Math.max(0, base - 5710) * 0.2 + Math.max(0, base - 7307) * 0.36;
    const ohp = gross > 200600 ? 900 : gross > 72000 ? Math.min(900, 750 + (gross - 72000) * 0.25) : gross > 48000 ? Math.min(750, 600 + (gross - 48000) * 0.25) : gross > 36000 ? Math.min(600, 450 + (gross - 36000) * 0.06) : 0;
    provTax = base + surtax + ohp;
  } else {
    provTax = Math.max(0, slabTax(gross, [[49279, 5.06], [98560, 7.7], [113158, 10.5], [137407, 12.29], [186306, 14.7], [259829, 16.8], [Infinity, 20.5]]).tax - 12932 * 0.0506);
  }
  const cpp = Math.max(0, Math.min(gross, 71300) - 3500) * 0.0595 + Math.max(0, Math.min(gross, 81200) - 71300) * 0.04;
  const ei = Math.min(gross, 65700) * 0.0164;
  return { 'Federal income tax': fed, 'Provincial income tax': provTax, CPP: cpp, EI: ei };
}
function au(gross: number) {
  return { 'Income tax': slabTax(gross, [[18200, 0], [45000, 15], [135000, 30], [190000, 37], [Infinity, 45]]).tax, 'Medicare levy': gross * 0.02 };
}
function sg(gross: number) {
  return { 'Income tax': slabTax(gross, [[20000, 0], [30000, 2], [40000, 3.5], [80000, 7], [120000, 11.5], [160000, 15], [200000, 18], [240000, 19], [280000, 19.5], [320000, 20], [500000, 22], [1000000, 23], [Infinity, 24]]).tax };
}
function nz(gross: number) {
  return { 'Income tax': slabTax(gross, [[15600, 10.5], [53500, 17.5], [78100, 30], [180000, 33], [Infinity, 39]]).tax, 'ACC levy': Math.min(gross, 152790) * 0.0167 };
}

export function foreignTax(country: Country, city: City, gross: number, opts: { married: boolean; kids: number; ruling: boolean; overridePct?: number | null }) {
  let parts: Record<string, number>;
  if (opts.overridePct != null && Number.isFinite(opts.overridePct)) parts = { 'Tax & social security (your %)': (gross * opts.overridePct) / 100 };
  else switch (country.tax) {
    case 'us': parts = us(gross, opts.married, opts.kids, city.state ?? 0); break;
    case 'uk': parts = uk(gross); break;
    case 'de': parts = de(gross, opts.married); break;
    case 'nl': parts = nl(gross, opts.ruling); break;
    case 'ie': parts = ie(gross, opts.married); break;
    case 'ca': parts = ca(gross, city.province ?? 'ON'); break;
    case 'au': parts = au(gross); break;
    case 'sg': parts = sg(gross); break;
    case 'nz': parts = nz(gross); break;
    default: parts = { 'Income tax': 0 };
  }
  const total = Object.values(parts).reduce((s, v) => s + v, 0);
  return { parts, total, net: gross - total, effective: gross ? total / gross : 0 };
}

/** Indian CTC (new regime) whose savings, after the same lifestyle in an Indian city, equal `targetMonthlySavingsInr`. */
export function equivalentIndianCtc(targetMonthlySavingsInr: number, indiaCostsMonthly: number) {
  const savingsAt = (ctc: number) => salaryBreakup({ ctc, variable: 0, basicPct: 50, hraPct: 50, pfMode: 'capped', gratuityInCtc: true, profTax: 2400, regime: 'new', rentPaid: 0, metro: true, otherDeductions80c: 0, d80d: 0 }).inHandMonthly - indiaCostsMonthly;
  let lo = 0, hi = 5e8;
  if (savingsAt(hi) < targetMonthlySavingsInr) return null;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (savingsAt(mid) < targetMonthlySavingsInr) lo = mid; else hi = mid; }
  return hi;
}

// ---------------- Exchange rates ----------------
export interface Rates { inrPer: Record<string, number>; date: string; live: boolean }

/** INR per 1 unit of each currency. Live from the ECB (via Frankfurter), cached for 12 h, with offline fallback. */
export async function getRates(): Promise<Rates> {
  try {
    const cached = JSON.parse(localStorage.getItem('fx-inr') || 'null');
    if (cached && Date.now() - cached.t < 12 * 3600 * 1000) return { ...cached.r, live: true };
  } catch { /* ignore */ }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch('https://api.frankfurter.dev/v1/latest?base=INR', { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error('rates');
    const j = await res.json();
    const inrPer: Record<string, number> = {};
    for (const [cur, perInr] of Object.entries<number>(j.rates)) inrPer[cur] = 1 / perInr;
    inrPer.INR = 1;
    for (const [cur, perUsd] of Object.entries(USD_PEGS)) inrPer[cur] = inrPer.USD / perUsd;
    const r = { inrPer, date: j.date, live: true };
    try { localStorage.setItem('fx-inr', JSON.stringify({ t: Date.now(), r })); } catch { /* ignore */ }
    return r;
  } catch {
    return { inrPer: { ...FALLBACK_INR }, date: FALLBACK_DATE, live: false };
  }
}

/** Monthly savings (local currency) for a foreign gross salary. */
export function foreignSavings(country: Country, city: City, gross: number, h: Household, tripsPerYear: number, inrPerUnit: number, ruling = true) {
  const tax = foreignTax(country, city, gross, { married: h.spouse, kids: h.kids, ruling });
  const people = 1 + (h.spouse ? 1 : 0) + h.kids;
  const costs = livingCosts(city.costs, h, country.dependentFee ?? 0).total + (tripsPerYear * country.flightInr * people) / 12 / inrPerUnit;
  return { net: tax.net / 12, costs, savings: tax.net / 12 - costs, tax };
}

/** Gross salary abroad needed so that monthly savings (in INR) reach `targetInr`. */
export function grossNeeded(country: Country, city: City, h: Household, tripsPerYear: number, inrPerUnit: number, targetInr: number) {
  let lo = 0, hi = 5_000_000;
  const at = (g: number) => foreignSavings(country, city, g, h, tripsPerYear, inrPerUnit).savings * inrPerUnit;
  if (at(hi) < targetInr) return null;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (at(mid) < targetInr) lo = mid; else hi = mid; }
  return hi;
}

/** Monthly savings in India for a CTC (new regime) and household/lifestyle in an Indian city. */
export function indiaSavings(ctc: number, city: IndiaCity, h: Household) {
  const inHand = salaryBreakup({ ctc, variable: 0, basicPct: 50, hraPct: 50, pfMode: 'capped', gratuityInCtc: true, profTax: 2400, regime: 'new', rentPaid: 0, metro: true, otherDeductions80c: 0, d80d: 0 }).inHandMonthly;
  const costs = livingCosts(city.costs, { ...h, paidSchool: h.kids > 0 }).total;
  return { inHand, costs, savings: inHand - costs };
}
