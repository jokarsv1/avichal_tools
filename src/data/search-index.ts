/**
 * Everything a visitor can search for: every tool plus the landing pages (exam presets, KB and PDF sizes,
 * loan types, countries, currency pairs). Served as /search-index.json for /search, the home page and 404.
 */
import { LIVE_TOOLS } from './tools';
import { EXAMS, KB_PAGES } from './exams';
import { PDF_SIZES } from './pdf-sizes';
import { LOANS } from './loans';
import { PAIRS } from './fx-pairs';
import { COUNTRIES } from '../lib/abroad';
import { PACKS } from '../i18n';

export interface SearchItem { u: string; n: string; k: string; i: string }

export function searchIndex(): SearchItem[] {
  // Tool names in Hindi, Bengali, Marathi, Telugu and Tamil are searchable too.
  const local = (slug: string) => Object.values(PACKS).map((p) => p.tools[slug]?.[0] ?? '').join(' ');
  const items: SearchItem[] = LIVE_TOOLS.map((t) => ({ u: `/${t.slug}`, n: t.name, i: t.icon, k: `${t.slug.replace(/-/g, ' ')} ${t.short} ${t.keywords ?? ''} ${local(t.slug)}` }));
  for (const e of EXAMS) items.push({ u: `/${e.slug}-photo-resizer`, n: `${e.name} photo & signature resizer`, i: '🏛️', k: `${e.slug.replace(/-/g, ' ')} ${e.name} ${e.fullName} photo signature size resize form` });
  for (const p of KB_PAGES) items.push({ u: `/compress-image-to-${p.kb}kb`, n: `Compress image to ${p.kb} KB`, i: '🎯', k: `${p.kb}kb image photo jpg jpeg picture compress resize reduce` });
  for (const s of PDF_SIZES) items.push({ u: `/compress-pdf-to-${s.slug}`, n: `Compress PDF to ${s.value} ${s.unit}`, i: '🎯', k: `${s.slug} pdf compress reduce size` });
  for (const l of LOANS) items.push({ u: `/${l.slug}-loan-emi-calculator`, n: `${l.name} EMI calculator`, i: l.icon, k: `${l.slug} loan emi calculator interest` });
  for (const c of COUNTRIES) items.push({ u: `/salary-in-${c.id}-vs-india`, n: `Salary in ${c.name} vs India`, i: c.flag, k: `${c.id.replace(/-/g, ' ')} ${c.name} ${c.currency} salary abroad take home tax savings ppp` });
  for (const p of PAIRS) items.push({ u: `/${p.from.toLowerCase()}-to-${p.to.toLowerCase()}`, n: `${p.from} to ${p.to}`, i: '💱', k: `${p.from.toLowerCase()} ${p.to.toLowerCase()} ${p.from.toLowerCase()} to ${p.to.toLowerCase()} ${p.name} currency rate convert` });
  items.push({ u: '/aadhaar-pdf-password', n: 'e-Aadhaar PDF password', i: '🪪', k: 'aadhaar aadhar e aadhaar pdf password open unlock remove uidai' });
  return items;
}
