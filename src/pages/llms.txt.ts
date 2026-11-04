import type { APIRoute } from 'astro';
import { SITE } from '../config/site';
import { CATEGORIES, toolsIn } from '../data/tools';

// llms.txt helps AI assistants and AI search engines understand and cite the site.
export const GET: APIRoute = () => {
  const lines = [`# ${SITE.name}`, '', `> ${SITE.tagline}`, '', 'All tools run locally in the browser; files are never uploaded. No account is needed.', ''];
  for (const c of CATEGORIES) {
    lines.push(`## ${c.label} tools`, '');
    for (const t of toolsIn(c.id)) lines.push(`- [${t.name}](${SITE.url}/${t.slug}): ${t.description}`);
    lines.push('');
  }
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
