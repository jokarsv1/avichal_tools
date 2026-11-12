/**
 * YouTube helpers for the creator tools: parse any YouTube link, build clean / timestamp / embed links,
 * thumbnail URLs, chapter checks and the earnings estimate. Pure functions (unit-tested in tests/unit.mjs).
 *
 * We never download videos or audio from YouTube: YouTube's terms only allow that through its own
 * features, and AdSense does not allow downloader sites. Thumbnails are public images that YouTube
 * serves for sharing and embedding.
 */

export interface YtLink { id: string; t?: number; isShort?: boolean; list?: string }

const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(['youtube.com', 'youtube-nocookie.com', 'youtu.be']);

/** Seconds from "90", "90s", "1m30s", "1h2m3s", "1:30" or "1:02:03". NaN if it isn't a time. */
export function parseTime(input: string): number {
  const s = input.trim().toLowerCase();
  if (!s) return NaN;
  if (/^\d+(\.\d+)?s?$/.test(s)) return Math.floor(parseFloat(s));
  if (/^\d+(:\d{1,2}){1,2}$/.test(s)) {
    const parts = s.split(':').map(Number);
    if (parts.slice(1).some((p) => p >= 60)) return NaN;
    return parts.reduce((a, p) => a * 60 + p, 0);
  }
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(s);
  if (m && (m[1] || m[2] || m[3])) return +(m[1] || 0) * 3600 + +(m[2] || 0) * 60 + +(m[3] || 0);
  return NaN;
}

/** 90 → "1:30", 3723 → "1:02:03". */
export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

