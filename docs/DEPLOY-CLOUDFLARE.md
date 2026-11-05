# Deploying to Cloudflare (free, commercial use allowed)

The site is **100% static** (Astro builds plain HTML/JS/CSS into `dist/`). There's no server, so it runs on Cloudflare's free plan. On Workers with static assets, static requests are free and unlimited.

> Why Cloudflare, not Vercel: Vercel's free Hobby plan is for non-commercial use only, and ads count as commercial. Cloudflare's free plan allows commercial sites. Cloudflare now recommends **Workers (static assets)** for new projects; Pages still works if you prefer it (Option C).

Config already in the repo:
- `wrangler.jsonc`: Worker name, `assets.directory = ./dist`, a real 404 page, and no trailing slashes.
- `public/_headers`: security and caching headers (immutable caching for hashed assets).
- `public/_redirects`: 301s for common alternate URLs (`/pdf-compressor` → `/compress-pdf`).

---

## Option A: Connect GitHub, auto-deploy on every push (recommended)

1. **Create a free Cloudflare account** at <https://dash.cloudflare.com/sign-up>.
2. Open **Workers & Pages → Create application → Import a repository** (the wording may be "Connect to Git").
3. Authorise GitHub and pick **`jokarsv1/avichal_tools`**.
4. Build settings:
   - **Project / Worker name:** use exactly the `name` in `wrangler.jsonc` (currently `avichal-tools`). Builds fail if the two differ (newer Wrangler versions can override it automatically, but matching is safest).
   - **Production branch:** `main`.
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy` (the default)
   - **Root directory:** `/` (leave empty)
5. **Environment variables** (Settings → Build → Variables). These are read at *build* time:

   | Variable | Example | Needed? |
   |---|---|---|
   | `SITE_URL` | `https://yourdomain.com` | **Yes.** Used for canonical URLs and the sitemap. Until you buy a domain, use the `*.workers.dev` URL shown after the first deploy. |
   | `NODE_VERSION` | `22` | Recommended |
   | `ADSENSE_CLIENT` | `ca-pub-1234567890123456` | After AdSense approval |
   | `ADSENSE_SLOT_BELOW_TOOL`, `ADSENSE_SLOT_IN_CONTENT`, `ADSENSE_SLOT_SIDEBAR` | `1234567890` | Optional (otherwise Auto ads) |
   | `CF_ANALYTICS_TOKEN` | from Web Analytics | Optional |
   | `UPI_ID` | `yourname@okicici` | Optional, shows the UPI donate QR |
   | `POSTHOG_KEY` | `phc_…` | Optional. Turns on the AARRR analytics and dashboards (see `ANALYTICS.md`). Without it, PostHog is never loaded. |
   | `POSTHOG_HOST` | `https://us.i.posthog.com` or `https://eu.i.posthog.com` | Only with `POSTHOG_KEY` (match your PostHog region) |
   | `EST_ECPM_USD` | `0.8` | Optional. Your AdSense eCPM, used for the estimated-revenue-by-tool charts |
   | `GA4_ID` | `G-XXXXXXX` | Optional, only if you also want Google Analytics |

6. Press **Deploy**. The first build takes about 1–2 minutes and gives you a URL like `https://avichal-tools.<your-subdomain>.workers.dev`.
7. Set `SITE_URL` to that URL (or your custom domain later) and **redeploy**, so canonical URLs and the sitemap point to the right place.

From now on, **every `git push` to `main` redeploys automatically**. Pushes to other branches can produce preview URLs if you enable non-production branch builds.

## Option B: Deploy from your laptop with one command

```bash
npm ci
```

```bash
npx wrangler login
```

```bash
SITE_URL=https://yourdomain.com npm run deploy
```

`npm run deploy` runs `astro build` and then `wrangler deploy`.

## Option C: Cloudflare Pages (the classic way)

Workers & Pages → Create → **Pages** → Connect to Git → framework preset **Astro**, build command `npm run build`, output directory `dist`, plus the same environment variables. `_headers` and `_redirects` work on Pages too.

