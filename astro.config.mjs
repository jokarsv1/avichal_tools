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
      filter: (page) => !/\/(404|thank-you)$/.test(page),
      changefreq: 'weekly',
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
