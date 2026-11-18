// "Download for offline": saves a reading's MP3 (and cover) in the browser cache.
// The service worker then answers the audio requests from that cache, including range requests.
import { browser } from '$app/environment';

export const AUDIO_CACHE = 'blpe-audio-v1';
const KEY = 'blpe:downloads';

function readIds() {
  if (!browser) return [];
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}

class Downloads {
  ids = $state(readIds());
  busy = $state([]);

  has(reading) { return !!reading && this.ids.includes(reading.id); }
  isBusy(reading) { return !!reading && this.busy.includes(reading.id); }
  get supported() { return browser && 'caches' in window && 'serviceWorker' in navigator; }

  #persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.ids)); } catch { /* ignore */ }
  }

  async add(reading) {
    if (!this.supported || !reading?.audioUrl || this.has(reading)) return;
    this.busy = [...this.busy, reading.id];
    try {
      const cache = await caches.open(AUDIO_CACHE);
      const res = await fetch(reading.audioUrl, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await cache.put(reading.audioUrl, res);
      if (reading.coverUrl) {
        try { await cache.put(reading.coverUrl, await fetch(reading.coverUrl, { mode: 'no-cors' })); } catch { /* cover is optional */ }
      }
      this.ids = [...this.ids, reading.id];
      this.#persist();
      navigator.storage?.persist?.();
    } finally {
      this.busy = this.busy.filter((id) => id !== reading.id);
    }
  }

  async remove(reading) {
    if (!this.supported || !reading) return;
    const cache = await caches.open(AUDIO_CACHE);
    await cache.delete(reading.audioUrl);
    if (reading.coverUrl) await cache.delete(reading.coverUrl);
    this.ids = this.ids.filter((id) => id !== reading.id);
    this.#persist();
  }
}

export const downloads = new Downloads();