---

## Custom domain (do this before applying to AdSense)

1. **Buy a domain.** Cloudflare Registrar sells `.com` at cost (about US$10/year, no markup). For `.in`, use another registrar and point its nameservers to Cloudflare.
2. **Pick a brandable name** that isn't close to iLovePDF/Smallpdf (trademark risk). Short and easy to say in Hindi and English.
3. In Cloudflare: **Workers & Pages → your worker → Settings → Domains & Routes → Add → Custom domain** → `yourdomain.com` (and `www.yourdomain.com`).
4. Redirect `www` → apex (or the other way) with a Redirect Rule so only one version is indexed.
5. Set `SITE_URL=https://yourdomain.com` and redeploy.
6. Change the brand in **`src/config/site.ts`** (`name`, `email`, `github`), then run `node scripts/generate-images.mjs` to regenerate the icons and social image.

## After the first deploy: 15-minute checklist

- [ ] **Google Search Console** → Add property → *Domain* → verify with a DNS TXT record (one click when DNS is on Cloudflare) → submit `https://yourdomain.com/sitemap-index.xml`.
- [ ] **Bing Webmaster Tools** → import from Search Console. Bing also powers DuckDuckGo, Yahoo and ChatGPT search.
- [ ] Cloudflare → **Caching → Configuration → Crawler Hints: On**. This pings IndexNow (Bing/Yandex) when pages change.
- [ ] Cloudflare → **Analytics & Logs → Web Analytics → Add site** (free, cookie-less). Either enable automatic setup, or copy the token into `CF_ANALYTICS_TOKEN`.
- [ ] Cloudflare → **SSL/TLS → Always Use HTTPS: On**; **Speed → Optimization**: leave Rocket Loader **off** (it can break lazy-loaded tool scripts).
- [ ] Open `https://yourdomain.com/robots.txt`, `/sitemap-index.xml`, `/ads.txt` and `/llms.txt` to check they load.
- [ ] Test 3 tools on a real low-end Android phone (Chrome) and an iPhone (Safari).

## Google AdSense setup

1. Wait until you have the custom domain, about 20+ indexed pages and the legal pages (already built: `/privacy-policy`, `/terms`, `/about`, `/contact`). Some traffic helps.
2. Apply at <https://adsense.google.com> with your domain.
3. Put your publisher id in `ADSENSE_CLIENT` and redeploy. This turns on the AdSense script and **`/ads.txt` generates itself** from it.
4. After approval, create 3 **Display ad units** (responsive) and copy their slot ids into `ADSENSE_SLOT_BELOW_TOOL`, `ADSENSE_SLOT_IN_CONTENT` and `ADSENSE_SLOT_SIDEBAR`. Without slot ids the site uses **Auto ads**.
5. AdSense → **Privacy & messaging → European regulations → create a GDPR message** (Google-certified CMP, free, no code). Also turn on the **US state regulations** message.
6. Ad placement rules this code already follows: ads are labelled "Advertisement", never sit next to upload/download buttons, never look like buttons, and reserve their height so the layout doesn't jump.

## Limits to know

| Limit (free plan) | Value | This site |
|---|---|---|
| Max size of one file | 25 MiB | Largest is about 3 MB (HEIC decoder) |
| Files per deployment | 20,000 | About 350 |
| Static asset requests | Free, unlimited | Everything is static |
| Builds (Workers Builds) | Limited build minutes per month | About 1 minute per build |

AI models for future tools (background removal, Whisper) are larger than 25 MiB. Host them on **Cloudflare R2** (free 10 GB, no egress fees) or load them from the Hugging Face CDN.

## Important: don't add COOP/COEP headers

Some tutorials for ffmpeg.wasm tell you to add `Cross-Origin-Embedder-Policy: require-corp`. **Don't.** It breaks AdSense iframes. This project's video tools use **WebCodecs** (via Mediabunny), which doesn't need those headers.
