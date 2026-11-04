# Strategy: what to build, in what order, and how it makes money

## 1. How tools are ranked

You asked to rank by **search volume × paywall annoyance × ease of doing it client-side**. Each factor is scored 1–5, so the maximum is 125.

| Factor | 1 | 3 | 5 |
|---|---|---|---|
| **V**: search volume (global + India, monthly) | < 50k | ~500k | > 3M |
| **P**: how annoying the current paywall/login/watermark is | free everywhere | daily limits, ads | pay at download, watermark, login wall |
| **E**: ease of doing it 100% in the browser | needs a server or 100 MB+ model | doable with WASM, some edge cases | trivial with browser APIs |

Two adjustments decide the **build order** for ad revenue. They don't change the score.

- **RPM tier**: what advertisers pay per 1,000 pageviews. Finance, loans, insurance, jobs and education keywords earn **2–5× more** than generic utilities. Developer tools earn the least, because many developers use ad blockers.
- **Competition**: big incumbents with high domain authority (iLovePDF, Smallpdf, Canva, Groww, ClearTax) make head terms slow to rank. Long-tail and India-specific terms ("compress photo to 20kb", "ibps photo size", "attendance calculator") are easier to win.

> Volumes are estimates from public keyword tools and experience, not paid data. After launch, **Google Search Console is your source of truth**: double down on pages that get impressions.

## 2. Ranked list (✅ = built in this repo, 🔜 = next)

| # | Tool | V | P | E | **Score** | RPM | Competition | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | QR code generator ("never expires") | 5 | 4 | 5 | **100** | Med | High | ✅ |
| 2 | Exam photo & signature resizer (SSC/IBPS/UPSC/NEET/PAN) | 4 | 4 | 5 | **80** | Med | Med (many tiny sites) | ✅ |
| 3 | Compress PDF | 5 | 4 | 4 | **80** | Med | High | ✅ |
| 4 | Sign PDF | 4 | 5 | 4 | **80** | High | Med | ✅ |
| 5 | Compress video (target MB, no watermark) | 4 | 5 | 4 | **80** | Med | Med | ✅ |
| 6 | Trim / cut video | 4 | 5 | 4 | **80** | Med | Med | ✅ |
| 7 | Resize image to exact KB (+ 7 "compress to N KB" pages) | 5 | 3 | 5 | **75** | Med | Med | ✅ |
| 8 | Merge PDF | 5 | 3 | 5 | **75** | Med | High | ✅ |
| 9 | JPG to PDF | 5 | 3 | 5 | **75** | Med | High | ✅ |
| 10 | **Edit PDF** (add text, white-out, shapes) | 5 | 5 | 3 | **75** | High | High | 🔜 #1 |
| 11 | **Background remover** | 5 | 5 | 3 | **75** | Med | High | 🔜 #2 |
| 12 | **Resume builder** (free PDF download) | 5 | 5 | 3 | **75** | **High** | High | 🔜 #3 |
| 13 | Screen recorder | 4 | 4 | 4 | **64** | Med | Med | ✅ |
| 14 | **Invoice / GST invoice generator** | 4 | 4 | 4 | **64** | **High** | Med | 🔜 #5 |
| 15 | Video to MP3 | 5 | 3 | 4 | **60** | Low | High | ✅ |
| 16 | HEIC to JPG | 4 | 3 | 5 | **60** | Med | Med | ✅ |
| 17 | PDF to JPG | 4 | 3 | 5 | **60** | Med | High | ✅ |
| 18 | Split PDF | 4 | 3 | 5 | **60** | Med | High | ✅ |
| 19 | Organize / delete PDF pages | 4 | 3 | 5 | **60** | Med | Med | ✅ |
| 20 | **Fill PDF form** | 3 | 5 | 4 | **60** | High | Med | 🔜 |
| 21 | Image compressor (bulk, TinyPNG-style PNG) | 5 | 2 | 5 | **50** | Med | High | ✅ |
| 22 | **Passport photo maker** (white background, print sheet) | 4 | 4 | 3 | **48** | Med | Med | 🔜 #4 |
| 23 | **Unlock / protect PDF** (qpdf WASM) | 4 | 4 | 3 | **48** | Med | Med | 🔜 |
| 24 | **Image to text (OCR)** | 4 | 3 | 4 | **48** | Med | High | 🔜 |
| 25 | **Video to GIF** | 3 | 4 | 4 | **48** | Low | Med | 🔜 |
| 26 | **MP3 cutter / ringtone maker** | 3 | 4 | 4 | **48** | Low | Med | 🔜 |
| 27 | Rotate PDF | 3 | 3 | 5 | **45** | Med | Med | ✅ |
| 28 | Add page numbers / watermark PDF | 3 | 3 | 5 | **45** | Med | Med | ✅ |
| 29 | UPI QR code generator | 3 | 3 | 5 | **45** | Med | **Low** | ✅ |
| 30 | **Rent receipt generator** (HRA, Jan–Mar peak) | 3 | 3 | 5 | **45** | **High** | **Low** | 🔜 |
| 31 | Income tax calculator, new vs old | 4 | 2 | 5 | **40** | **Very high** | High | ✅ |
| 32 | **Speech to text / auto subtitles** (Whisper) | 4 | 5 | 2 | **40** | Med | Med | later |
| 33 | PDF to Word | 5 | 4 | 2 | **40** | Med | High | later |
| 34 | Text to handwriting | 3 | 3 | 4 | **36** | Low | **Low** | ✅ |
| 35 | **Salary CTC → in-hand calculator** | 4 | 2 | 4 | **32** | **Very high** | Med | 🔜 #6 |
| 36 | **Home loan prepayment calculator** | 3 | 2 | 5 | **30** | **Very high** | Med | 🔜 |
| 37 | Word to PDF | 5 | 3 | 2 | **30** | Med | High | later |
| 38 | EMI calculator | 5 | 1 | 5 | **25** | **Very high** | High | ✅ |
| 39 | SIP calculator (step-up, lump sum) | 5 | 1 | 5 | **25** | **Very high** | High | ✅ |
| 40 | Age calculator (age as on exam date) | 5 | 1 | 5 | **25** | Low | High | ✅ |
| 41 | Percentage calculator | 5 | 1 | 5 | **25** | Low | High | ✅ |
| 42 | GST, FD, PPF calculators | 4 | 1 | 5 | **20** | **Very high** | High | ✅ |
| 43 | CGPA to percentage | 4 | 1 | 5 | **20** | Med | **Low** | ✅ |
| 44 | Word counter | 4 | 1 | 5 | **20** | Low | High | ✅ |
| 45 | Crop image (circle crop) | 4 | 1 | 5 | **20** | Low | High | ✅ |
| 46 | Attendance calculator (75% rule) | 3 | 1 | 5 | **15** | Low | **Low** | ✅ |
| 47 | Number to words (lakh/crore) | 3 | 1 | 5 | **15** | Med | Med | ✅ |
| 48 | Bank statement / CAS analyzer | 3 | 5 | 2 | **30** | **Very high** | **Low** | later (moat) |
| 49 | JSON formatter & dev tools | 4 | 1 | 5 | **20** | Very low | High | later (backlinks only) |

