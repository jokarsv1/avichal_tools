# Avichal Tools

**Free, open-source tools that run 100% in your browser. No login, no upload, no watermark.**

PDF, image, video, exam-form and finance tools. Your files never leave your device: everything is processed locally with WebAssembly and WebCodecs, so there are no servers to pay for, no limits, and nothing to leak.

## What's inside (73 tools, 131 pages)

Every tool shows the promise up front (**🆓 free forever · 👤 no account, ever · 🔒 no data stored**) and offers **⚡ one-click presets** for the most common jobs.

| Category | Tools |
|---|---|
| **PDF** (11) | Compress (smart image recompression or pages-to-images), Merge, Split, JPG→PDF, PDF→JPG, Rotate, Organize (reorder/delete), Page numbers, Watermark (any language), **Sign PDF**, **Edit PDF** (text, white-out, highlight, true redaction) |
| **Image** (11) | **Resize to exact KB** (min + max, DPI, padding), Compressor (TinyPNG-style PNG), Resizer, Crop (circle), HEIC→JPG, PNG↔JPG, WebP→JPG, Converter, **Background remover** (on-device AI), **Image to text / OCR** (English + Hindi) |
| **Exam & Govt** (3 + 13 pages) | Exam photo & signature resizer with presets for **SSC, IBPS/SBI, UPSC, NEET, JEE Main, PAN**, signature cleaner, **Passport photo maker** (white background, 4×6 print sheet), `/compress-image-to-{10…500}kb` pages |
| **Video** (8) | **Compress** (quality or target MB), Trim, Video→MP3/M4A/WAV, MOV/MKV/WebM→MP4, Mute, **Screen recorder**, **Video→GIF**, **MP3 cutter & ringtone maker** |
| **Finance** (21 + 6 loan pages) | EMI (with a "what if you prepay?" panel), **Loan prepayment** (tenure saved vs EMI saved), Loan eligibility, Balance transfer, Compare loan offers, Home/car/personal/education/bike/gold loan EMI pages, SIP (step-up), Lumpsum, SWP, RD, FD, PPF, CAGR, EPF, Sukanya Samriddhi, Gratuity, **Income tax FY 2026-27 new vs old**, **Salary CTC → in-hand**, HRA, GST 2.0, **GST invoice generator**, **Rent receipt generator** |
| **Abroad** (4 + 23 pages) | **Salary abroad vs India** (tax, living costs by lifestyle and family size, savings in ₹ at live rates, PPP, equivalent Indian CTC) with 12 country pages, Salary to ask for abroad, Live currency converter with 11 pair pages, **Time zone converter & meeting planner** |
| **Student** (4) | Attendance (75% rule), CGPA→percentage, Text→handwriting (Hindi support), **Resume builder** (ATS-friendly PDF) |
| **Everyday** (11) | QR code generator (static, never expires, logo), UPI QR poster, Word counter, Age calculator, Percentage, Number→words (lakh/crore), **Unit converter** (gaj, bigha, marla, cent, guntha), BMI (Indian cut-offs), Days between dates, Password generator, JSON formatter |

## Tech
- **[Astro](https://astro.build)** static site: every tool is its own SEO-friendly HTML page; about 6 KB of JS loads up front per page.
- **pdf-lib** (edit PDFs) + **pdf.js** (render PDFs), **Mediabunny** + WebCodecs (video/audio, hardware-accelerated, no ffmpeg.wasm), **libheif** (HEIC), **Tesseract.js** (OCR), **MediaPipe** selfie segmentation (background removal), **qrcode**, **gifenc**, **UPNG**, **fflate**.
- No framework runtime, no backend, no database. Deploys to **Cloudflare** for free.
- Optional privacy-first **PostHog** analytics with ready-made AARRR dashboards (overall, per category, per tool).

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:4321. Ad placeholders are visible in dev.

```bash
npm run build && npm run preview
```

### Tests

```bash
npm run test:unit
```

```bash
npm run build && npm run test:e2e
```

The e2e suite serves `dist/` and drives every tool in headless Chromium with real PDFs, photos, HEIC and MP4/MOV files (fixtures: `node tests/make-fixtures.mjs` plus ffmpeg; see `tests/`).

## Configure
Everything brand- or money-related lives in **`src/config/site.ts`** (or environment variables at build time):
`SITE_URL`, `ADSENSE_CLIENT`, `ADSENSE_SLOT_*`, `POSTHOG_KEY`, `POSTHOG_HOST`, `EST_ECPM_USD`, `CF_ANALYTICS_TOKEN`, `GA4_ID`, `UPI_ID`, plus donation links.

## Docs
- 📈 [`docs/STRATEGY.md`](docs/STRATEGY.md): the ranked tool list (volume × paywall pain × ease), build order and revenue levers.
- ☁️ [`docs/DEPLOY-CLOUDFLARE.md`](docs/DEPLOY-CLOUDFLARE.md): step-by-step deploy, custom domain, Search Console, AdSense.
- ✅ [`docs/CHECKLIST.md`](docs/CHECKLIST.md): SEO, hosting, database, APIs, ads, licences, donations, legal, and what only you can do.
- 📊 [`docs/ANALYTICS.md`](docs/ANALYTICS.md): PostHog setup, one-command dashboards, metric definitions and a weekly review routine.
- 🧩 [`docs/ADDING-A-TOOL.md`](docs/ADDING-A-TOOL.md): add a new tool in about 30 minutes.

## Project structure
```
src/
  config/site.ts        brand, URL, contact, ads, analytics, donations
  data/tools.ts         registry of all tools (nav, home, hubs, sitemap, related tools)
  data/exams.ts         exam photo/signature specs + KB landing pages
  layouts/              Base (head/SEO/header/footer), ToolLayout (schema, FAQ, ads), Page
  components/           Dropzone, AdSlot, KbResizer, BatchImage, VideoTool, PageEditor, SliderField…
  lib/                  ui, image, pdf, media, finance, abroad, analytics, format, charts, qr helpers
  tools/                client-side logic per tool (lazy-loaded)
  pages/                one .astro file per URL (+ [exam]-photo-resizer, compress-image-to-[kb]kb,
                        [loan]-loan-emi-calculator, salary-in-[country]-vs-india, [pair], [hub])
scripts/                asset copy, icon generation, PostHog dashboard builder
public/                 _headers, _redirects, sw.js, icons, og.png
tests/                  unit + e2e (Playwright) tests and fixtures
```

## Contributing
Bug reports and tool requests: open an issue or email **jokars.v1@gmail.com**. Please never attach private documents; describe them instead.

## License
[MIT](LICENSE). Third-party licences: [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
