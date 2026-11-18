/// <reference types="@sveltejs/kit" />
// App shell + catalog pages for offline use; downloaded audio served from its own cache.
// Videos are never cached, and audio only when the listener taps "Baixar".
import { build, files, version } from '$service-worker';

const SHELL = `blpe-shell-${version}`;
const PAGES = 'blpe-pages-v1';
const AUDIO = 'blpe-audio-v1'; // same name as in src/lib/offline.svelte.js
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

// Builds a 206 response for a Range request from a full cached response.
async function rangeResponse(request, cached) {
  const range = request.headers.get('range');
  if (!range) return cached;
  const blob = await cached.blob();
  const [, startText, endText] = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const start = Number(startText || 0);
  const end = endText ? Math.min(Number(endText), blob.size - 1) : blob.size - 1;
  if (Number.isNaN(start) || start >= blob.size) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${blob.size}` } });
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      'content-type': cached.headers.get('content-type') || 'audio/mpeg',
      'content-range': `bytes ${start}-${end}/${blob.size}`,
      'content-length': String(end - start + 1),
      'accept-ranges': 'bytes',
    },
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Downloaded audio and covers (any origin): cache only, never stored here otherwise.
  event.respondWith((async () => {
    const audio = await caches.open(AUDIO);
    const saved = await audio.match(request.url, { ignoreVary: true });
    if (saved) return rangeResponse(request, saved);

    if (url.origin !== location.origin) return fetch(request);

    // Built assets and static files: cache first.
    const shell = await caches.open(SHELL);
    const inShell = await shell.match(request);
    if (inShell) return inShell;

    // Pages and their data: network first, fall back to the last copy seen.
    try {
      const res = await fetch(request);
      if (res.ok && (request.mode === 'navigate' || url.pathname.endsWith('__data.json') || url.pathname.endsWith('.json'))) {
        const pages = await caches.open(PAGES);
        pages.put(request, res.clone());
      }
      return res;
    } catch (err) {
      const pages = await caches.open(PAGES);
      const copy = await pages.match(request);
      if (copy) return copy;
      if (request.mode === 'navigate') return (await shell.match(base)) || Response.error();
      throw err;
    }
  })());
});
