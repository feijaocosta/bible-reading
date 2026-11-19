// Public address of the app, e.g. https://biblia.kingdomapps.net, from SITE_URL (set by the deploy
// workflow). Always https, except for local addresses. Empty when not configured (local builds).
export function publicSiteUrl() {
  const raw = (process.env.SITE_URL || '').trim().replace(/\/$/, '');
  if (!raw) return '';
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(raw);
  return local ? raw : raw.replace(/^http:\/\//, 'https://');
}

// For files that need an absolute address even in local builds (sitemap.xml, robots.txt).
export function siteUrl() {
  return publicSiteUrl() || 'http://localhost:4173';
}
