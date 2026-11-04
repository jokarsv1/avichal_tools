// Creates PostHog dashboards for the whole product, each category and each tool, organised by AARRR:
// Acquisition, Activation, Retention, Revenue, Referral + Engagement and Adoption.
//
//   POSTHOG_API_HOST=https://us.posthog.com   (or https://eu.posthog.com)
//   POSTHOG_PERSONAL_API_KEY=phx_...          (Settings → Personal API keys; scopes: dashboard:write, insight:write, project:read)
//   POSTHOG_PROJECT_ID=12345                  (Settings → Project → Project ID)
//   node scripts/posthog-dashboards.mjs [--tools popular|all|none] [--dry-run]
//
// Safe to re-run: dashboards that already exist (same name) are skipped.
import fs from 'node:fs';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const toolsArg = (args.find((a) => a.startsWith('--tools=')) || '--tools=popular').split('=')[1];
const HOST = (process.env.POSTHOG_API_HOST || 'https://us.posthog.com').replace(/\/$/, '');
const KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PID = process.env.POSTHOG_PROJECT_ID;
if (!DRY && (!KEY || !PID)) {
  console.error('Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID (or use --dry-run). See docs/ANALYTICS.md');
  process.exit(1);
}
const { TOOLS, CATEGORIES } = await import('../src/data/tools.ts');
const live = TOOLS.filter((t) => t.status === 'live');

// ---------- query builders ----------
const ev = (event, extra = {}) => ({ kind: 'EventsNode', event, name: event, ...extra });
const prop = (key, value, type = 'event') => ({ key, value, operator: 'exact', type });
function trends(series, o = {}) {
  return {
    kind: 'InsightVizNode',
    source: {
      kind: 'TrendsQuery', series, interval: o.interval || 'day', dateRange: { date_from: o.from || '-30d' },
      ...(o.breakdown ? { breakdownFilter: { breakdown: o.breakdown, breakdown_type: o.breakdownType || 'event', breakdown_limit: o.limit || 25 } } : {}),
      trendsFilter: { display: o.display || 'ActionsLineGraph', ...(o.formula ? { formula: o.formula } : {}) },
      ...(o.properties?.length ? { properties: o.properties } : {}),
    },
  };
}
function funnel(o = {}) {
  return {
    kind: 'InsightVizNode',
    source: {
      kind: 'FunnelsQuery',
      series: [ev('$pageview', { properties: [prop('page_type', 'tool')], custom_name: 'Visited a tool' }), ev('tool_started', { custom_name: 'Started (file / input / preset)' }), ev('task_completed', { custom_name: 'Completed (download / result)' })],
      funnelsFilter: { funnelWindowInterval: 1, funnelWindowIntervalUnit: 'hour', funnelOrderType: 'ordered', funnelVizType: 'steps' },
      dateRange: { date_from: o.from || '-30d' },
      ...(o.breakdown ? { breakdownFilter: { breakdown: o.breakdown, breakdown_type: 'event', breakdown_limit: 30 } } : {}),
      ...(o.properties?.length ? { properties: o.properties } : {}),
    },
  };
}
function retention(event = 'task_completed', o = {}) {
  return {
    kind: 'InsightVizNode',
    source: {
      kind: 'RetentionQuery', dateRange: { date_from: '-8w' },
      retentionFilter: { period: 'Week', totalIntervals: 8, retentionType: 'retention_first_time', targetEntity: { id: event, name: event, type: 'events' }, returningEntity: { id: event, name: event, type: 'events' } },
      ...(o.properties?.length ? { properties: o.properties } : {}),
    },
  };
}

