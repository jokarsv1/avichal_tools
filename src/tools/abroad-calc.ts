import { initCalculator } from '../lib/calc-ui';
import { COUNTRIES, INDIA_CITIES, LIFESTYLE, PPP_INDIA, livingCosts, foreignTax, equivalentIndianCtc, getRates, type Lifestyle, type Rates } from '../lib/abroad';
import { rupees, rupeesShort } from '../lib/format';

const root = document.querySelector<HTMLElement>('[data-abroad]')!;
const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as unknown as T;
const defaults: Record<string, number> = JSON.parse(root.dataset.defaults!);
const countrySel = $<HTMLSelectElement>('ab-country');
const citySel = $<HTMLSelectElement>('ab-city');
let rates: Rates | null = null;

const money = (n: number, cur: string) => {
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n); } catch { return `${cur} ${Math.round(n).toLocaleString('en-IN')}`; }
};
const country = () => COUNTRIES.find((c) => c.id === countrySel.value) ?? COUNTRIES[0];

function fillCities(keep?: string) {
  const c = country();
  citySel.replaceChildren(...c.cities.map((x) => { const o = document.createElement('option'); o.value = x.id; o.textContent = x.name; return o; }));
  if (keep && c.cities.some((x) => x.id === keep)) citySel.value = keep;
  document.querySelectorAll('.ab-cur').forEach((e) => (e.textContent = c.currency));
  document.querySelectorAll('.ab-cur-th').forEach((e) => (e.textContent = c.currency));
  $('ab-ruling-wrap').classList.toggle('hidden', c.tax !== 'nl');
}

function inrPer(cur: string) {
  const o = parseFloat($('ab-fx').value);
  if (o > 0) return o;
  return rates?.inrPer[cur] ?? NaN;
}

