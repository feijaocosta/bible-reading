// "Download for offline": saves a reading's MP3 in the browser's Cache Storage.
// The player then plays it from a blob URL (no network, seeking works everywhere).
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
  get supported() { return browser && 'caches' in window; }

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
      this.ids = [...this.ids, reading.id];
      this.#persist();
      navigator.storage?.persist?.();
    } finally {
      this.busy = this.busy.filter((id) => id !== reading.id);
    }
  }

  // The saved MP3 as a Blob, or null if it is not (or no longer) in the cache.
  async blob(reading) {
    if (!this.supported || !reading?.audioUrl) return null;
    try {
      const res = await (await caches.open(AUDIO_CACHE)).match(reading.audioUrl);
      // GitHub serves downloads as application/octet-stream; Safari only plays blobs typed as audio.
      return res ? new Blob([await res.blob()], { type: 'audio/mpeg' }) : null;
    } catch {
      return null;
    }
  }

  async remove(reading) {
    if (!this.supported || !reading) return;
    const cache = await caches.open(AUDIO_CACHE);
    await cache.delete(reading.audioUrl);
    this.ids = this.ids.filter((id) => id !== reading.id);
    this.#persist();
  }
}

export const downloads = new Downloads();
