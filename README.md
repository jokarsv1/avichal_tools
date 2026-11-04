# Avichal Tools

**Free, open-source tools that run 100% in your browser. No login, no upload, no watermark.**

PDF, image, video, exam-form and finance tools. Your files never leave your device: everything is processed locally with WebAssembly and WebCodecs, so there are no servers to pay for, no limits, and nothing to leak.

## What's inside (49 tools + 13 landing pages)

| Category | Tools |
|---|---|
| **PDF** | Compress (smart image recompression or pages-to-images), Merge, Split, JPG→PDF, PDF→JPG, Rotate, Organize (reorder/delete), Page numbers, Watermark (any language), **Sign PDF**, **Edit PDF** (text, white-out, highlight, true redaction) |
| **Image** | **Resize to exact KB** (min + max, DPI, padding), Compressor (TinyPNG-style PNG), Resizer (presets), Crop (circle), HEIC→JPG, PNG↔JPG, WebP→JPG, Converter |
| **Exam & Govt** | Exam photo & signature resizer with presets for **SSC, IBPS/SBI, UPSC, NEET, JEE Main, PAN**, signature cleaner, `/compress-image-to-{10,20,30,50,100,200,500}kb` |
| **Video** | **Compress** (quality or target MB), Trim, Video→MP3/M4A/WAV, MOV/MKV/WebM→MP4, Mute, **Screen recorder** |
| **Finance** | EMI (amortization), SIP (step-up + lump sum), **Income tax FY 2026-27 new vs old** (87A marginal relief, surcharge relief, break-even deductions), **Salary CTC → in-hand**, HRA, Loan prepayment, GST 2.0, FD, PPF, **GST invoice generator** (UPI QR), **Rent receipt generator** |
| **Student** | Attendance (75% rule), CGPA→percentage, Text→handwriting (Hindi support) |
| **Everyday** | QR code generator (static, never expires, logo), UPI QR poster, Word counter, Age calculator (age as on exam date), Percentage, Number→words (lakh/crore) |

## Tech
- **[Astro](https://astro.build)** static site: every tool is its own SEO-friendly HTML page; about 6 KB of JS loads up front per page.
- **pdf-lib** (edit PDFs) + **pdf.js** (render PDFs), **Mediabunny** + WebCodecs (video/audio, hardware-accelerated, no ffmpeg.wasm), **libheif** (HEIC), **qrcode**, **UPNG**, **fflate**.
- No framework runtime, no backend, no database. Deploys to **Cloudflare** for free.

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
`SITE_URL`, `ADSENSE_CLIENT`, `ADSENSE_SLOT_*`, `CF_ANALYTICS_TOKEN`, `GA4_ID`, `UPI_ID`, plus donation links.

## Docs
- 📈 [`docs/STRATEGY.md`](docs/STRATEGY.md): the ranked tool list (volume × paywall pain × ease), build order and revenue levers.
- ☁️ [`docs/DEPLOY-CLOUDFLARE.md`](docs/DEPLOY-CLOUDFLARE.md): step-by-step deploy, custom domain, Search Console, AdSense.
- ✅ [`docs/CHECKLIST.md`](docs/CHECKLIST.md): SEO, hosting, database, APIs, ads, licences, donations, legal, and what only you can do.
- 🧩 [`docs/ADDING-A-TOOL.md`](docs/ADDING-A-TOOL.md): add a new tool in about 30 minutes.

## Project structure
```
src/
  config/site.ts        brand, URL, contact, ads, analytics, donations
  data/tools.ts         registry of all tools (nav, home, hubs, sitemap, related tools)
  data/exams.ts         exam photo/signature specs + KB landing pages
  layouts/              Base (head/SEO/header/footer), ToolLayout (schema, FAQ, ads), Page
  components/           Dropzone, AdSlot, KbResizer, BatchImage, VideoTool, PageEditor, SliderField…
  lib/                  ui, image, pdf, media, finance, format, charts, qr helpers
  tools/                client-side logic per tool (lazy-loaded)
  pages/                one .astro file per URL (+ [exam]-photo-resizer, compress-image-to-[kb]kb, [hub])
public/                 _headers, _redirects, sw.js, icons, og.png
tests/                  unit + e2e (Playwright) tests and fixtures
```

## Contributing
Bug reports and tool requests: open an issue or email **jokars.v1@gmail.com**. Please never attach private documents; describe them instead.

## License
[MIT](LICENSE). Third-party licences: [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
