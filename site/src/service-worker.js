/// <reference types="@sveltejs/kit" />
// Offline support with predictable updates:
//  - Pages and page data: network first with a short timeout, then the last copy (fresh when online,
//    fast on slow networks, available offline).
//  - Built assets (hashed, immutable): cache first.
//  - Static files (icons, art, manifest): stale-while-revalidate.
//  - _app/version.json is never cached, so "new version" checks always see the latest deploy.
//  - A new worker takes over right away but keeps the previous version's assets, so a page that is still
//    open on the old version never asks for files that no longer exist. The app shows "Nova versão
//    disponível" (see UpdateBanner.svelte) and a reload moves it to the new version.
//  - Audio is never handled here: Safari rejects media a service worker returns after a redirect, and
//    downloaded audio is played from a blob by the player.
import { build, files, version } from '$service-worker';

const ASSETS = `blpe-assets-${version}`;
const STATIC = 'blpe-static-v1';
const PAGES = 'blpe-pages-v1';
const NETWORK_TIMEOUT_MS = 3500;
const base = new URL(self.registration.scope).pathname.replace(/\/$/, '');

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await (await caches.open(ASSETS)).addAll(build);
    await (await caches.open(STATIC)).addAll(files);
    // The home page, so the app opens offline even before it was visited in this version.
    try { await (await caches.open(PAGES)).add(`${base}/`); } catch { /* offline during install */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Keep this version's assets and the previous one (for pages still open on it); drop the rest,
    // plus the old "shell" cache that served the home page cache-first.
    const assetCaches = keys.filter((k) => k.startsWith('blpe-assets-') && k !== ASSETS)
      .sort((a, b) => Number(b.slice(12)) - Number(a.slice(12)) || b.localeCompare(a));
    for (const key of [...assetCaches.slice(1), ...keys.filter((k) => k.startsWith('blpe-shell-'))]) await caches.delete(key);
    await self.clients.claim();
  })());
});

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

async function networkFirst(event, request) {
  const pages = await caches.open(PAGES);
  const network = fetch(request).then((res) => {
    if (res.ok) pages.put(request, res.clone());
    return res;
  });
  // Even after the timeout, let the network response refresh the cache for next time.
  event.waitUntil(network.catch(() => {}));
  try {
    // Known to be offline: don't wait for the network at all.
    return await withTimeout(network, self.navigator.onLine === false ? 0 : NETWORK_TIMEOUT_MS);
  } catch {
    const copy = await pages.match(request);
    if (copy) return copy;
    if (request.mode === 'navigate') {
      const home = await pages.match(`${base}/`);
      if (home) return home;
    }
    return network; // nothing cached: keep waiting for the network
  }
}

async function cacheFirst(request) {
  const assets = await caches.open(ASSETS);
  const hit = await assets.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) assets.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(event, request) {
  const stat = await caches.open(STATIC);
  const hit = await stat.match(request);
  const network = fetch(request).then((res) => {
    if (res.ok) stat.put(request, res.clone());
    return res;
  });
  event.waitUntil(network.catch(() => {}));
  return hit || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Only same-origin GETs; audio (range requests), other origins and the version file go straight to the network.
  if (request.method !== 'GET' || url.origin !== location.origin || request.headers.has('range')) return;
  if (url.pathname.endsWith('/_app/version.json') || url.pathname.startsWith(`${base}/audio/`)) return;

  if (url.pathname.startsWith(`${base}/_app/immutable/`)) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === 'navigate' || url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(event, request));
  } else {
    event.respondWith(staleWhileRevalidate(event, request));
  }
});