function update() {
  const c = country();
  const city = c.cities.find((x) => x.id === citySel.value) ?? c.cities[0];
  const gross = parseFloat($('ab-salary').value) || 0;
  const lifestyle = (document.querySelector<HTMLInputElement>('input[name=ab-life]:checked')?.value || 'moderate') as Lifestyle;
  const spouse = $('ab-spouse').value === '1';
  const kids = +$('ab-kids').value;
  const fx = inrPer(c.currency);
  $('ab-life-hint').textContent = LIFESTYLE[lifestyle].hint;
  const rentOverride = parseFloat($('ab-rent').value);
  const base = { ...city.costs, ...(rentOverride > 0 ? { rent: rentOverride / (kids >= 3 ? 1.8 : kids >= 1 ? 1.45 : spouse ? 1.15 : 1) / LIFESTYLE[lifestyle].rent } : {}) };
  const costs = livingCosts(base, { spouse, kids, paidSchool: $<HTMLInputElement>('ab-school').checked, lifestyle }, c.dependentFee ?? 0);
  const trips = +$('ab-trips').value;
  const tripLocal = Number.isFinite(fx) ? (trips * c.flightInr * (1 + (spouse ? 1 : 0) + kids)) / 12 / fx : 0;
  if (tripLocal) costs.rows['Trips home to India'] = tripLocal;
  const monthlyCost = costs.total + tripLocal;
  const taxPct = parseFloat($('ab-taxpct').value);
  const tax = foreignTax(c, city, gross, { married: spouse, kids, ruling: $<HTMLInputElement>('ab-ruling').checked, overridePct: Number.isFinite(taxPct) ? taxPct : null });
  const netM = tax.net / 12;
  const saveM = netM - monthlyCost;
  const r = (n: number) => (Number.isFinite(fx) ? rupees(n * fx) : '–');

  $('ab-salary-inr').textContent = Number.isFinite(fx) ? `≈ ${rupeesShort(gross * fx)} a year at today's rate` : '';
  $('ab-save-inr').textContent = Number.isFinite(fx) ? rupees(saveM * fx) : money(saveM, c.currency);
  $('ab-save-local').textContent = `${money(saveM, c.currency)} a month · ${money(saveM * 12, c.currency)} a year`;
  $('ab-net').textContent = `${money(netM, c.currency)} (${r(netM)})`;
  $('ab-tax').textContent = `${money(tax.total, c.currency)}/yr · ${(tax.effective * 100).toFixed(1)}%`;
  $('ab-cost').textContent = `${money(monthlyCost, c.currency)} (${r(monthlyCost)})`;
  $('ab-rate').textContent = netM > 0 ? `${Math.round((saveM / netM) * 100)}% of take-home` : '–';
  $('ab-save-year').textContent = Number.isFinite(fx) ? rupees(saveM * 12 * fx) : '–';
  const verdict = $('ab-verdict');
  verdict.className = `status ${saveM > 0 ? 'ok' : 'err'}`;
  verdict.textContent = saveM > 0 ? `✅ After tax and a ${LIFESTYLE[lifestyle].label.toLowerCase()} lifestyle, you keep about ${Math.round((saveM / Math.max(1, netM)) * 100)}% of your take-home pay.` : '⚠️ At this salary your costs exceed your take-home pay. Try a frugal lifestyle, another city or negotiate a higher offer.';

  // India comparison
  const india = INDIA_CITIES.find((x) => x.id === $('ab-india').value) ?? INDIA_CITIES[0];
  const indiaCosts = livingCosts(india.costs, { spouse, kids, paidSchool: kids > 0, lifestyle }).total;
  if (Number.isFinite(fx) && saveM > 0) {
    const ctc = equivalentIndianCtc(saveM * fx, indiaCosts);
    $('ab-eq-ctc').textContent = ctc ? `${rupeesShort(ctc)} a year (${india.name})` : 'more than ₹50 Cr';
    $('ab-eq-note').textContent = `The Indian CTC that leaves the same ₹${Math.round((saveM * fx) / 1000)}K a month after tax (new regime) and a similar lifestyle in ${india.name} (about ${rupeesShort(indiaCosts)} a month).`;
  } else { $('ab-eq-ctc').textContent = '–'; $('ab-eq-note').textContent = ''; }
  $('ab-ppp').textContent = `${rupeesShort((gross / c.ppp) * PPP_INDIA)} a year`;
  $('ab-ppp-cost').textContent = `${rupeesShort((monthlyCost / c.ppp) * PPP_INDIA)} a month`;

  const row = (k: string, v: number) => `<tr><td>${k}</td><td>${money(v, c.currency)}</td><td>${r(v)}</td></tr>`;
  $('ab-tax-table').innerHTML = Object.entries(tax.parts).map(([k, v]) => row(k, v)).join('') + `<tr class="hl"><td>Take-home pay</td><td>${money(tax.net, c.currency)}</td><td>${r(tax.net)}</td></tr>`;
  $('ab-cost-table').innerHTML = Object.entries(costs.rows).filter(([, v]) => v > 0.5).map(([k, v]) => row(k, v)).join('') + `<tr class="hl"><td>Total</td><td>${money(monthlyCost, c.currency)}</td><td>${r(monthlyCost)}</td></tr>`;
  $('ab-notes').innerHTML = c.notes.map((n) => `<li>${n}</li>`).join('') + '<li>Estimates for comparing offers, not tax advice. Edit rent, tax % and the exchange rate in Advanced to match your situation.</li>';
  $('ab-fx-note').textContent = Number.isFinite(fx)
    ? `1 ${c.currency} = ₹${fx.toFixed(2)} · ${parseFloat($('ab-fx').value) > 0 ? 'your rate' : rates?.live ? `live ECB rate (${rates.date})` : `offline rate from ${rates?.date}`} · PPP: World Bank 2024`
    : 'Loading exchange rates…';
}

countrySel.addEventListener('change', () => {
  fillCities();
  const c = country();
  $('ab-salary').value = String(defaults[c.id] ?? 100000);
  $<HTMLInputElement>('ab-school').checked = c.paidSchoolDefault;
  update();
});
citySel.addEventListener('change', update);
document.querySelectorAll('input[name=ab-life]').forEach((e) => e.addEventListener('change', update));

// Initial state (URL params win, handled by initCalculator).
const params = new URLSearchParams(location.search);
if (params.get('c')) countrySel.value = params.get('c')!;
fillCities(params.get('ct') || undefined);
if (!$('ab-salary').value) $('ab-salary').value = root.dataset.salary || String(defaults[country().id] ?? 100000);
if (!params.has('ps')) $<HTMLInputElement>('ab-school').checked = country().paidSchoolDefault;
const lifeParam = params.get('l');
if (lifeParam) document.querySelector<HTMLInputElement>(`input[name=ab-life][value=${lifeParam}]`)?.click();
document.querySelectorAll<HTMLInputElement>('input[name=ab-life]').forEach((e) => e.addEventListener('change', () => { const u = new URL(location.href); u.searchParams.set('l', e.value); history.replaceState(null, '', u); }));
const inputs = Object.fromEntries(['ab-country', 'ab-city', 'ab-salary', 'ab-spouse', 'ab-kids', 'ab-trips', 'ab-school', 'ab-rent', 'ab-taxpct', 'ab-fx', 'ab-india', 'ab-ruling'].map((id) => [$(id).dataset.key!, $(id) as HTMLInputElement]));
initCalculator(update, inputs);
getRates().then((r) => { rates = r; update(); });
