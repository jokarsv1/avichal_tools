/**
 * Languages: English (default, no prefix) plus the five most spoken languages in India
 * (Census 2011 first-language speakers): Hindi, Bengali, Marathi, Telugu, Tamil.
 * Localized pages live under /hi, /bn, /mr, /te, /ta.
 */
import { UI_EN, type UiKey } from './ui-en';
import { UI_HI } from './ui-hi';
import { UI_BN } from './ui-bn';
import { UI_MR } from './ui-mr';
import { UI_TE } from './ui-te';
import { UI_TA } from './ui-ta';

export type Lang = 'en' | 'hi' | 'bn' | 'mr' | 'te' | 'ta';
export const LANGS: { code: Lang; native: string; english: string; locale: string }[] = [
  { code: 'en', native: 'English', english: 'English', locale: 'en-IN' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', locale: 'hi-IN' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali', locale: 'bn-IN' },
  { code: 'mr', native: 'मराठी', english: 'Marathi', locale: 'mr-IN' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu', locale: 'te-IN' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil', locale: 'ta-IN' },
];
export const OTHER_LANGS = LANGS.filter((l) => l.code !== 'en');

const UI: Record<Lang, Partial<Record<UiKey, string>>> = { en: UI_EN, hi: UI_HI, bn: UI_BN, mr: UI_MR, te: UI_TE, ta: UI_TA };

export function langFromPath(pathname: string): Lang {
  const seg = pathname.split('/')[1] as Lang;
  return OTHER_LANGS.some((l) => l.code === seg) ? seg : 'en';
}

/** '/compress-pdf' → '/hi/compress-pdf'; '/' → '/hi'. English paths are unchanged. */
export function localize(path: string, lang: Lang): string {
  if (lang === 'en') return path;
  return path === '/' ? `/${lang}` : `/${lang}${path}`;
}

/** '/hi/compress-pdf' → '/compress-pdf'; '/hi' → '/'. */
export function unlocalize(pathname: string): string {
  const lang = langFromPath(pathname);
  if (lang === 'en') return pathname || '/';
  const rest = pathname.slice(lang.length + 1);
  return rest || '/';
}

export function useT(lang: Lang) {
  return (key: string, vars?: Record<string, string | number>) => {
    let s = (UI[lang] as Record<string, string>)[key] ?? (UI_EN as Record<string, string>)[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}
export type T = ReturnType<typeof useT>;