**Built now: 42 tools plus 13 long-tail landing pages (6 exam pages and 7 KB-size pages), 70 pages in total.**

## 3. Build order from here (Phase 2, roughly 4–6 weeks)

The order favours **shared engines** (the next tool reuses code you already have) and **high RPM**:

1. **Edit PDF** (add text, white-out, rectangles, highlight). The Sign PDF placement engine already does 80% of this. "Edit PDF" is one of the largest PDF keywords, and nearly every competitor paywalls it.
2. **Background remover.** Use Transformers.js (Apache-2.0) with a model whose licence allows commercial use: **MODNet (Apache-2.0)** for portraits, or **BiRefNet-lite (MIT)** for general images. ⚠️ **Avoid BRIA RMBG** (non-commercial licence) and **@imgly/background-removal** (AGPL). Host the model on Cloudflare R2 or the Hugging Face CDN, not in the build, because of the 25 MiB file limit.
3. **Resume builder.** Highest-RPM consumer tool (jobs). Keep it to 3–4 ATS-friendly templates, export a text PDF with pdf-lib, and save the draft in localStorage.
4. **Passport/visa photo maker.** Reuses #2 for the white background, adds a 4×6 print sheet with 8 photos. Strong India and global intent.
5. **GST invoice + rent receipt + salary slip generators.** One "document generator" engine (form → PDF) gives three high-RPM pages. Publish the rent receipt page **before January**, which is tax-proof submission season.
6. **Salary (CTC → in-hand), HRA and loan prepayment calculators.** Reuses the finance engine. Very high RPM; about a day of work each.
7. **OCR (image → text)** with Tesseract.js (Apache-2.0), plus Hindi language data.
8. **Unlock/protect PDF** with qpdf-wasm (Apache-2.0).
9. **Video → GIF and audio cutter**, reusing Mediabunny.
10. **Hindi versions** of the top 10 India pages (`/hi/...` with hreflang). This roughly doubles your India search surface with low competition.

