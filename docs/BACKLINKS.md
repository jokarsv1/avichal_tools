# Getting found on Google: indexing, backlinks and launch posts

Everything on the site side is done: sitemap with language alternates, robots.txt, canonical URLs, hreflang, structured data, fast static pages and an SEO audit (`npm run seo:audit`). What is left is **time and links from other websites**. Nobody can do those from the code, so this page is your playbook.

## 1. Why you can't find the site yet (November 2026)

- The domain went live on 5–6 Nov 2026. Google has already indexed the home page, `/hi`, `/support`, `/compress-video`, `/merge-pdf`, `/emi-calculator`, `/quotation-generator`, `/cagr-calculator`, `/retirement-planner` and `/pdf-tools` (a `site:saralkit.com` search shows them).
- A brand-new domain gets a small crawl budget, so Google indexes a few pages a day. The other ~660 pages will follow over the next 2–6 weeks.
- **Brand + use case** searches ("saralkit emi calculator") start working once that page is indexed, usually within days of a "Request indexing".
- **Generic** searches ("emi calculator", "compress pdf") are dominated by sites with years of backlinks. Expect the long-tail pages first ("compress pdf to 200kb", "ssc photo resizer", "salary in germany vs india"), typically after 1–3 months, and head terms only after you have backlinks.
- "saralkit" is close to "saral", so for a while Google may treat it as a spelling variant. The home page now tells Google the alternate names ("Saral Kit", "saralkit.com"), and every link that says "SaralKit" teaches Google the brand.

## 2. Do this week (10 minutes a day)

**Google Search Console → URL inspection → paste the URL → Request indexing.** Google allows about 10 a day. Do these in this order:

1. `https://saralkit.com/compress-pdf`
2. `https://saralkit.com/resize-image-to-kb`
3. `https://saralkit.com/exam-photo-resizer`
4. `https://saralkit.com/ssc-photo-resizer`
5. `https://saralkit.com/compress-image-to-20kb`
6. `https://saralkit.com/income-tax-calculator`
7. `https://saralkit.com/sip-calculator`
8. `https://saralkit.com/jpg-to-pdf`
9. `https://saralkit.com/unlock-pdf`
10. `https://saralkit.com/aadhaar-pdf-password`

Next days: `/compress-pdf-to-200kb`, `/compress-pdf-to-100kb`, `/image-compressor`, `/salary-calculator`, `/home-loan-emi-calculator`, `/ppp-salary-calculator`, `/salary-in-usa-vs-india`, `/hi/compress-pdf`, `/hi/emi-calculator`, `/hi/ssc-photo-resizer`, then the category pages (`/pdf-tools`, `/image-tools`, `/finance-calculators`, `/exam-tools`).

After 7 days, open **Indexing → Pages** in Search Console. "Discovered – currently not indexed" is normal for a new site; it shrinks as links come in.

**Bing Webmaster Tools → URL submission:** paste the same list (Bing accepts many more per day). Bing also feeds DuckDuckGo, Yahoo and ChatGPT search. Cloudflare Crawler Hints (already on) pings Bing automatically whenever a page changes.

## 3. Backlinks: what works, best first

A backlink is a link from another website to yours. Google treats it as a vote. **Ten real links from relevant sites beat a thousand junk ones.**

### A. Free listings (one evening, do all of them)

| Where | What to do |
|---|---|
| **GitHub repo** (`jokarsv1/avichal_tools`) | Repo page → ⚙️ next to "About" → Website: `https://saralkit.com`; Topics: `pdf-tools`, `image-compressor`, `emi-calculator`, `india`, `webassembly`, `privacy`, `astro`, `open-source`. Optionally rename the repo to `saralkit` (Settings → General). |
| **Astro showcase** (astro.build/showcase) | Submit the site. Astro's showcase links to sites built with Astro. |
| **AlternativeTo** (alternativeto.net) | Add "SaralKit" as a web app, then "Suggest as alternative" to iLovePDF, Smallpdf, TinyPNG, iLoveIMG, PDF24 and Remove.bg. People browse these pages exactly when they're looking for a free alternative. |
| **Product Hunt** | Launch on a Tuesday–Thursday (texts below). Use the screenshots in `docs/screenshots/`. |
| **SaaSHub, Indie Hackers (product page), BetaList** | Same short and long descriptions as below. |
| **Awesome lists on GitHub** | Open a pull request adding SaralKit to lists about privacy-friendly tools, WebAssembly apps and Astro sites. Read each list's contribution rules first. |

### B. Answer real questions (ongoing, highest-quality traffic in India)

