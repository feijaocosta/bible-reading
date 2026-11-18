import { siteIndex } from '$lib/server/catalog.js';
import { base } from '$app/paths';

// Every page is generated at build time (GitHub Pages is static hosting).
export const prerender = true;
export const trailingSlash = 'always';

export function load() {
  // SITE_URL is the public address, e.g. https://user.github.io/repo (set by the deploy workflow).
  return { index: siteIndex(), siteUrl: (process.env.SITE_URL || '').replace(/\/$/, ''), basePath: base };
}
