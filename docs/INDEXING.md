# Every website to get SaralKit indexed and listed on

Tick the boxes as you go. ⭐⭐⭐ = must do, ⭐⭐ = worth it, ⭐ = optional.
Ready-to-paste descriptions for every listing are in [`BACKLINKS.md`](BACKLINKS.md#4-ready-to-paste-texts).

> ### ⏳ Still pending on you: AdSense (3 steps, noted 12 Nov 2026)
> 1. [ ] **adsense.google.com → Sites → saralkit.com → Request review.** Then **Payments → Payments info**: add your name, address and bank details.
> 2. [ ] **Privacy & messaging → European regulations → Create message** (Google's free consent banner, no code needed). Also create the **US state regulations** message.
> 3. [ ] **After approval: Ads → By site → saralkit.com → turn on Auto ads.** Keep anchor ads on; leave vignette (full-screen) ads off at first.
>
> Optional later: create 3 display ad units and put their IDs into Cloudflare → Worker → Settings → Variables (`ADSENSE_SLOT_BELOW_TOOL`, `ADSENSE_SLOT_IN_CONTENT`, `ADSENSE_SLOT_SIDEBAR`), then **Retry build**.

---

## 1. Search engines

| ✓ | Search engine | What it covers | What to do |
|---|---|---|---|
| [x] | ⭐⭐⭐ **Google Search Console**<br>search.google.com/search-console | Google Search, Images, Discover, AI Overviews | Verified, and the sitemap was submitted. **Keep doing:** URL inspection → paste a URL → **Request indexing**, 10 a day (list in `BACKLINKS.md` §2). Check **Indexing → Pages** once a week. |
| [ ] | ⭐⭐⭐ **Bing Webmaster Tools**<br>bing.com/webmasters | Bing, Yahoo, DuckDuckGo, Ecosia, Microsoft Copilot, and the Bing index that ChatGPT search also uses | If not done: **Add site → Import from Google Search Console** (one click). Then **Sitemaps**: check that `https://saralkit.com/sitemap-index.xml` is listed. Then **URL Submission**: paste your top 20 URLs (Bing allows many per day). |
| [x] | ⭐⭐⭐ **IndexNow** | Bing, Yandex, Seznam, Naver | Already automatic: Cloudflare **Crawler Hints** pings them whenever a page changes. Nothing to do. |
| [ ] | ⭐ **Yandex Webmaster**<br>webmaster.yandex.com | Yandex (Russia, some Asia) | Optional, low traffic for India. **Add site → choose the DNS verification → add the TXT record in Cloudflare DNS → Verify → Indexing → Sitemap files → add the sitemap URL.** |
| – | **Brave Search** | Brave browser users | No submission tool. Brave finds sites through links and its own crawler, so the listings below cover it. |
| – | **DuckDuckGo, Yahoo, Ecosia, Startpage** | | No submission; they use Bing's and Google's results. |
| – | **Apple (Siri, Spotlight, Safari suggestions)** | iPhone and Mac users | No submission; Applebot crawls, and robots.txt allows it. |
| – | **AI search: ChatGPT, Perplexity, Gemini, Claude, Copilot** | People asking AI assistants for tools | No submission. robots.txt allows their crawlers and `/llms.txt` describes every tool for them. Being listed on the sites below helps them recommend SaralKit. |
| – | **Baidu, Naver, Seznam** | China, Korea, Czech Republic | Skip; no Indian audience. |

## 2. Check your reputation (5 minutes, once)

New domains are sometimes flagged by mistake. Check each one shows "safe" or "no unsafe content":

- [ ] **Google Safe Browsing:** transparencyreport.google.com/safe-browsing/search?url=saralkit.com
- [ ] **Norton Safe Web:** safeweb.norton.com → search `saralkit.com`. "Untested" is normal for a new site.
- [ ] **Search Console → Security & Manual Actions:** both should say "No issues detected".

If a visitor ever reports "site blocked by antivirus or office firewall", tell me which product, and I'll find that vendor's review form.

## 3. Free listings (backlinks and visitors), in this order

| ✓ | Where | Cost | Notes |
|---|---|---|---|
| [ ] | ⭐⭐⭐ **GitHub repo**: github.com/jokarsv1/avichal_tools → ⚙️ next to **About** | Free | Website: `https://saralkit.com`. Topics: `pdf-tools`, `image-compressor`, `emi-calculator`, `india`, `webassembly`, `privacy`, `astro`, `open-source`. Optional: rename the repo to `saralkit` (Settings → General). |
| [ ] | ⭐⭐⭐ **Product Hunt**: producthunt.com | Free | Schedule a launch (Tue–Thu) up to a month ahead. Screenshots are in `docs/screenshots/`. |
| [ ] | ⭐⭐⭐ **Hacker News "Show HN"**: news.ycombinator.com/submit | Free | Works best for "try it now, no sign-up" products like this. Don't ask friends to upvote (it's against the rules). |
| [ ] | ⭐⭐⭐ **AlternativeTo**: alternativeto.net | Free (optional $5 faster review) | Add SaralKit as a web app, then "Suggest as alternative" to iLovePDF, Smallpdf, TinyPNG, iLoveIMG, PDF24 and Remove.bg. The free review can take months, so submit early. |
| [ ] | ⭐⭐ **SaaSHub**: saashub.com | Free | Approval queue. Listing the alternatives (iLovePDF, Smallpdf…) moves you up. |
| [ ] | ⭐⭐ **OpenAlternative**: openalternative.co | Free to submit | Curated open-source alternatives. Fits because SaralKit is MIT-licensed. |
| [ ] | ⭐⭐ **Peerlist Launchpad**: peerlist.io/launchpad | Free | Needs a verified personal Peerlist profile; launches open every Monday. Strong Indian developer audience. |
| [ ] | ⭐⭐ **Indie Hackers**: indiehackers.com | Free | Product page plus a "how I built it" post. |
| [ ] | ⭐⭐ **dev.to or Hashnode** | Free | Technical post: "I built 88 browser-only tools with WebAssembly". |
| [ ] | ⭐⭐ **Reddit**: r/SideProject, r/InternetIsBeautiful, the showcase threads of Indian tech and student communities | Free | Read each community's self-promotion rules first. |
| [ ] | ⭐ **Uneed**: uneed.best | Free queue (date assigned, can be months away) | Optional paid fast-track; not needed. |
| [ ] | ⭐ **Microlaunch**: microlaunch.net | Free regular launch | |
| [ ] | ⭐ **Astro showcase**: astro.build/showcase | Free | For sites built with Astro (this one is). |

**Skip these:** BetaList (no longer free), Fazier's free tier (needs their badge on your homepage, which adds clutter), "submit to 1,000 directories" services and paid link packages (Google penalises them).

## 4. Claim "SaralKit" on social sites

Brand searches then show your profiles, and each profile links back to the site. Use the same name and logo everywhere (`public/icon-512.png`):

- [ ] X / Twitter `@saralkit`
- [ ] Instagram `saralkit`: post 20-second Reels like "SSC photo 20–50 KB in 10 seconds"
- [ ] YouTube channel "SaralKit": the same videos as Shorts; put the tool link in each description
- [ ] Facebook page
- [ ] LinkedIn company page
- [ ] Pinterest: one pin per useful fact (exam photo sizes, PDF size limits, YouTube image sizes)
- [ ] Telegram channel and WhatsApp channel: post the right tool when exam forms open
- [ ] Quora profile: answer questions, linking the exact tool

**Then send me the profile links.** I'll add them to the site's structured data (`sameAs`) so Google connects them to SaralKit.

## 5. Weekly 15-minute routine

1. Search Console: request indexing for 10 more URLs; glance at **Performance** (which searches show you).
2. Answer 2–3 Quora or Reddit questions with the exact tool link.
3. Share one tool in a group where people need it that week (exam form deadlines, ITR season, Budget day).
4. Check where visitors come from (Cloudflare Web Analytics / PostHog → referrers) and do more of what works.
