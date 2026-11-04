# Before and after building: the checklist

✅ = already handled in this codebase · 👉 = **your action** (needs your account, money or a decision)

## 1. Brand, domain and structure ("single name, multi tabs")
- ✅ **One brand, one domain, many URLs.** Every tool is its own static page (`/compress-pdf`, `/emi-calculator`), not a tab inside a single-page app, so Google can index each one. The header "tabs" (PDF, Image, Video, Finance, Exam & Govt, Student, Everyday) link to **category hub pages** that link to every tool (hub-and-spoke internal linking).
- ✅ Subpaths, not subdomains, so all SEO authority stays on one domain.
- ✅ Brand, email, GitHub URL and donation links live in **one file**: `src/config/site.ts`.
- 👉 **Choose the final brand name and buy the domain** (`.com` recommended, about $10/year at Cloudflare Registrar). Avoid names close to iLovePDF/Smallpdf/Canva.
- 👉 After renaming: `node scripts/generate-images.mjs` regenerates the icons and social image.

## 2. SEO
- ✅ Unique `<title>`, meta description, H1, canonical URL and Open Graph/Twitter tags on every page.
- ✅ Structured data: `WebApplication`, `BreadcrumbList` and `FAQPage` on tools; `WebSite` and `Organization` on home; `ItemList` on hubs.
- ✅ 300–800 words of useful content on every tool page (how-to, FAQs, tables). This matters for AdSense approval ("low-value content" rejections).
- ✅ Auto sitemap (`/sitemap-index.xml`), `robots.txt`, `llms.txt` for AI search, a real 404 page, and 301 redirects for alternate URLs.
- ✅ Programmatic pages only where intent is genuinely different (exam-specific and KB-size pages, each with its own specs and copy). This avoids Google's "scaled content abuse" penalty.
- ✅ Fast: about 6 KB of JS loads up front per page; heavy engines lazy-load; fonts are system fonts (except handwriting and signature fonts on those two pages).
- 👉 Search Console + Bing Webmaster + Crawler Hints (see `DEPLOY-CLOUDFLARE.md`).
- 👉 **Backlinks:** launch the repo on GitHub (good README), post on Product Hunt, Hacker News ("Show HN: 70+ browser tools that never upload your files"), r/india, r/Indian_Academia, r/UPSC, r/SSC, Telegram exam groups, Quora answers. Offer free embeds to coaching sites.
- 👉 Later: Hindi versions of the top India pages under `/hi/` with `hreflang`.

## 3. Hosting
- ✅ Static site for Cloudflare Workers static assets (`wrangler.jsonc`) or Pages. Free plan, commercial use allowed.
- ✅ Security and caching headers in `public/_headers`. **No COOP/COEP** (that would break ads).
- ✅ All files under the 25 MiB limit; big future AI models should go on R2 or a CDN.
- 👉 Create the Cloudflare account and connect the repo (10 minutes, step by step in `DEPLOY-CLOUDFLARE.md`).

## 4. Database
- ✅ **None needed.** Files are processed in the browser. Settings and drafts (word counter, handwriting text) use `localStorage`.
- ✅ Tool requests and votes use **GitHub Issues** (free "database", linked from `/roadmap`).
- Later, only if needed: **Cloudflare D1** (SQLite, free tier) plus a small Worker for usage counters or a feedback form. Never store user files.

## 5. Contact
- ✅ `jokars.v1@gmail.com` appears in the footer of every page, on `/contact` (with mailto buttons for feedback and bug reports), `/about`, `/privacy-policy` and `/terms`.
- 👉 Consider a domain email later (for example `hello@yourdomain.com` via free Cloudflare Email Routing to your Gmail). It looks more professional to AdSense and partners and keeps your personal address out of spam lists.

## 6. APIs to consume
- ✅ **One runtime API:** **Frankfurter** (ECB currency rates, free, no key) for the currency converter and the salary-abroad calculators, with built-in fallback rates so they still work offline. Every other tool runs without any API.
- ✅ Static data shipped with the site: World Bank PPP factors, country tax rules and city living costs (`src/lib/abroad.ts`), exam specs (`src/data/exams.ts`).
- Free data sources for later tools: **Razorpay IFSC dataset** (open source, ship as static JSON), **India Post PIN code data** (static JSON), exam specs in `src/data/exams.ts` (maintained by you).
- Only for things browsers truly can't do (high-fidelity Word ↔ PDF): self-host **Gotenberg** (LibreOffice in Docker) on a cheap VPS behind Cloudflare Turnstile. Only once traffic justifies it.