/** Any YouTube link (watch, youtu.be, shorts, embed, live, mobile, music) or a bare 11-character video id. */
export function parseYouTube(input: string): YtLink | null {
  const s = input.trim();
  if (!s) return null;
  if (ID.test(s)) return { id: s };
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return null; }
  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  if (!HOSTS.has(host)) return null;
  const parts = u.pathname.split('/').filter(Boolean);
  let id = '', isShort = false;
  if (host === 'youtu.be') id = parts[0] || '';
  else if (parts[0] === 'watch' || !parts.length) id = u.searchParams.get('v') || '';
  else if (['shorts', 'embed', 'live', 'v', 'e'].includes(parts[0])) { id = parts[1] || ''; isShort = parts[0] === 'shorts'; }
  else id = u.searchParams.get('v') || '';
  if (!ID.test(id)) return null;
  const rawT = u.searchParams.get('t') || u.searchParams.get('start') || /(?:^|[#&])t=([^&]+)/.exec(u.hash)?.[1] || '';
  const t = rawT ? parseTime(rawT) : NaN;
  const out: YtLink = { id };
  if (t > 0) out.t = t;
  if (isShort) out.isShort = true;
  const list = u.searchParams.get('list');
  if (list) out.list = list;
  return out;
}

export const watchUrl = (id: string, t?: number) => `https://www.youtube.com/watch?v=${id}${t ? `&t=${t}s` : ''}`;
export const shortLink = (id: string, t?: number) => `https://youtu.be/${id}${t ? `?t=${t}` : ''}`;
export const shortsUrl = (id: string) => `https://www.youtube.com/shorts/${id}`;

export interface Thumb { key: string; label: string; w: number; h: number; url: string }
/** Thumbnail sizes YouTube serves for every video (the HD one exists only if the video was uploaded in HD). */
export function thumbnails(id: string): Thumb[] {
  return [
    ['maxresdefault', 'HD', 1280, 720],
    ['sddefault', 'SD', 640, 480],
    ['hqdefault', 'High', 480, 360],
    ['mqdefault', 'Medium', 320, 180],
    ['default', 'Small', 120, 90],
  ].map(([key, label, w, h]) => ({ key: key as string, label: label as string, w: w as number, h: h as number, url: `https://i.ytimg.com/vi/${id}/${key}.jpg` }));
}

export interface EmbedOptions {
  start?: number; end?: number; autoplay?: boolean; mute?: boolean; loop?: boolean;
  controls?: boolean; privacy?: boolean; captions?: boolean; sameChannel?: boolean;
}
/** The iframe src. Autoplay always mutes (browsers block autoplay with sound); loop needs playlist=<id>. */
export function embedSrc(id: string, o: EmbedOptions = {}): string {
  const p = new URLSearchParams();
  if (o.start && o.start > 0) p.set('start', String(Math.floor(o.start)));
  if (o.end && o.end > (o.start || 0)) p.set('end', String(Math.floor(o.end)));
  if (o.autoplay) p.set('autoplay', '1');
  if (o.mute || o.autoplay) p.set('mute', '1');
  if (o.loop) { p.set('loop', '1'); p.set('playlist', id); }
  if (o.controls === false) p.set('controls', '0');
  if (o.captions) p.set('cc_load_policy', '1');
  if (o.sameChannel) p.set('rel', '0');
  const q = p.toString();
  return `https://www.${o.privacy ? 'youtube-nocookie' : 'youtube'}.com/embed/${id}${q ? `?${q}` : ''}`;
}

export interface EmbedCodeOptions extends EmbedOptions { responsive?: boolean; width?: number; height?: number; vertical?: boolean; title?: string }
export function embedCode(id: string, o: EmbedCodeOptions = {}): string {
  const title = (o.title || 'YouTube video player').replace(/"/g, '&quot;');
  const allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  const ratio = o.vertical ? '9/16' : '16/9';
  const size = o.responsive !== false
    ? `style="width:100%;max-width:${o.vertical ? 360 : o.width || 800}px;aspect-ratio:${ratio};border:0"`
    : `width="${o.width || (o.vertical ? 315 : 560)}" height="${o.height || (o.vertical ? 560 : 315)}" style="border:0"`;
  return `<iframe ${size} src="${embedSrc(id, o)}" title="${title}" allow="${allow}" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>`;
}

export interface Chapter { start: number; title: string; line: number }
export interface ChapterCheck { chapters: Chapter[]; errors: string[] }
/**
 * YouTube shows chapters only if the description lists at least 3 timestamps in ascending order,
 * the first is 0:00, and every chapter is at least 10 seconds long.
 */
export function checkChapters(text: string, durationSec?: number): ChapterCheck {
  const chapters: Chapter[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const m = /^\s*[([]?((?:\d{1,2}:)?\d{1,2}:\d{2})[)\]]?\s*[-–—:|]?\s*(.*)$/.exec(raw);
    if (m) chapters.push({ start: parseTime(m[1]), title: m[2].trim(), line: i + 1 });
  });
  const errors: string[] = [];
  if (!chapters.length) return { chapters, errors: ['No timestamps found. Write one chapter per line, like "0:00 Intro".'] };
  if (chapters[0].start !== 0) errors.push(`The first timestamp must be 0:00 (yours is ${fmtTime(chapters[0].start)} on line ${chapters[0].line}).`);
  if (chapters.length < 3) errors.push(`You need at least 3 timestamps; you have ${chapters.length}.`);
  for (let i = 1; i < chapters.length; i++) {
    const prev = chapters[i - 1], cur = chapters[i];
    if (cur.start <= prev.start) errors.push(`Line ${cur.line}: ${fmtTime(cur.start)} must come after ${fmtTime(prev.start)}.`);
    else if (cur.start - prev.start < 10) errors.push(`Line ${prev.line}: "${prev.title || fmtTime(prev.start)}" is ${cur.start - prev.start} seconds; each chapter must be at least 10 seconds.`);
  }
  const last = chapters[chapters.length - 1];
  if (durationSec && durationSec > 0) {
    if (last.start >= durationSec) errors.push(`Line ${last.line}: ${fmtTime(last.start)} is after the end of the video (${fmtTime(durationSec)}).`);
    else if (durationSec - last.start < 10) errors.push(`Line ${last.line}: the last chapter is only ${durationSec - last.start} seconds; it must be at least 10.`);
  }
  chapters.forEach((c) => { if (!c.title) errors.push(`Line ${c.line}: add a title after ${fmtTime(c.start)}.`); });
  return { chapters, errors };
}

/* ---------- Earnings estimate ---------- */
export type YtFormat = 'long' | 'shorts';
export type YtAudience = 'india' | 'mixed' | 'west';
export type YtNiche = 'entertainment' | 'gaming' | 'education' | 'tech' | 'finance';
/**
 * Typical creator RPM (what the creator keeps per 1,000 views, after YouTube's share) in rupees, for an
 * education / how-to channel. Long videos: creators get 55% of ad revenue; Shorts: 45% of their share of
 * the Shorts pool. Published 2026 ranges: long-form roughly $1–8 overall (much lower for Indian audiences),
 * Shorts roughly $0.01–0.15. These are estimates; your real RPM is in YouTube Studio → Analytics → Revenue.
 */
export const YT_RPM: Record<YtFormat, Record<YtAudience, [number, number]>> = {
  long: { india: [25, 100], mixed: [80, 250], west: [250, 700] },
  shorts: { india: [0.5, 3], mixed: [2, 6], west: [4, 12] },
};
/** Advertisers pay more for some topics. Niche affects Shorts much less than long videos. */
export const YT_NICHE: Record<YtNiche, number> = { entertainment: 0.6, gaming: 0.75, education: 1, tech: 1.4, finance: 2.2 };

export function ytRpm(format: YtFormat, audience: YtAudience, niche: YtNiche): [number, number] {
  const k = format === 'long' ? YT_NICHE[niche] : Math.pow(YT_NICHE[niche], 0.4);
  const [lo, hi] = YT_RPM[format][audience];
  return [lo * k, hi * k];
}

export function ytEarnings(viewsPerDay: number, rpm: [number, number]) {
  const v = Math.max(0, viewsPerDay) / 1000;
  const r = (days: number): [number, number] => [v * rpm[0] * days, v * rpm[1] * days];
  return { day: r(1), month: r(30), year: r(365) };
}
