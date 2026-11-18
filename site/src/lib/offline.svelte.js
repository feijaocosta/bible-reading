// "Download for offline": saves readings' MP3s in the browser's Cache Storage.
// The player plays them from a blob URL (no network, seeking works everywhere).
// The list of downloads (with the reading details, for the "Baixados" screen) lives in localStorage.
import { browser } from '$app/environment';
import { track } from './analytics.js';

export const AUDIO_CACHE = 'blpe-audio-v1';
const KEY = 'blpe:downloads:v2';
const OLD_KEY = 'blpe:downloads'; // v1 stored ids only

function readItems() {
  if (!browser) return [];
  try {
    const items = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(items)) return items;
    // Migrate v1 (ids only): keep them; details are filled in the next time the reading is seen.
    const ids = JSON.parse(localStorage.getItem(OLD_KEY)) || [];
    return ids.map((id) => ({ id, reading: null, bytes: 0, savedAt: null }));
  } catch {
    return [];
  }
}

class Downloads {
  items = $state(readItems()); // [{ id, reading, bytes, savedAt }]
  busy = $state([]); // reading ids being downloaded
  batch = $state(null); // { label, done, total } while downloading a whole book

  get supported() { return browser && 'caches' in window; }
  get totalBytes() { return this.items.reduce((sum, i) => sum + (i.bytes || 0), 0); }
  get count() { return this.items.length; }

  has(reading) { return !!reading && this.items.some((i) => i.id === reading.id); }
  isBusy(reading) { return !!reading && this.busy.includes(reading.id); }

  #persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.items)); } catch { /* storage full or blocked */ }
  }

  // Refresh the stored details (e.g. after migrating from v1) when a reading is displayed.
  remember(reading) {
    const item = this.items.find((i) => i.id === reading?.id);
    if (item && !item.reading) { item.reading = $state.snapshot(reading); this.#persist(); }
  }

  async add(reading, { silent = false } = {}) {
    if (!this.supported || !reading?.audioUrl || this.has(reading)) return;
    this.busy = [...this.busy, reading.id];
    try {
      const res = await fetch(reading.audioUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      await (await caches.open(AUDIO_CACHE)).put(reading.audioUrl, new Response(blob, { headers: { 'content-type': 'audio/mpeg' } }));
      this.items = [...this.items, { id: reading.id, reading: $state.snapshot(reading), bytes: blob.size, savedAt: new Date().toISOString() }];
      this.#persist();
      navigator.storage?.persist?.();
      if (!silent) track('download', { scope: 'reading', book: reading.book, reading_title: reading.title });
    } finally {
      this.busy = this.busy.filter((id) => id !== reading.id);
    }
  }

  // Downloads several readings one after another, reporting progress. Returns how many failed.
  async addMany(readings, label) {
    const todo = readings.filter((r) => r.audioUrl && !this.has(r));
    let failed = 0;
    this.batch = { label, done: 0, total: todo.length };
    for (const r of todo) {
      try { await this.add(r, { silent: true }); } catch { failed++; }
      this.batch = { ...this.batch, done: this.batch.done + 1 };
    }
    this.batch = null;
    track('download', { scope: 'book', book: label, readings: todo.length - failed });
    return failed;
  }

  // The saved MP3 as a Blob, or null if it is not (or no longer) in the cache.
  async blob(reading) {
    if (!this.supported || !reading?.audioUrl) return null;
    try {
      const res = await (await caches.open(AUDIO_CACHE)).match(reading.audioUrl);
      // Safari only plays blobs typed as audio.
      return res ? new Blob([await res.blob()], { type: 'audio/mpeg' }) : null;
    } catch {
      return null;
    }
  }

  async remove(reading) {
    const item = this.items.find((i) => i.id === reading?.id);
    if (!this.supported || !item) return;
    const url = reading.audioUrl ?? item.reading?.audioUrl;
    if (url) await (await caches.open(AUDIO_CACHE)).delete(url);
    this.items = this.items.filter((i) => i.id !== item.id);
    this.#persist();
    track('download_remove', { scope: 'reading' });
  }

  async removeAll() {
    if (!this.supported) return;
    await caches.delete(AUDIO_CACHE);
    this.items = [];
    this.#persist();
    track('download_remove', { scope: 'all' });
  }
}

export const downloads = new Downloads();
