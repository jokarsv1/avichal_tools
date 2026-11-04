/**
 * Privacy-first product analytics (PostHog) for AARRR dashboards.
 *
 * What we send: anonymous usage events (which tool, which preset, whether a task completed, errors).
 * What we NEVER send: file names, file contents, typed text, calculator inputs or URL query strings.
 * Off entirely when: no POSTHOG_KEY configured, Do Not Track / Global Privacy Control is on, or the visitor
 * opted out on /privacy-policy. EU/UK visitors run in memory-only mode (nothing stored on their device).
 *
 * Event taxonomy (see docs/ANALYTICS.md):
 *  $pageview / $pageleave (auto)       Acquisition, Engagement
 *  tool_started {method}               Activation (first interaction on a tool page)
 *  task_completed {output}             Activation / Engagement / Retention (download, copy, share, calculation)
 *  preset_used {preset}                Adoption of one-click presets
 *  share_clicked                       Referral
 *  related_tool_clicked {to}           Engagement / cross-tool adoption
 *  search_used {query}                 Discovery
 *  donate_clicked {method}             Revenue (donations)
 *  ad_filled {slot, est_revenue_usd}   Revenue (estimated ad revenue)
 *  error_shown {message}               Reliability
 *  pwa_installed                       Retention
 */
type Props = Record<string, string | number | boolean | undefined>;
let ph: any = null;
const queue: [string, Props][] = [];
let started = false, completed = false;

const cfg = () => (typeof window !== 'undefined' ? (window as any).__AN : null) as null | { key: string; host: string; ecpm: number };
const body = () => document.body?.dataset ?? {};

export function analyticsEnabled() {
  const c = cfg();
  if (!c?.key) return false;
  const nav = navigator as any;
  if (nav.doNotTrack === '1' || nav.globalPrivacyControl === true) return false;
  try { if (localStorage.getItem('analytics-optout') === '1') return false; } catch { /* ignore */ }
  return true;
}

export function capture(event: string, props: Props = {}) {
  const full = { tool: body().tool || undefined, category: body().category || undefined, ...props };
  if (ph) ph.capture(event, full);
  else if (analyticsEnabled() && queue.length < 50) queue.push([event, full]);
}

/** First meaningful interaction on a tool page (once per page view). */
export function toolStarted(method: 'file' | 'input' | 'preset') {
  if (started) return;
  started = true;
  capture('tool_started', { method });
}
/** The visitor got what they came for (once per page view counts as an activation; every one is counted too). */
export function taskCompleted(output: string) {
  capture('task_completed', { output, first_in_view: !completed });
  completed = true;
}

const STRIP = (u: unknown) => (typeof u === 'string' ? u.replace(/[?#].*$/, '') : u);

export function initAnalytics() {
  if (!analyticsEnabled()) return;
  const c = cfg()!;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const euLike = /^(Europe|Atlantic\/(Reykjavik|Canary|Madeira|Azores))\//.test(tz);
  const debug = new URLSearchParams(location.search).has('ph_debug');
  const go = () => import('posthog-js').then(({ default: posthog }) => {
    posthog.init(c.key, {
      // Test/debug hook only: lets automated browsers through PostHog's bot filter.
      opt_out_useragent_filter: debug,
      api_host: c.host,
      autocapture: false,
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: true,
      disable_surveys: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      persistence: euLike ? 'memory' : 'localStorage',
      person_profiles: 'always',
      // Never send query strings (calculator links contain salaries, amounts, etc.).
      before_send: (ev: any) => {
        const p = ev?.properties;
        if (p) for (const k of ['$current_url', '$referrer', '$initial_referrer', '$pathname']) if (k in p) p[k] = STRIP(p[k]);
        const s = ev?.$set_once || ev?.properties?.$set_once;
        if (s) for (const k of ['$initial_current_url', '$initial_referrer']) if (k in s) s[k] = STRIP(s[k]);
        return ev;
      },
    } as any);
    posthog.register({ page_type: body().pageType || 'content', tool: body().tool || undefined, category: body().category || undefined });
    ph = posthog;
    if (debug) (window as any).__ph = posthog;
    for (const [e, p] of queue.splice(0)) ph.capture(e, p);
  });
  const ric = (window as any).requestIdleCallback;
  if (ric) ric(go, { timeout: 1000 }); else setTimeout(go, 600);

  // Generic listeners: related tools, donations, copy buttons, PWA installs, ad fills.
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const tile = t.closest<HTMLAnchorElement>('a.tool-tile');
    if (tile) capture('related_tool_clicked', { to: tile.getAttribute('href')?.slice(1) });
    const donate = t.closest<HTMLElement>('[data-donate]');
    if (donate) capture('donate_clicked', { method: donate.dataset.donate });
    const btn = t.closest<HTMLElement>('button[id$="-copy"]');
    if (btn) taskCompleted('copy');
  }, { capture: true });
  addEventListener('appinstalled', () => capture('pwa_installed'));
  const ecpm = c.ecpm || 0;
  new MutationObserver((muts) => {
    for (const m of muts) {
      const el = m.target as HTMLElement;
      if (m.attributeName === 'data-ad-status' && el.getAttribute('data-ad-status') === 'filled' && !el.dataset.counted) {
        el.dataset.counted = '1';
        capture('ad_filled', { slot: el.closest('.ad-slot')?.className.replace('ad-slot', '').trim() || 'auto', est_revenue_usd: ecpm / 1000 });
      }
    }
  }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['data-ad-status'] });
}

export function setOptOut(optOut: boolean) {
  try { optOut ? localStorage.setItem('analytics-optout', '1') : localStorage.removeItem('analytics-optout'); } catch { /* ignore */ }
  if (optOut && ph) ph.opt_out_capturing();
}
