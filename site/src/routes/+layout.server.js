import { siteIndex } from '$lib/server/catalog.js';
import { base } from '$app/paths';
import { publicSiteUrl } from '$lib/server/site.js';

// Every page is generated at build time (GitHub Pages is static hosting).
export const prerender = true;
export const trailingSlash = 'always';

export function load() {
  // Public address (https), e.g. https://biblia.kingdomapps.net; see $lib/server/site.js.
  return {
    index: siteIndex(),
    siteUrl: publicSiteUrl(),
    basePath: base,
    // Google Analytics 4 measurement id (G-XXXXXXX); empty = analytics off. See docs/SETUP, section 5.
    gaId: /^G-[A-Z0-9]+$/.test(process.env.GA_MEASUREMENT_ID || '') ? process.env.GA_MEASUREMENT_ID : null,
  };
}
