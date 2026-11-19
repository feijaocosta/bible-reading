// Public address of the app, e.g. https://biblia.kingdomapps.net (SITE_URL is set by the deploy
// workflow from the GitHub Pages configuration). Falls back to the base path for local builds.
import { base } from '$app/paths';

export function siteUrl() {
  return (process.env.SITE_URL || `http://localhost:4173${base}`).replace(/\/$/, '');
}
