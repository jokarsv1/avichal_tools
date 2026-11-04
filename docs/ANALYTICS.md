# Analytics & dashboards (PostHog): AARRR for the whole site and every tool

Everything is built and tested. It switches on when you add one key. Until then nothing loads and nothing is sent.

## 1. Setup (about 10 minutes, one time)

1. Create a free account at <https://posthog.com> (the free tier includes 1M events/month). Choose **EU Cloud** if you prefer EU data residency, otherwise **US Cloud**.
2. Copy the **Project API key** (starts with `phc_`; it's public by design) from *Settings → Project*.
3. In Cloudflare (Workers & Pages → your worker → Settings → Build → Variables) add:
   - `POSTHOG_KEY` = `phc_…`
   - `POSTHOG_HOST` = `https://us.i.posthog.com` (or `https://eu.i.posthog.com`)
   - optional `EST_ECPM_USD` = your AdSense eCPM (for example `0.8`), which powers the "estimated revenue" charts
4. Redeploy. Events start flowing within minutes (check *Activity* in PostHog).
5. Create all dashboards with one command. Create a **Personal API key** (*Settings → Personal API keys*, scopes: `dashboard:write`, `insight:write`, `project:read`) and note your **Project ID**:

```bash
POSTHOG_API_HOST=https://us.posthog.com POSTHOG_PERSONAL_API_KEY=phx_xxx POSTHOG_PROJECT_ID=12345 node scripts/posthog-dashboards.mjs
```

The default creates 1 overall dashboard, 9 category dashboards and 1 dashboard per popular tool (≈32 dashboards). Use `--tools=all` for a dashboard for every tool (≈76), `--tools=none` for overall + categories only, and `--dry-run` to preview (writes `tests/output/posthog-plan.json`). Re-running skips dashboards that already exist.

> The script was dry-run tested here (no PostHog account was available in this environment). If PostHog rejects a chart definition, the error names the insight; send it to me and I'll adjust it.

## 2. What each dashboard shows

| Stage | Metric | PostHog definition |
|---|---|---|
| **Acquisition** | Daily unique visitors; new visitors per week; by source, UTM, country; top landing pages | `$pageview` (DAU, first-time-for-user, breakdowns `$referring_domain`, `utm_source`, `$geoip_country_name`, `$pathname`) |
| **Activation** | Visit → start → complete funnel (overall, by tool); completion rate % | Funnel `$pageview (page_type=tool)` → `tool_started` → `task_completed` within 1 hour; formula `users completing ÷ tool visitors` |
| **Engagement** | Tasks per day; tasks per active user; sessions; most-used tools; output types | `task_completed` total / avg per user / breakdown `tool`, `output`; `$pageview` unique sessions |
| **Retention** | Weekly retention for task completers and for all visitors; WAU; PWA installs | Retention on `task_completed` and `$pageview` (first-time cohort, weekly, 8 weeks) |
| **Revenue** | Estimated ad revenue (total and by tool); donation clicks | `ad_filled.est_revenue_usd` (= eCPM ÷ 1000 per filled ad); `donate_clicked` by method. **Real revenue is in AdSense**; PostHog shows which tools earn it. |
| **Adoption** | Category reach; one-click presets used; cross-tool discovery; languages | `$pageview` by `category`; `preset_used` by `preset`; `related_tool_clicked` by `to`; visitors and tasks by `lang`; `language_changed` by `to` |
| **Referral** | Share clicks per tool | `share_clicked` |
| **Discovery** | Top searches on the home page | `search_used.query` (shows tools people want that we don't have yet) |
| **Reliability** | Errors by tool and message | `error_shown` |

Category and tool dashboards repeat the core set (visitors, sources, funnel, completion rate, tasks, retention, revenue, presets, errors) filtered to that category or tool.

## 3. Event reference (what the site sends)

| Event | When | Properties |
|---|---|---|
| `$pageview` / `$pageleave` | Every page | super-properties `page_type` (home, hub, tool, content), `tool`, `category`, `lang` (en, hi, bn, mr, te, ta); URL **without** query string |
| `tool_started` | First interaction on a tool page (once per view) | `method`: `file`, `input`, `preset` |
| `file_added` | Files picked, dropped or pasted | `count`, `size_mb` (rounded) |
| `task_completed` | Download, copy, share, or a calculator result seen | `output` (e.g. `pdf`, `jpg`, `mp4`, `calculation`, `share`, `copy`), `first_in_view` |
| `preset_used` | One-click preset chip | `preset` |
| `share_clicked` | Share button | `method` |
| `related_tool_clicked` | Tool tile clicked | `to` |
| `search_used` | Home search (debounced) | `query` (40 chars max), `results` |
| `donate_clicked` | Donation button | `method` |
| `ad_filled` | An AdSense slot is filled | `slot`, `est_revenue_usd` |
| `error_shown` | A red error message is shown | `message` (120 chars max) |
| `pwa_installed` | App installed | (none) |
| `language_changed` | Language picked in the header (or "Read in English") | `to` |

## 4. Privacy guarantees (keeps the "no data stored" promise honest)

- No autocapture, no session recordings, no heatmaps, no surveys.
- Never sent: file names, file contents, typed text, calculator inputs, or URL query strings. `before_send` strips them, which matters because calculator links contain salaries.
- Switched off when Do Not Track or Global Privacy Control is on, and by the opt-out switch on `/privacy-policy`.
- EU/UK visitors (detected by time zone) use memory-only persistence: nothing is stored on their device, so they're counted per visit and not included in retention.
- Bots and headless browsers are filtered by PostHog.

## 5. Weekly 15-minute review (what to act on)

1. **Acquisition:** which landing pages and sources grew? Write more pages like the winners.
2. **Activation:** tools with a low completion rate need clearer copy or a better default preset.
3. **Errors:** fix the top error message every week.
4. **Searches with no results:** that's your roadmap.
5. **Revenue by tool:** add related-tool links from low-earning pages to high-earning ones.