- **Quora:** search for "reduce photo size to 20 kb", "ssc photo size", "compress pdf to 200kb", "how to calculate emi", "aadhaar pdf password". Write a genuinely helpful answer (the steps, the exact sizes), then link the matching page. One good answer can send visitors for years.
- **Reddit:** only where the rules allow self-promotion (read each subreddit's rules first). Good fits: r/SideProject, r/InternetIsBeautiful, the weekly showcase or self-promotion threads in Indian tech and student communities. Answer questions first, link second.
- **YouTube Shorts / Instagram Reels:** a 20-second screen recording, "Resize photo for SSC form to 20–50 KB in 10 seconds", with the link in the description. Exam and form tools spread this way in India.
- **Telegram and WhatsApp exam groups:** share the exam photo resizer during form season (SSC, IBPS, NEET, JEE application windows).

### C. Embeddable calculators (built in, for finance and education bloggers)

Every calculator page has an **"Add this calculator to your website"** box at the bottom of its guide with a copy-paste embed code. The code shows the calculator in an iframe on their site, and a normal text link back to SaralKit **underneath** it, which is the backlink. Ads are never shown inside embeds (AdSense doesn't allow it), so bloggers can use it freely.

Write to 10–20 personal-finance, loan, tax and exam-prep blogs (email template below). Many bloggers want a working calculator on their posts and can't build one.

### D. Write about how it's built (developers link to this)

A post on dev.to, Hashnode or Medium, "I built 83 free tools that run entirely in the browser (no uploads)", covering WebAssembly (qpdf, libheif), WebCodecs video compression, on-device OCR and background removal, and hosting 674 pages for free on Cloudflare. Then submit it to Hacker News as "Show HN" (text below). Technical posts get linked from newsletters and other blogs.

### Never do these (they get sites penalised)

- Buying links, "1000 backlinks for ₹500" gigs, private blog networks.
- Link exchanges at scale ("I'll link you if you link me").
- Spamming comments, forums or Wikipedia with links.
- Submitting to hundreds of low-quality directories.

## 4. Ready-to-paste texts

**Name:** SaralKit

**Tagline (60 characters):** Free PDF, image and money tools. No login, no upload.

**Short description (about 160 characters):**
> 83 free tools that run in your browser: compress PDF, resize photos to exact KB for exam forms, EMI, SIP and tax calculators. No sign-up, files never leave your device.

**Long description:**
> SaralKit is a free, open-source collection of 83 everyday tools for India: compress, merge, edit, sign and unlock PDFs; resize photos and signatures to the exact KB size SSC, IBPS, UPSC, NEET and PAN forms ask for; compress videos for WhatsApp; and calculate EMI, SIP, income tax, salary, PPF and retirement. Everything runs on your own device using WebAssembly, so files are never uploaded, there are no daily limits or watermarks, and there's no account to create. Available in English, Hindi, Bengali, Marathi, Telugu and Tamil.

**Show HN title:** Show HN: SaralKit – 83 free tools that run entirely in your browser (no uploads)

**Show HN text:**
> I got tired of "free" PDF and image sites that upload your files, then ask for money after two uses. SaralKit does the work in the browser instead: qpdf and pdf-lib (WebAssembly) for PDFs, WebCodecs for video, Tesseract for OCR, a MediaPipe model for background removal. Nothing is uploaded, so there are no limits and no server costs. It's a static Astro site on Cloudflare's free plan (674 pages, 6 languages), MIT licensed. The India-specific bits: exam photo resizer with official SSC/IBPS/UPSC sizes, e-Aadhaar PDF unlock, GST invoice and EMI calculators. Feedback welcome, especially on what breaks on low-end Android phones.

**Product Hunt first comment:**
> Hi! SaralKit started from a simple annoyance: every exam form in India wants your photo at "20–50 KB, 200×230 px", and every site that does it either uploads your photo or watermarks it. So I built tools that run on your own phone instead. 83 of them now, from PDF compress/edit/sign to EMI, SIP and income tax calculators, in 6 Indian languages. Free forever, no account, no data stored. What should I build next?

**Reddit post:**
> **I made a set of free tools that run in your browser, with no uploads or sign-up**
> Compress/merge/sign PDFs, resize photos to exact KB for SSC/IBPS/NEET forms, unlock e-Aadhaar PDFs, plus EMI, SIP and income tax calculators. Your files never leave your phone, so there are no limits or watermarks. It's open source. Would love feedback on what's missing: https://saralkit.com

**Email to bloggers (embed outreach):**
> Subject: A free EMI calculator for your loan articles
>
> Hi [name],
>
> I enjoyed your post on [topic]. I run SaralKit, a free, ad-free-when-embedded set of calculators (EMI with prepayment, SIP, income tax, PPF and more). If it's useful, you can embed any of them in your articles with one line of code. No sign-up, and it works on WordPress and Blogger: [link to the calculator, e.g. https://saralkit.com/emi-calculator, scroll to "Add this calculator to your website"].
>
> It's free and will stay free. Happy to make a version with your preferred defaults if that helps.
>
> Thanks,
> SaralKit

**Quora answer pattern:**
> The SSC photo must be 20–50 KB, 100×120 px … (give the full, correct answer first). The easiest way: open [saralkit.com/ssc-photo-resizer](https://saralkit.com/ssc-photo-resizer), pick your photo and it resizes to the exact size on your phone, without uploading it anywhere.

## 5. Track progress

- **Search Console → Performance:** impressions come first (Google is testing your pages), clicks follow. Filter by page to see which tools are picking up.
- **Search Console → Links:** your backlinks appear here after a few weeks.
- **PostHog / Cloudflare Web Analytics → Referrers:** which listings and posts actually send visitors. Do more of what works.