// ---------- insight sets ----------
function overall() {
  return [
    ['🧲 Acquisition · Daily unique visitors', trends([ev('$pageview', { math: 'dau' })])],
    ['🧲 Acquisition · New visitors per week', trends([ev('$pageview', { math: 'first_time_for_user' })], { interval: 'week', from: '-90d' })],
    ['🧲 Acquisition · Visitors by source', trends([ev('$pageview', { math: 'dau' })], { breakdown: '$referring_domain', display: 'ActionsTable' })],
    ['🧲 Acquisition · Visitors by UTM source', trends([ev('$pageview', { math: 'dau' })], { breakdown: 'utm_source', display: 'ActionsTable' })],
    ['🧲 Acquisition · Visitors by country', trends([ev('$pageview', { math: 'dau' })], { breakdown: '$geoip_country_name', display: 'WorldMap' })],
    ['🧲 Acquisition · Top landing pages', trends([ev('$pageview', { math: 'dau' })], { breakdown: '$pathname', display: 'ActionsTable', limit: 50 })],
    ['⚡ Activation · Visit → start → complete (all tools)', funnel()],
    ['⚡ Activation · Funnel by tool', funnel({ breakdown: 'tool' })],
    ['⚡ Activation · Completion rate % (users completing / tool visitors)', trends([ev('task_completed', { math: 'dau' }), ev('$pageview', { math: 'dau', properties: [prop('page_type', 'tool')] })], { formula: 'A/B*100' })],
    ['📈 Engagement · Tasks completed per day', trends([ev('task_completed')])],
    ['📈 Engagement · Tasks per active user (weekly)', trends([ev('task_completed', { math: 'avg_count_per_actor' })], { interval: 'week', from: '-90d' })],
    ['📈 Engagement · Sessions per day', trends([ev('$pageview', { math: 'unique_session' })])],
    ['📈 Engagement · Most used tools (30d)', trends([ev('task_completed', { math: 'dau' })], { breakdown: 'tool', display: 'ActionsBarValue', limit: 40 })],
    ['📈 Engagement · Output types', trends([ev('task_completed')], { breakdown: 'output', display: 'ActionsPie' })],
    ['🔁 Retention · Weekly retention (completed a task)', retention('task_completed')],
    ['🔁 Retention · Weekly retention (any visit)', retention('$pageview')],
    ['🔁 Retention · Weekly active users', trends([ev('$pageview', { math: 'weekly_active' })], { from: '-90d' })],
    ['🔁 Retention · PWA installs', trends([ev('pwa_installed')], { interval: 'week', from: '-90d' })],
    ['💰 Revenue · Estimated ad revenue (USD)', trends([ev('ad_filled', { math: 'sum', math_property: 'est_revenue_usd' })])],
    ['💰 Revenue · Estimated ad revenue by tool', trends([ev('ad_filled', { math: 'sum', math_property: 'est_revenue_usd' })], { breakdown: 'tool', display: 'ActionsBarValue' })],
    ['💰 Revenue · Donation clicks', trends([ev('donate_clicked')], { breakdown: 'method', display: 'ActionsBarValue', from: '-90d' })],
    ['🧩 Adoption · Visitors by category', trends([ev('$pageview', { math: 'dau' })], { breakdown: 'category', display: 'ActionsBarValue' })],
    ['🧩 Adoption · One-click presets used', trends([ev('preset_used')], { breakdown: 'preset', display: 'ActionsTable', limit: 50 })],
    ['🧩 Adoption · Tools discovered via related links', trends([ev('related_tool_clicked')], { breakdown: 'to', display: 'ActionsTable' })],
    ['📣 Referral · Share clicks', trends([ev('share_clicked')], { breakdown: 'tool', display: 'ActionsBarValue' })],
    ['🔎 Discovery · Top home-page searches', trends([ev('search_used')], { breakdown: 'query', display: 'ActionsTable', limit: 50 })],
    ['🛠️ Reliability · Errors by tool', trends([ev('error_shown')], { breakdown: 'tool', display: 'ActionsBarValue' })],
    ['🛠️ Reliability · Top error messages', trends([ev('error_shown')], { breakdown: 'message', display: 'ActionsTable', limit: 50 })],
  ];
}
function scoped(label, properties, opts = { perTool: true }) {
  const P = properties;
  const set = [
    [`🧲 ${label} · Daily unique visitors`, trends([ev('$pageview', { math: 'dau', properties: P })])],
    [`🧲 ${label} · Visitors by source`, trends([ev('$pageview', { math: 'dau', properties: P })], { breakdown: '$referring_domain', display: 'ActionsTable' })],
    [`⚡ ${label} · Visit → start → complete`, funnel({ properties: P })],
    [`⚡ ${label} · Completion rate %`, trends([ev('task_completed', { math: 'dau', properties: P }), ev('$pageview', { math: 'dau', properties: P })], { formula: 'A/B*100' })],
    [`📈 ${label} · Tasks completed per day`, trends([ev('task_completed', { properties: P })])],
    [`🔁 ${label} · Weekly retention`, retention('task_completed', { properties: P })],
    [`💰 ${label} · Estimated ad revenue (USD)`, trends([ev('ad_filled', { math: 'sum', math_property: 'est_revenue_usd', properties: P })])],
    [`🧩 ${label} · Presets used`, trends([ev('preset_used', { properties: P })], { breakdown: 'preset', display: 'ActionsBarValue' })],
    [`🛠️ ${label} · Errors`, trends([ev('error_shown', { properties: P })], { breakdown: 'message', display: 'ActionsTable' })],
  ];
  if (opts.perTool) set.splice(3, 0, [`⚡ ${label} · Funnel by tool`, funnel({ properties: P, breakdown: 'tool' })]);
  else set.push([`📈 ${label} · Output types`, trends([ev('task_completed', { properties: P })], { breakdown: 'output', display: 'ActionsPie' })]);
  return set;
}