## 4. What drives revenue, and the levers built into this code

**Revenue ≈ pageviews × RPM ÷ 1000.** Typical AdSense RPMs: India-heavy utility traffic **$0.3–1.5**, India finance **$1–4**, US/UK/EU utility **$3–10**. Treat these as rough industry ranges, not promises. 100k pageviews/month at a blended $1 RPM is about $100/month; 1M is about $1,000. Growth comes from more pages ranking, more pages per visit, and a better geo/topic mix.

| Lever | What's in the code |
|---|---|
| **Many indexable pages** | Every tool has its own URL, title, H1, FAQ and structured data. Programmatic pages are only created where intent is genuinely different (`/ssc-photo-resizer`, `/compress-image-to-20kb`). |
| **Low-competition India long tail** | 6 exam pages and 7 KB pages with real spec tables. Add more exams as you see impressions in Search Console (one entry in `src/data/exams.ts`). |
| **Global high-RPM keywords** | Compress video, screen recorder, HEIC to JPG, sign PDF and QR code carry English titles that work worldwide. |
| **Pages per session** | "Related tools" on every page, plus next-step links (JPG→PDF → Compress → Sign). Each extra pageview is another set of ad impressions. |
| **Time on page** | Video and PDF processing takes seconds to minutes. The below-tool ad slot sits where people wait. |
| **Shareable results** | Calculators write their inputs into the URL (`/emi-calculator?p=2500000&r=8.5&y=20`) with a Share button. WhatsApp shares bring free traffic and natural backlinks. |
| **Trust → return visits** | "Files never leave your device", no login, PWA install and offline support. Repeat visitors are free traffic. |
| **Unique features competitors lack** | Min-KB padding (fixes "file must be at least 20 KB"), DPI in the JPEG header (PAN portals), signature cleaning, static QR codes that never expire, income-tax break-even deductions. These are your differentiators in Reddit and forum posts. |
| **Core Web Vitals** | About 6 KB of JS loads up front per page; heavy engines load only when used; ads load after the page is idle; ad slots reserve their height (no layout shift). |
| **AI search visibility** | `/llms.txt`, FAQ schema and clear answers in the copy help ChatGPT/Perplexity/Google AI Overviews cite you. |

### Seasonality calendar (refresh these pages before each peak)
- **Jan–Mar:** income tax, rent receipt, HRA, investment proofs, PPF/ELSS (80C deadline).
- **Jun–Jul:** ITR filing (tax calculator), college admissions (CGPA, photo resizers).
- **Exam notification months:** SSC, IBPS (Aug–Oct), UPSC (Feb), NEET/JEE (Nov–Mar). Update `LAST_CHECKED` and specs in `src/data/exams.ts`.
- **Diwali/Oct–Nov:** GST/invoice tools for small businesses; home and car loan EMIs.

## 5. Competition notes (what we saw while researching)
- **Exam photo resizers:** dozens of small sites (many on `*.pages.dev`) with inconsistent specs. Win on **accuracy** (`LAST_CHECKED` dates, links to official sites), **min-KB padding**, **DPI**, **signature cleaning**, mobile UX and freshness.
- **PDF:** iLovePDF and Smallpdf dominate head terms. Win long-tail ("compress pdf to 200kb", "sign pdf without account") and through "no upload" privacy positioning, which matters for bank statements and ID documents.
- **Finance:** Groww, ET Money, ClearTax and bank sites rank for head terms. Win with shareable URLs, break-even insights, the year-wise tables people screenshot, Hindi pages, and niche calculators (prepayment, rent receipts).
- **QR:** the market is full of "dynamic QR" bait-and-switch (codes stop working after a trial). "Never expires, no tracking" is a real, marketable differentiator.

## 6. Later: optional paid or premium ideas that keep the core free
Ads plus donations is the plan. If you ever want more, these don't conflict with "free, no login":
- **Embeddable calculators** for finance and education blogs, with a "Powered by" link (backlinks + traffic).
- **Sponsored exam presets** from coaching institutes (clearly labelled).
- **A desktop/PWA "pro" bundle** of heavy AI models for offline use (one-time purchase, optional).
- **An affiliate block** on finance pages (credit-card or loan comparison). This is high RPM but needs careful compliance; add later.
