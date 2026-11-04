import type { APIRoute } from 'astro';
import { OTHER_LANGS, PACKS, type Lang } from '../../i18n';
/** In-tool label translations, fetched once per language by localized tool pages (then cached). */
export function getStaticPaths() {
  return OTHER_LANGS.map((l) => ({ params: { lang: l.code } }));
}
export const GET: APIRoute = ({ params }) => new Response(JSON.stringify(PACKS[params.lang as Exclude<Lang, 'en'>].phrases), { headers: { 'content-type': 'application/json' } });