## 7. Ads
- ✅ AdSense integration is ready: set `ADSENSE_CLIENT` (and optionally 3 slot ids). The script loads after the page is idle. `ads.txt` is generated automatically. Placeholders show in `npm run dev` so you can see the positions.
- ✅ Placements: below the tool (where people wait), inside the article, and a sticky desktop sidebar (only rendered when a sidebar slot exists). Never next to upload/download buttons; always labelled.
- ✅ Privacy policy covers AdSense cookies, opt-out links, EEA/UK consent, DPDP Act and GDPR.
- 👉 Apply to AdSense after the custom domain is live and a few pages are indexed.
- 👉 Turn on the Google-certified **consent message** (AdSense → Privacy & messaging).
- 👉 Later, at higher traffic: Ezoic, Journey by Mediavine or Raptive (check their current thresholds).

## 8. Open source and licences
- ✅ Your code: **MIT** (`LICENSE`), the most adoption-friendly.
- ✅ Every dependency allows commercial use: pdf-lib (MIT), pdf.js (Apache-2.0), Mediabunny (MPL-2.0), qrcode, fflate, UPNG (MIT), libheif via heic-to (LGPL-3.0, loaded as a separate file), LAME MP3 and FFmpeg AAC encoders (LGPL, separate WASM files). See `THIRD_PARTY_LICENSES.md`.
- ✅ Deliberately **avoided**: ffmpeg.wasm with x264 (GPL), @imgly/background-removal (AGPL), BRIA RMBG models (non-commercial).
- 👉 Before adding any AI model, check its licence (MIT/Apache = OK; "non-commercial" or "research only" = not OK with ads).

## 9. Donations ("buy me a coffee")
- ✅ `/support` page and a "Buy me a coffee" box on every tool page. It shows only the methods you configure in `src/config/site.ts` → `DONATE`.
- **Recommendation for an individual in India:**
  1. **UPI** (`UPI_ID` env var): zero fees, instant; the page renders a scannable QR plus an "Open UPI app" button.
  2. **Buy Me a Coffee** or **Ko-fi** for international visitors (they handle cards; check their current India payout options, usually PayPal or Stripe on their side).
  3. **GitHub Sponsors** for developers who like the repo.
  4. **PayPal.me** as a fallback (PayPal India can receive international payments; it stopped domestic India-to-India payments).
  - **Stripe directly:** not recommended now. It is invite-only in India and expects a registered business.
- 👉 Create the accounts and paste the links or UPI ID into `site.ts` or the environment variables.

## 10. Legal and trust
- ✅ Privacy policy, terms, about and contact pages.
- ✅ Disclaimers on tax, finance and exam pages ("estimates", "check the official notification").
- ✅ Trademark note: exam and app names are used descriptively; no logos of GPay, PhonePe etc.
- 👉 If revenue grows, consider registering as a sole proprietor or MSME (Udyam, free). It makes Stripe, bank and tax paperwork easier, and ad income is taxable business income in India (ITR-3/4).

## 11. Quality, monitoring and analytics
- ✅ Tests: `npm run test:unit` (finance formulas against known values) and `npm run test:e2e` (headless Chromium drives every tool with real files: PDFs, JPG/PNG/HEIC, MP4/MOV).
- ✅ Product analytics: privacy-first **PostHog** with AARRR events (visit → start → complete funnels, retention, presets, shares, errors, estimated ad revenue per tool) and a one-command script that builds the overall, category and per-tool dashboards. No autocapture, no recordings, no query strings, Do-Not-Track respected, opt-out on `/privacy-policy`. Details: `ANALYTICS.md`.
- ✅ Cloudflare Web Analytics (cookie-less) and optional GA4; events never include file names, contents or typed values.
- 👉 Optional: Sentry free tier for JS error reports from real devices.
- 👉 Test on a cheap 3–4 GB RAM Android phone and Safari on iPhone before big launches.

## 12. Accessibility and performance
- ✅ Labels on every input, keyboard-reachable controls, focus outlines, a skip link, dark mode, `prefers-color-scheme`, alt text, reduced layout shift.
- ✅ **One-click presets** on every tool ("⚡ One-click" chips such as *SSC photo*, *Compress to 200 KB*, *₹50 L home loan*) and deep links (`?preset=…`) you can share in exam and finance groups.
- ✅ PWA: installable, offline after the first visit (service worker caches hashed assets; pages are network-first so new deploys appear immediately).

## Things only you can do (summary)
1. Pick the final brand name and buy the domain.
2. Create the Cloudflare account and connect the GitHub repo (≈10 min).
3. Set `SITE_URL` (and later `ADSENSE_CLIENT`, `UPI_ID`, `POSTHOG_KEY`, `CF_ANALYTICS_TOKEN`).
4. Verify Search Console and Bing, and submit the sitemap.
5. Apply to AdSense; enable the consent message.
6. Create donation accounts (UPI ID, Buy Me a Coffee or Ko-fi, GitHub Sponsors).
7. Create a free PostHog account, add `POSTHOG_KEY`, then run `node scripts/posthog-dashboards.mjs` once (see `ANALYTICS.md`).
8. Merge this branch into `main` (or open a PR) so Cloudflare deploys it.
9. Share the launch (GitHub, Reddit, Product Hunt, exam Telegram groups).
