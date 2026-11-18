// One audio player for the whole app: it lives in the root layout, so playback continues across pages.
// - Online: the <audio> element streams the MP3 straight from its host (no service worker in between).
// - Downloaded: plays from a blob URL of the cached file (works offline, seeking included, on every browser).
// - Recovers from network hiccups by reloading the source and resuming where it stopped.
// - Integrates with the OS media controls (lock screen) through the Media Session API.
import { browser } from '$app/environment';
import { downloads } from './offline.svelte.js';

const CONTINUE_KEY = 'blpe:continue';
const SPEED_KEY = 'blpe:speed';
export const SPEEDS = [1, 1.25, 1.5, 0.75];
const MAX_RETRIES = 3;

function readJson(key) {
  if (!browser) return null;
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
}

class Player {
  current = $state(null); // reading card (see server/catalog.js)
  playing = $state(false);
  loading = $state(false);
  failed = $state(false);
  time = $state(0);
  duration = $state(0);
  speed = $state(readJson(SPEED_KEY) || 1);
  resume = $state(readJson(CONTINUE_KEY)); // { reading, time } of the last unfinished reading
  el = null;
  #pendingSeek = null; // applied once metadata is loaded (iOS ignores earlier seeks)
  #retries = 0;
  #blobUrl = null;
  #lastSaved = 0;

  attach(el) {
    this.el = el;
    const on = (type, fn) => el.addEventListener(type, fn);
    on('loadedmetadata', () => {
      this.duration = Number.isFinite(el.duration) ? el.duration : this.current?.durationSec || 0;
      if (this.#pendingSeek != null) { el.currentTime = this.#pendingSeek; this.#pendingSeek = null; }
      el.playbackRate = this.speed;
    });
    on('play', () => { this.playing = true; this.#mediaState(); });
    on('playing', () => { this.loading = false; this.failed = false; this.#retries = 0; });
    on('pause', () => { this.playing = false; this.#save(true); this.#mediaState(); });
    on('waiting', () => { this.loading = true; });
    on('canplay', () => { this.loading = false; });
    on('timeupdate', () => { this.time = el.currentTime; this.#save(); this.#mediaPosition(); });
    on('ended', () => { this.playing = false; this.#clear(); });
    on('error', () => this.#recover());
    on('stalled', () => { if (this.playing) this.loading = true; });

    if (browser && 'mediaSession' in navigator) {
      const ms = navigator.mediaSession;
      ms.setActionHandler('play', () => this.el.play());
      ms.setActionHandler('pause', () => this.el.pause());
      ms.setActionHandler('seekbackward', () => this.skip(-15));
      ms.setActionHandler('seekforward', () => this.skip(15));
      try { ms.setActionHandler('seekto', (d) => this.seek(d.seekTime)); } catch { /* not supported */ }
    }
  }

  isCurrent(reading) {
    return this.current?.id === reading?.id;
  }

  async #source(reading) {
    if (this.#blobUrl) { URL.revokeObjectURL(this.#blobUrl); this.#blobUrl = null; }
    if (downloads.has(reading)) {
      const blob = await downloads.blob(reading);
      if (blob) return (this.#blobUrl = URL.createObjectURL(blob));
    }
    return reading.audioUrl;
  }

  async play(reading, { at } = {}) {
    if (!this.el || !reading?.audioUrl) return;
    if (!this.isCurrent(reading)) {
      this.current = reading;
      this.time = 0;
      this.duration = reading.durationSec || 0;
      this.failed = false;
      this.#retries = 0;
      const startAt = at ?? (this.resume?.reading?.id === reading.id ? this.resume.time : 0);
      this.#pendingSeek = startAt || null;
      this.loading = true;
      this.el.src = await this.#source(reading);
      this.el.load();
      this.#mediaMetadata(reading);
    } else if (at != null) {
      this.seek(at);
    }
    await this.#start();
  }

  async #start() {
    try {
      await this.el.play();
    } catch (err) {
      // NotAllowedError: the browser wants a tap first; the play button handles that.
      this.loading = false;
      if (err?.name !== 'NotAllowedError' && err?.name !== 'AbortError') this.#recover();
    }
  }

  // Network errors: reload the source and continue from the same point.
  async #recover() {
    if (!this.current) return;
    if (this.#retries >= MAX_RETRIES) {
      this.loading = false;
      this.failed = true;
      return;
    }
    this.#retries += 1;
    const position = this.el.currentTime || this.time;
    this.loading = true;
    await new Promise((r) => setTimeout(r, 800 * this.#retries));
    this.#pendingSeek = position || null;
    this.el.src = await this.#source(this.current);
    this.el.load();
    await this.#start(); // recovering means the listener wanted to hear it
  }

  retry() {
    this.#retries = 0;
    this.failed = false;
    return this.#recover();
  }

  toggle(reading) {
    if (reading && !this.isCurrent(reading)) return this.play(reading);
    if (this.failed) return this.retry();
    if (this.el?.paused) return this.#start();
    this.el?.pause();
  }

  seek(seconds) {
    if (!this.el) return;
    const target = Math.max(0, Math.min(seconds, this.duration || seconds));
    if (this.el.readyState < 1) this.#pendingSeek = target;
    else this.el.currentTime = target;
    this.time = target;
  }

  skip(delta) {
    this.seek((this.el?.currentTime || 0) + delta);
  }

  cycleSpeed() {
    this.speed = SPEEDS[(SPEEDS.indexOf(this.speed) + 1) % SPEEDS.length];
    if (this.el) this.el.playbackRate = this.speed;
    writeJson(SPEED_KEY, this.speed);
  }

  #save(force = false) {
    if (!this.current || !browser) return;
    const now = Date.now();
    if (!force && now - this.#lastSaved < 4000) return;
    this.#lastSaved = now;
    // Near the end counts as finished.
    if (this.duration && this.time > this.duration - 8) return this.#clear();
    if (this.time < 1) return;
    this.resume = { reading: $state.snapshot(this.current), time: this.time };
    writeJson(CONTINUE_KEY, this.resume);
  }

  #clear() {
    this.resume = null;
    try { localStorage.removeItem(CONTINUE_KEY); } catch { /* ignore */ }
  }

  #mediaMetadata(r) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: r.title,
      artist: r.narrator,
      album: 'Bíblia lida por elas',
      artwork: r.coverUrl ? [{ src: r.coverUrl, sizes: '1280x720', type: 'image/jpeg' }] : [],
    });
  }

  #mediaState() {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = this.playing ? 'playing' : 'paused';
  }

  #mediaPosition() {
    if (!('mediaSession' in navigator) || !this.duration || !navigator.mediaSession.setPositionState) return;
    try {
      navigator.mediaSession.setPositionState({ duration: this.duration, position: Math.min(this.time, this.duration), playbackRate: this.speed });
    } catch { /* ignore */ }
  }
}

export const player = new Player();
