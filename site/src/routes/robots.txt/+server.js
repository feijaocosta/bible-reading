import { siteUrl } from '$lib/server/site.js';

export const prerender = true;

export function GET() {
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl()}/sitemap.xml\n`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
