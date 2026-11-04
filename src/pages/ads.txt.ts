import type { APIRoute } from 'astro';
import { ADS } from '../config/site';

// AdSense requires /ads.txt. Generated from ADS.client, so you only set the publisher id once.
export const GET: APIRoute = () => {
  const pub = ADS.client.replace(/^ca-/, '');
  const body = pub
    ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
    : '# Add your AdSense publisher id in src/config/site.ts (ADS.client) or the ADSENSE_CLIENT env var.\n';
  return new Response(body, { headers: { 'content-type': 'text/plain' } });
};
