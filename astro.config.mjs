// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const SITE_URL = (process.env.SITE_URL || 'https://saralkit.com').replace(/\/$/, '');

export default defineConfig({
  site: SITE_URL,
  // Clean URLs like /compress-pdf (served from /compress-pdf.html or /compress-pdf/index.html).
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    sitemap({
      // noindex pages stay out of the sitemap.
      filter: (page) => !/\/(404|thank-you|search)$/.test(page),
      // hreflang alternates (xhtml:link) so Google finds and pairs every translated page quickly.
      i18n: { defaultLocale: 'en', locales: { en: 'en', hi: 'hi', bn: 'bn', mr: 'mr', te: 'te', ta: 'ta' } },
    }),
  ],
  vite: {
    build: {
      // pdf.js / libheif / LAME are lazy-loaded chunks; silence the size warning for them.
      chunkSizeWarningLimit: 4000,
    },
    worker: { format: 'es' },
    optimizeDeps: { exclude: ['heic-to'] },
  },
});
