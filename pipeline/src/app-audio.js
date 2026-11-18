#!/usr/bin/env node
// Adds the app audio (MP3 + cover in GitHub Releases) to a reading that is already published.
// Used for readings published before the app audio existed, or to replace an audio. YouTube is not touched.
//
// Usage: node pipeline/src/app-audio.js --id <reading id> --audio <file | link | drive:FILE_ID> [--force]
// Needs GITHUB_TOKEN and GITHUB_REPOSITORY (set in GitHub Actions); GOOGLE_SA_JSON for Drive files.
import { parseArgs } from 'node:util';
import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { processReading } from './index.js';
import { loadCatalog, findReading, updateReading, CATALOG_PATH } from './catalog.js';
import { GitHubReleases, storeAppMedia } from './releases.js';

export async function addAppAudio({ id, audio, outDir, force = false }, { env = process.env, log = console.log, releases, catalogFile = CATALOG_PATH, process: run = processReading } = {}) {
  const entry = findReading(await loadCatalog(catalogFile), id);
  if (!entry) throw new Error(`Reading "${id}" is not in data/readings.json. Copy the id exactly from that file.`);
  if (entry.audioUrl && !force) {
    log(`Reading ${id} already has app audio (${entry.audioUrl}). Use --force to replace it.`);
    return { updated: false, entry };
  }

  // Same artwork and mix as the original publication, from the catalog details.
  const reading = await run({
    audio,
    outDir,
    book: entry.book,
    chapter: entry.part === 'chapter' ? String(entry.chapter) : entry.part,
    narrator: entry.narrator,
  }, log);

  const store = releases ?? new GitHubReleases({ token: env.GITHUB_TOKEN, repository: env.GITHUB_REPOSITORY });
  const media = await storeAppMedia(reading, id, { mp3: reading.mp3, cover: reading.thumbnail }, store);
  const updated = await updateReading(id, { ...media, durationSec: reading.durationSec }, catalogFile);
  log(`App audio added: ${media.audioUrl}`);
  return { updated: true, entry: updated };
}

async function main() {
  const { values } = parseArgs({ options: { id: { type: 'string' }, audio: { type: 'string' }, out: { type: 'string' }, force: { type: 'boolean' } } });
  if (!values.id || !values.audio) {
    console.log('Usage: node pipeline/src/app-audio.js --id <reading id> --audio <file|link|drive:ID> [--force]');
    process.exit(1);
  }
  const outDir = values.out ?? path.resolve(import.meta.dirname, '../../out/app-audio');
  const result = await addAppAudio({ ...values, outDir });
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `updated=${result.updated}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, result.updated
      ? `### Áudio do app gerado\n\n**${result.entry.book}** — ${result.entry.narrator}\n\n${result.entry.audioUrl}\n`
      : `### Nada a fazer\n\nEsta leitura já tinha áudio no app. Marque "Substituir" para gerar de novo.\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  });
}
