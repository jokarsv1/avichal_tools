import type { APIRoute } from 'astro';
import { SITE } from '../config/site';
// Lets Chrome, Edge and Firefox add the site as a search engine: type the site name, press Tab, then your query.
export const GET: APIRoute = () => new Response(`<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>${SITE.name}</ShortName>
  <Description>Free tools that run in your browser: PDF, image, video, finance and exam tools</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image width="192" height="192" type="image/png">${SITE.url}/icon-192.png</Image>
  <Url type="text/html" method="get" template="${SITE.url}/search?q={searchTerms}"/>
</OpenSearchDescription>
`, { headers: { 'content-type': 'application/opensearchdescription+xml' } });
