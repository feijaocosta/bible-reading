/// <reference types="@sveltejs/kit" />
// App shell + catalog pages for offline use.
// Audio is never handled here: online it streams straight from its host (Safari rejects media that a
// service worker returns after a redirect, and GitHub Release downloads redirect), and downloaded
// audio is played from a blob by the player (see src/lib/player.svelte.js).
import { build, files, version } from '$service-worker';

const SHELL = `blpe-shell-${version}`;
const PAGES = 'blpe-pages-v1';
const base = new URL(self.registration.scope).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll([...build, ...files, base])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('blpe-shell-') && key !== SHELL) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Only same-origin GETs; everything else (audio, covers, YouTube) goes to the network untouched.
  if (request.method !== 'GET' || url.origin !== location.origin || request.headers.has('range')) return;

  event.respondWith((async () => {
    // Built assets and static files: cache first.
    const shell = await caches.open(SHELL);
    const inShell = await shell.match(request);
    if (inShell) return inShell;

    // Pages and their data: network first, fall back to the last copy seen.
    try {
      const res = await fetch(request);
      if (res.ok && (request.mode === 'navigate' || url.pathname.endsWith('.json'))) {
        (await caches.open(PAGES)).put(request, res.clone());
      }
      return res;
    } catch (err) {
      const copy = await (await caches.open(PAGES)).match(request);
      if (copy) return copy;
      if (request.mode === 'navigate') return (await shell.match(base)) || Response.error();
      throw err;
    }
  })());
});
