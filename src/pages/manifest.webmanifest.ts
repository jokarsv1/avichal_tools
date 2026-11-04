import type { APIRoute } from 'astro';
import { SITE } from '../config/site';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: `${SITE.name} – free tools that run in your browser`,
      short_name: SITE.name,
      description: 'PDF, image, video and finance tools. No login, no upload, works offline.',
      start_url: '/?source=pwa',
      scope: '/',
      display: 'standalone',
      background_color: '#f7f7fb',
      theme_color: SITE.themeColor,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      shortcuts: [
        { name: 'Compress PDF', url: '/compress-pdf' },
        { name: 'Resize image to KB', url: '/resize-image-to-kb' },
        { name: 'Exam photo resizer', url: '/exam-photo-resizer' },
        { name: 'EMI calculator', url: '/emi-calculator' },
      ],
    }, null, 2),
    { headers: { 'content-type': 'application/manifest+json' } },
  );
