// Generates the background music: a seamless, loopable ambient pad, by additive synthesis.
// The output is our own work (no samples, no third-party music), so it is safe for YouTube and a public repo.
//
// Usage: node pipeline/scripts/generate-pad.js out.wav
// Then:  ffmpeg -i out.wav -c:a flac pipeline/template/assets/audio/pad.flac
import { writeFileSync } from 'node:fs';

const SR = 48000, CHORD_SEC = 8, out = process.argv[2] || 'pad.wav';

// Seeded random numbers so the generated file is always the same.
let seed = 20261118;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
// Gentle progression in C: Cmaj9 – Am7(add9) – Fmaj7 – Gsus2
const chords = [
  [48, 55, 64, 71, 74],
  [45, 52, 60, 67, 71],
  [41, 48, 57, 64, 67],
  [43, 50, 57, 62, 67],
];
const LEN = chords.length * CHORD_SEC, N = LEN * SR;
const L = new Float32Array(N), R = new Float32Array(N);
const XF = 3; // crossfade seconds between chords

// Smooth periodic window: 1 inside the chord slot, raised-cosine ramps that overlap the neighbours.
function env(t, start) {
  let d = t - start;
  d = ((d % LEN) + LEN) % LEN; // wrap for a seamless loop
  if (d > LEN - XF / 2) d -= LEN;
  const a = -XF / 2, b = CHORD_SEC + XF / 2;
  if (d < a || d > b) return 0;
  if (d < XF / 2) return 0.5 - 0.5 * Math.cos(Math.PI * (d - a) / XF);
  if (d > CHORD_SEC - XF / 2) return 0.5 + 0.5 * Math.cos(Math.PI * (d - (CHORD_SEC - XF / 2)) / XF);
  return 1;
}

chords.forEach((notes, ci) => {
  const start = ci * CHORD_SEC;
  notes.forEach((n, ni) => {
    const f = midi(n), gain = (ni === 0 ? 0.9 : 0.55) / notes.length;
    // Two slightly detuned voices per note, panned apart, for warmth and width.
    for (const [cents, pan] of [[-4, 0.3], [4, 0.7]]) {
      const ff = f * 2 ** (cents / 1200), ph = random() * 6.28;
      // Keep phase continuous across the loop: round frequency to a whole number of cycles per loop.
      const fl = Math.round(ff * LEN) / LEN;
      for (let i = 0; i < N; i++) {
        const t = i / SR, e = env(t, start);
        if (!e) continue;
        const x = 2 * Math.PI * fl * t + ph;
        const v = (Math.sin(x) + 0.25 * Math.sin(2 * x) + 0.08 * Math.sin(3 * x)) * e * gain;
        L[i] += v * (1 - pan); R[i] += v * pan;
      }
    }
  });
});
// Very slow "breathing" (period = loop length / 4, so it loops too).
for (let i = 0; i < N; i++) { const b = 0.85 + 0.15 * Math.sin(2 * Math.PI * i / (N / 4)); L[i] *= b; R[i] *= b; }

let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round((L[i] / peak) * 0.7 * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round((R[i] / peak) * 0.7 * 32767), 46 + i * 4);
}
writeFileSync(out, buf);
console.log(`wrote ${out}: ${LEN}s loop`);
