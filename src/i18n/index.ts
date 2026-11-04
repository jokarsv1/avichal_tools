/**
 * Languages: English (default, no prefix) plus the five most spoken languages in India
 * (Census 2011, first-language speakers): Hindi, Bengali, Marathi, Telugu, Tamil.
 * Localized pages live under /hi, /bn, /mr, /te, /ta (home, category hubs and every tool page).
 *
 * Each language file (src/i18n/lang/*.ts) holds:
 *   ui      - site chrome strings (keys from ui-en.ts)
 *   cats    - category [label, title, description]
 *   tools   - tool [name, short description]
 *   phrases - exact English labels inside tools → translation (swapped in the browser)
 */
import { UI_EN, type UiKey } from './ui-en';
import hi from './lang/hi';
import bn from './lang/bn';
import mr from './lang/mr';
import te from './lang/te';
import ta from './lang/ta';
import { LIVE_TOOLS, CATEGORIES, type Tool, type Category } from '../data/tools';
import { EXAMS, KB_PAGES } from '../data/exams';

export type Lang = 'en' | 'hi' | 'bn' | 'mr' | 'te' | 'ta';
export interface LangPack {
  ui: Partial<Record<UiKey, string>>;
  cats: Record<string, [label: string, title: string, description: string]>;
  tools: Record<string, [name: string, short: string]>;
  phrases: Record<string, string>;
  /** Templates for translated exam and "compress image to N KB" pages ({exam}, {kb}, {spec}… are filled in). */
  pages: Record<string, string>;
}
export const LANGS: { code: Lang; native: string; english: string; locale: string }[] = [
  { code: 'en', native: 'English', english: 'English', locale: 'en-IN' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', locale: 'hi-IN' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali', locale: 'bn-IN' },
  { code: 'mr', native: 'मराठी', english: 'Marathi', locale: 'mr-IN' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu', locale: 'te-IN' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil', locale: 'ta-IN' },
];
export const OTHER_LANGS = LANGS.filter((l) => l.code !== 'en');
export const PACKS: Record<Exclude<Lang, 'en'>, LangPack> = { hi, bn, mr, te, ta };

/** Tool pages that exist as a single .astro file can be localized (programmatic landing pages stay English). */
const PAGE_FILES = Object.keys(import.meta.glob('../pages/*.astro')).map((p) => p.replace('../pages/', '').replace('.astro', ''));
export const LOCALIZED_TOOLS = LIVE_TOOLS.filter((t) => PAGE_FILES.includes(t.slug));
export const LOCALIZED_EXAM_PATHS = EXAMS.map((e) => `/${e.slug}-photo-resizer`);
export const LOCALIZED_KB_PATHS = KB_PAGES.map((p) => `/compress-image-to-${p.kb}kb`);
const LOCALIZED_PATHS = new Set(['/', ...CATEGORIES.map((c) => c.path), ...LOCALIZED_TOOLS.map((t) => `/${t.slug}`), ...LOCALIZED_EXAM_PATHS, ...LOCALIZED_KB_PATHS]);
export const isLocalizable = (enPath: string) => LOCALIZED_PATHS.has(enPath.split('?')[0].replace(/\/$/, '') || '/');

/** Astro may report '/hi.html' or '/hi/' for the localized home page; normalise before reading the language. */
const clean = (p: string) => p.replace(/\.html$/, '').replace(/\/index$/, '').replace(/(.)\/$/, '$1');
export function langFromPath(pathname: string): Lang {
  const seg = clean(pathname).split('/')[1] as Lang;
  return OTHER_LANGS.some((l) => l.code === seg) ? seg : 'en';
}
/** '/compress-pdf' → '/hi/compress-pdf'; '/' → '/hi'. English paths are unchanged. */
export function localize(path: string, lang: Lang): string {
  if (lang === 'en') return path;
  return path === '/' ? `/${lang}` : `/${lang}${path}`;
}
/** Localize an internal link only if a translated page exists for it (keeps the query string). */
export function localizeHref(href: string, lang: Lang): string {
  if (lang === 'en' || !href.startsWith('/') || href.startsWith('//')) return href;
  const [p, q] = href.split('?');
  return isLocalizable(p) ? localize(p, lang) + (q ? `?${q}` : '') : href;
}
/** '/hi/compress-pdf' → '/compress-pdf'; '/hi' → '/'. */
export function unlocalize(pathname: string): string {
  const p = clean(pathname);
  const lang = langFromPath(p);
  if (lang === 'en') return p || '/';
  return p.slice(lang.length + 1) || '/';
}

export function useT(lang: Lang) {
  const pack = lang === 'en' ? null : PACKS[lang];
  return (key: string, vars?: Record<string, string | number>) => {
    let s = (pack?.ui as Record<string, string> | undefined)?.[key] ?? (UI_EN as Record<string, string>)[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}
export type T = ReturnType<typeof useT>;

/** Page templates for translated exam / KB pages. */
export function usePageT(lang: Exclude<Lang, 'en'>) {
  const pages = PACKS[lang].pages;
  return (key: string, vars: Record<string, string | number> = {}) => {
    let s = pages[key] ?? key;
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

export function toolText(t: Tool, lang: Lang) {
  const tr = lang === 'en' ? undefined : PACKS[lang].tools[t.slug];
  return { name: tr?.[0] ?? t.name, short: tr?.[1] ?? t.short, translated: !!tr };
}
export function catText(c: Category, lang: Lang) {
  const tr = lang === 'en' ? undefined : PACKS[lang].cats[c.id];
  return { label: tr?.[0] ?? c.label, title: tr?.[1] ?? c.title, description: tr?.[2] ?? c.description };
}

/** Which generic how-to steps fit a tool. */
export function toolKind(t: Tool): 'file' | 'calc' | 'maker' | 'text' {
  if (['invoice-generator', 'quotation-generator', 'salary-slip-generator', 'rent-receipt-generator', 'resume-builder', 'qr-code-generator', 'upi-qr-code-generator', 'text-to-handwriting', 'password-generator'].includes(t.slug)) return 'maker';
  if (['word-counter', 'json-formatter'].includes(t.slug)) return 'text';
  if (['pdf', 'image', 'video', 'exam'].includes(t.category)) return 'file';
  return 'calc';
}
