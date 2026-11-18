// Google Analytics 4, ready but off until a measurement id is configured.
// The id comes from the GA_MEASUREMENT_ID variable at build time (see docs/SETUP, section 5).
// Without it, nothing is loaded and track() does nothing.
//
// Events (all with Portuguese-free, snake_case names, as GA4 recommends):
//   page_view        every navigation (sent by hand, since this is a single-page app)
//   audio_play       a reading starts playing           { reading_id, book, part, narrator, source: online|offline }
//   audio_progress   25/50/75% of a reading heard        { reading_id, book, percent }
//   audio_complete   a reading reached the end           { reading_id, book, narrator }
//   autoplay_next    autoplay moved to the next reading  { from_id, to_id, book }
//   autoplay_toggle  autoplay switched on/off            { enabled }
//   speed_change     playback speed changed             { speed }
//   download         a reading or a whole book saved     { scope: reading|book, book, ... }
//   download_remove  downloads deleted                   { scope: reading|all }
//   share            share button used                   { content_type, item_id, method }
//   search           search typed (debounced)            { search_term }
//   app_installed    the PWA was installed
//   app_update       the listener reloaded for a new version
import { browser } from '$app/environment';

let id = null;

export function initAnalytics(measurementId) {
  if (!browser || !measurementId || id) return;
  id = measurementId;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  // Page views are sent on each client-side navigation (see +layout.svelte).
  window.gtag('config', id, { send_page_view: false });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

export function track(event, params = {}) {
  if (!id || typeof window.gtag !== 'function') return;
  window.gtag('event', event, params);
}

export function trackPageView(url, title) {
  track('page_view', { page_location: url, page_title: title });
}
