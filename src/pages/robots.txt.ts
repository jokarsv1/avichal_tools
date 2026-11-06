import type { APIRoute } from 'astro';
import { SITE } from '../config/site';

export const GET: APIRoute = () =>
  new Response(`# ${SITE.name}: every tool page is open to all search engines and AI crawlers.\nUser-agent: *\nAllow: /\n# Internal search results are thin duplicate pages.\nDisallow: /search$\nDisallow: /search?\n\nSitemap: ${SITE.url}/sitemap-index.xml\n`, { headers: { 'content-type': 'text/plain' } });
