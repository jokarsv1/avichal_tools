/** Tiny client-side search over /search-index.json with Indian-English synonyms and size matching. */
export interface SearchItem { u: string; n: string; k: string; i: string }

const SYN: Record<string, string[]> = {
  reduce: ['compress'], shrink: ['compress'], smaller: ['compress'], size: ['compress', 'resize'], decrease: ['compress'],
  photo: ['image'], pic: ['image'], picture: ['image'], img: ['image'], jpeg: ['jpg'], pics: ['image'], images: ['image'],
  combine: ['merge'], join: ['merge'], cut: ['trim', 'split'], separate: ['split'], password: ['unlock', 'protect'],
  remove: ['unlock', 'remover'], lock: ['protect'], decrypt: ['unlock'], encrypt: ['protect'], aadhar: ['aadhaar'],
  sign: ['signature'], esign: ['signature', 'sign'], loan: ['emi'], interest: ['emi', 'fd'], pension: ['nps', 'retirement'],
  tax: ['income'], salary: ['salary'], ctc: ['salary'], mp3: ['audio'], ringtone: ['audio', 'cutter'], resume: ['resume', 'cv'], cv: ['resume'],
  bg: ['background'], ocr: ['text'], dollar: ['usd'], dollars: ['usd'], pound: ['gbp'], euro: ['eur'], dirham: ['aed'], riyal: ['sar'], rupee: ['inr'], rupees: ['inr'], rs: ['inr'],
};

const STOP_WORDS = ['to', 'in', 'a', 'the', 'my', 'for', 'of', 'online', 'free', 'how', 'kaise', 'kare', 'karein', 'tool', 'and', 'with', 'from'];
export function normalize(q: string): string[] {
  const s = q.toLowerCase().replace(/(\d+(?:\.\d+)?)\s*(kb|mb)\b/g, '$1$2').replace(/[^a-z0-9.\s]/g, ' ');
  return s.split(/\s+/).filter((w) => w && !STOP_WORDS.includes(w));
}

const STOP = STOP_WORDS;
const wordStart = (w: string) => new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
/** Query words with "to" kept and synonyms applied, for direction-sensitive phrases like "jpg to pdf". */
const canonical = (q: string) => q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).map((w) => SYN[w]?.[0] && !['photo', 'size', 'remove', 'password', 'interest'].includes(w) ? SYN[w][0] : w).join(' ');

export function rank(query: string, items: SearchItem[]): { item: SearchItem; score: number }[] {
  const words = normalize(query);
  if (!words.length) return [];
  const phrase = canonical(query), plain = words.join(' ');
  return items
    .map((item) => {
      const name = item.n.toLowerCase(), url = item.u.toLowerCase(), urlWords = url.replace(/[/-]+/g, ' ').trim(), hay = `${name} ${item.k.toLowerCase()} ${urlWords}`;
      let score = 0, hits = 0;
      for (const w of words) {
        const alts = [w, ...(SYN[w] ?? [])];
        let best = 0;
        for (const a of alts) {
          const weight = a === w ? 1 : 0.7, re = wordStart(a);
          if (/^\d+(\.\d+)?(kb|mb)$/.test(a)) { if (url.includes(`-${a}`)) best = Math.max(best, 6 * weight); continue; }
          if (re.test(name)) best = Math.max(best, 3 * weight);
          else if (re.test(urlWords)) best = Math.max(best, 2.5 * weight);
          else if (re.test(hay)) best = Math.max(best, 1 * weight);
        }
        if (best > 0) hits++;
        score += best;
      }
      if (hits === words.length) score += 2; // every word matched
      const nameWords = name.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w && !STOP.includes(w)).join(' ');
      const nameToks = nameWords.split(' ');
      if (nameToks.length === words.length && words.every((w) => nameToks.some((t) => t.startsWith(w)))) score += 4; // the tool's name in any order: "compress image" → Image Compressor
      else if (nameWords.startsWith(plain + ' ')) score += 2; // "qr code" → "QR Code Generator"
      if (phrase.includes(' to ') && ` ${urlWords} `.includes(` ${phrase} `)) score += 4; // "jpg to pdf" ≠ "pdf to jpg"
      score -= item.u.split('-').length * 0.05; // prefer the main tool over long landing URLs on ties
      return { item, score };
    })
    .filter((r) => r.score > 1)
    .sort((a, b) => b.score - a.score);
}

/** The single best page when the query is clear enough to go straight there. */
export function bestMatch(query: string, items: SearchItem[]): SearchItem | null {
  const r = rank(query, items);
  if (!r.length) return null;
  const [a, b] = r;
  return !b || a.score >= b.score + 1 || a.score >= b.score * 1.25 ? a.item : null;
}

let cache: Promise<SearchItem[]> | null = null;
export const loadIndex = () => (cache ??= fetch('/search-index.json').then((r) => r.json()));
