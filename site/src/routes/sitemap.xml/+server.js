import { sitemapEntries } from '$lib/server/catalog.js';
import { siteUrl } from '$lib/server/site.js';

// Generated at build time from the catalog (home, books, every reading, narrators).
export const prerender = true;

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function GET() {
  const site = siteUrl();
  const urls = sitemapEntries().map(({ path, lastmod }) => {
    const date = lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : '';
    return `  <url><loc>${escape(site + path)}</loc>${date}</url>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
