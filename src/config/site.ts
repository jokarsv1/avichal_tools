/**
 * ONE place to configure the whole site.
 * Everything that differs between "my fork" and "your fork" lives here:
 * brand, domain, contact, ads, analytics and donation links.
 *
 * Values left empty ('') are simply switched off. The site works without any of them.
 */
export const SITE = {
  /** Brand shown in the header, titles and schema markup. */
  name: 'Avichal Tools',
  /** Short tagline used on the home page and in meta descriptions. */
  tagline: 'Free online tools that run in your browser. No login, no watermark, no upload.',
  /**
   * Production URL, without a trailing slash. Used for canonical URLs, the sitemap and Open Graph.
   * Override at build time with the SITE_URL environment variable (set it in the Cloudflare dashboard).
   */
  url: (process.env.SITE_URL || 'https://avichal-tools.pages.dev').replace(/\/$/, ''),
  /** Contact address shown in the footer, contact page and privacy policy. */
  email: 'jokars.v1@gmail.com',
  /** Public source code repository (open source = trust + backlinks). */
  github: 'https://github.com/jokarsv1/avichal_tools',
  /** Default language. Hindi pages can be added later with hreflang. */
  locale: 'en-IN',
  /** Theme colour for mobile browser UI and the PWA manifest. */
  themeColor: '#4f46e5',
};

/**
 * Google AdSense.
 * 1. Apply at https://adsense.google.com once the site has ~20+ indexed tool pages and the legal pages.
 * 2. Put your publisher id here (looks like "ca-pub-1234567890123456").
 * 3. Optional: create display ad units in AdSense and paste their slot ids below.
 *    If you leave the slot ids empty, the site uses AdSense Auto ads with the publisher id only.
 * 4. In AdSense > Privacy & messaging, turn on the Google-certified consent message (EEA/UK/CH) - no code needed.
 */
export const ADS = {
  /** e.g. 'ca-pub-1234567890123456'. Empty = no ads (good for development). */
  client: process.env.ADSENSE_CLIENT || '',
  slots: {
    /** Below the tool, where people wait for results. Responsive. */
    belowTool: process.env.ADSENSE_SLOT_BELOW_TOOL || '',
    /** Inside the article content, between the how-to and the FAQ. */
    inContent: process.env.ADSENSE_SLOT_IN_CONTENT || '',
    /** Desktop-only sticky sidebar (300x600 / 300x250). Highest RPM placement. */
    sidebar: process.env.ADSENSE_SLOT_SIDEBAR || '',
  },
  /** Show grey placeholder boxes in `npm run dev` so you can see where ads will appear. */
  showPlaceholdersInDev: true,
};

/**
 * Privacy-friendly analytics. Both optional.
 * Cloudflare Web Analytics: free, cookie-less, no consent banner needed. Dashboard > Analytics > Web Analytics > Add site.
 * GA4: only if you want AdSense <-> Analytics linking. Requires consent handling in the EEA/UK.
 */
export const ANALYTICS = {
  cloudflareToken: process.env.CF_ANALYTICS_TOKEN || '',
  ga4Id: process.env.GA4_ID || '',
};

/**
 * "Buy me a coffee" / donations. Any empty value is hidden.
 * Recommended for an individual in India (2026):
 *  - UPI for Indian visitors (zero fees, instant). Put your UPI VPA, e.g. 'yourname@okicici'.
 *  - Buy Me a Coffee or Ko-fi for international visitors (they handle cards; payout via PayPal/Stripe on their side).
 *  - GitHub Sponsors for developers who use the open-source repo.
 *  - PayPal.me as a simple fallback for international donors (PayPal India receives international payments only).
 * Stripe is invite-only in India and needs a registered business, so it is NOT used directly.
 */
export const DONATE = {
  upiId: process.env.UPI_ID || '',
  upiName: 'Avichal Tools',
  buyMeACoffee: '', // e.g. 'https://buymeacoffee.com/yourname'
  kofi: '', // e.g. 'https://ko-fi.com/yourname'
  githubSponsors: '', // e.g. 'https://github.com/sponsors/yourname'
  paypalMe: '', // e.g. 'https://paypal.me/yourname'
};