// ---------- API ----------
async function api(method, path, body) {
  const res = await fetch(`${HOST}/api/projects/${PID}${path}`, { method, headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}
const plan = [];
plan.push({ name: '⭐ Overall — AARRR', description: 'Acquisition, activation, engagement, retention, revenue, adoption, referral and reliability for the whole site.', insights: overall() });
for (const c of CATEGORIES) plan.push({ name: `📁 ${c.label} tools`, description: `All ${c.label.toLowerCase()} tools.`, insights: scoped(c.label, [prop('category', c.id)]) });
const toolList = toolsArg === 'all' ? live : toolsArg === 'none' ? [] : live.filter((t) => t.popular);
for (const t of toolList) plan.push({ name: `🔧 ${t.name}`, description: `/${t.slug}`, insights: scoped(t.name, [prop('tool', t.slug)], { perTool: false }) });

if (DRY) {
  fs.mkdirSync('tests/output', { recursive: true });
  fs.writeFileSync('tests/output/posthog-plan.json', JSON.stringify(plan, null, 2));
  console.log(`Dry run: ${plan.length} dashboards, ${plan.reduce((s, d) => s + d.insights.length, 0)} insights → tests/output/posthog-plan.json`);
  process.exit(0);
}

const existing = new Set();
for (let url = '/dashboards/?limit=200'; url;) {
  const page = await api('GET', url);
  page.results.forEach((d) => existing.add(d.name));
  url = page.next ? page.next.replace(/^.*\/api\/projects\/[^/]+/, '') : null;
}
for (const d of plan) {
  if (existing.has(d.name)) { console.log(`skip (exists): ${d.name}`); continue; }
  const dash = await api('POST', '/dashboards/', { name: d.name, description: d.description, tags: ['avichal-tools', 'aarrr'] });
  for (const [name, query] of d.insights) await api('POST', '/insights/', { name, query, dashboards: [dash.id], saved: true });
  console.log(`created: ${d.name} (${d.insights.length} insights) → ${HOST}/project/${PID}/dashboard/${dash.id}`);
}
console.log('Done.');
