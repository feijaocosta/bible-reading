// One audio player for the whole app: it lives in the root layout, so playback continues across pages.
// Integrates with the OS media controls (lock screen) through the Media Session API.
import { browser } from '$app/environment';

const CONTINUE_KEY = 'blpe:continue';

function readContinue() {
  if (!browser) return null;
  try { return JSON.parse(localStorage.getItem(CONTINUE_KEY)); } catch { return null; }
}

class Player {
  current = $state(null); // reading card (see server/catalog.js)
  playing = $state(false);
  time = $state(0);
  duration = $state(0);
  resume = $state(readContinue()); // { reading, time } of the last unfinished reading
  el = null;
  lastSaved = 0;

  attach(el) {
    this.el = el;
    el.addEventListener('play', () => { this.playing = true; this.#mediaState(); });
    el.addEventListener('pause', () => { this.playing = false; this.#save(true); this.#mediaState(); });
    el.addEventListener('loadedmetadata', () => { this.duration = el.duration || this.current?.durationSec || 0; });
    el.addEventListener('timeupdate', () => { this.time = el.currentTime; this.#save(); this.#mediaPosition(); });
    el.addEventListener('ended', () => { this.playing = false; this.#clear(); });
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

  async play(reading, { at } = {}) {
    if (!this.el || !reading?.audioUrl) return;
    if (!this.isCurrent(reading)) {
      this.current = reading;
      this.time = 0;
      this.duration = reading.durationSec || 0;
      this.el.src = reading.audioUrl;
      const startAt = at ?? (this.resume?.reading?.id === reading.id ? this.resume.time : 0);
      if (startAt) this.el.currentTime = startAt;
      this.#mediaMetadata(reading);
    }
    try { await this.el.play(); } catch { /* autoplay blocked: the user can press play */ }
  }

  toggle(reading) {
    if (reading && !this.isCurrent(reading)) return this.play(reading);
    if (this.el?.paused) this.el.play(); else this.el?.pause();
  }

  seek(seconds) {
    if (!this.el) return;
    this.el.currentTime = Math.max(0, Math.min(seconds, this.duration || seconds));
  }

  skip(delta) {
    this.seek((this.el?.currentTime || 0) + delta);
  }

  #save(force = false) {
    if (!this.current || !browser) return;
    const now = Date.now();
    if (!force && now - this.lastSaved < 4000) return;
    this.lastSaved = now;
    // Near the end counts as finished.
    if (this.duration && this.time > this.duration - 8) return this.#clear();
    this.resume = { reading: $state.snapshot(this.current), time: this.time };
    try { localStorage.setItem(CONTINUE_KEY, JSON.stringify(this.resume)); } catch { /* storage full or blocked */ }
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
    try { navigator.mediaSession.setPositionState({ duration: this.duration, position: Math.min(this.time, this.duration), playbackRate: 1 }); } catch { /* ignore */ }
  }
}

export const player = new Player();
