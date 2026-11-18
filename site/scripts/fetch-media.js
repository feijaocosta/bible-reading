// Copies the app audio (MP3) and covers from GitHub Releases into the built site, so GitHub Pages serves them.
// Why: Release downloads come as application/octet-stream + "attachment" and without CORS, which Safari
// (every iPhone browser) refuses to play and which blocks offline downloads. Pages serves audio/mpeg,
// supports ranges and is the app's own origin.
//
// Usage: node site/scripts/fetch-media.js <build dir> [cache dir]
// Files already in the cache dir are reused (the deploy workflow keeps it between runs).
import { readFileSync, existsSync, mkdirSync, copyFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mediaPath, isReleaseAsset } from '../src/lib/media.js';

const [buildDir, cacheDir = path.join(buildDir, '..', '.media-cache')] = process.argv.slice(2);
if (!buildDir) { console.error('Usage: node site/scripts/fetch-media.js <build dir> [cache dir]'); process.exit(1); }
const PAGES_LIMIT = 1024 ** 3; // GitHub Pages: published sites up to 1 GB

const catalogFile = process.env.READINGS_FILE || fileURLToPath(new URL('../../data/readings.json', import.meta.url));
const catalog = JSON.parse(readFileSync(catalogFile, 'utf8'));
const urls = catalog.flatMap((r) => [r.audioUrl, r.coverUrl]).filter((u) => u && isReleaseAsset(u));

async function download(url, file) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      return;
    } catch (err) {
      if (attempt === 3) throw new Error(`Could not download ${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
}

let fetched = 0, reused = 0, bytes = 0;
const queue = [...urls];
async function worker() {
  while (queue.length) {
    const url = queue.shift();
    const rel = mediaPath(url).replace(/^\//, ''); // audio/<tag>/<file>
    const cached = path.join(cacheDir, rel);
    if (existsSync(cached)) reused++; else { await download(url, cached); fetched++; }
    const target = path.join(buildDir, rel);
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(cached, target);
    bytes += statSync(target).size;
  }
}
await Promise.all(Array.from({ length: 4 }, worker));

const mb = (n) => (n / 1024 ** 2).toFixed(1);
console.log(`App media: ${urls.length} files (${fetched} downloaded, ${reused} from cache), ${mb(bytes)} MB.`);
if (process.env.GITHUB_STEP_SUMMARY) {
  const pct = Math.round((bytes / PAGES_LIMIT) * 100);
  writeFileSync(process.env.GITHUB_STEP_SUMMARY,
    `### Áudios do app\n\n${urls.filter((u) => u.endsWith('.mp3')).length} leituras, ${mb(bytes)} MB (${pct}% do limite de 1 GB do GitHub Pages).\n`,
    { flag: 'a' });
}
if (bytes > PAGES_LIMIT * 0.85) {
  console.log(`::warning::The app audio uses ${mb(bytes)} MB, close to the 1 GB GitHub Pages limit. Time to move the audio to another host (see docs/SETUP, section 4).`);
}
