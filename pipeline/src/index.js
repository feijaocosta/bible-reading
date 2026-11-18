#!/usr/bin/env node
// Pipeline entry point: audio + reading details -> artwork.png, thumbnail.jpg, output.mp4 (YouTube) and output.mp3 (app).
//
// Usage:
//   node pipeline/src/index.js --audio <file | URL | drive:FILE_ID> --book "Gênesis" --chapter 1 --narrator "Maria" [--testament OT] [--out dir]
//   --chapter also accepts "introdução" (book introduction) and "encerramento" (book closing).
import { parseArgs } from 'node:util';
import { mkdir, access, writeFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { resolveReading, partLabel, partKey } from './books.js';
import { isUrl, downloadAudio } from './download.js';
import { downloadDriveFile } from './drive.js';
import { loadCatalog, findReading } from './catalog.js';
import { renderArtwork, ARTWORK_SIZE } from './artwork.js';
import { assertAudio, createMix, createVideo, createMp3, createThumbnail, probeDuration, probeImageSize } from './video.js';

export async function processReading({ audio, outDir, ...details }, log = console.log) {
  const reading = resolveReading(details);
  await mkdir(outDir, { recursive: true });

  log(`Reading: ${reading.book}, ${partLabel(reading)} (${reading.testament}), narrated by ${reading.narrator}`);

  if (String(audio).startsWith('drive:')) {
    log('Downloading audio from Google Drive...');
    audio = await downloadDriveFile(audio.slice('drive:'.length), outDir);
  } else if (isUrl(audio)) {
    log('Downloading audio...');
    audio = await downloadAudio(audio, outDir);
  } else {
    await access(audio).catch(() => { throw new Error(`Audio file not found: ${audio}`); });
  }

  const audioSeconds = await assertAudio(audio);
  log(`Audio OK: ${audioSeconds.toFixed(1)}s`);

  const artwork = path.join(outDir, 'artwork.png');
  await renderArtwork(reading, artwork);
  const size = await probeImageSize(artwork);
  if (size.width !== ARTWORK_SIZE.width || size.height !== ARTWORK_SIZE.height) {
    throw new Error(`Artwork has the wrong size: ${size.width}x${size.height}.`);
  }
  log(`Artwork: ${artwork}`);

  const thumbnail = path.join(outDir, 'thumbnail.jpg');
  await createThumbnail({ image: artwork, output: thumbnail });
  log(`Thumbnail: ${thumbnail}`);

  const mix = path.join(outDir, 'mix.wav');
  await createMix({ audio, output: mix });

  const video = path.join(outDir, 'output.mp4');
  await createVideo({ image: artwork, mix, output: video });
  const durationSec = Math.round(await probeDuration(video));
  log(`Video: ${video} (${durationSec}s)`);

  const mp3 = path.join(outDir, 'output.mp3');
  await createMp3({ mix, output: mp3, title: `${reading.book}, ${partLabel(reading)}`, artist: reading.narrator });
  log(`Audio: ${mp3}`);

  const result = { ...reading, artwork, thumbnail, video, mp3, durationSec };
  await writeFile(path.join(outDir, 'reading.json'), JSON.stringify(result, null, 2) + '\n');
  return result;
}

// Markdown summary shown on the GitHub Actions run page.
function actionsSummary(r) {
  const minutes = `${Math.floor(r.durationSec / 60)}min${String(r.durationSec % 60).padStart(2, '0')}s`;
  return [
    `## ${r.book}, ${partLabel(r)}`,
    '',
    '| | |', '|---|---|',
    `| Testamento | ${r.testamentLabel} |`,
    `| Leitura | ${r.narrator} |`,
    `| Duração do vídeo | ${minutes} |`,
    '',
    'O vídeo, a arte e a miniatura estão em **Artifacts**, no fim desta página.',
    '',
  ].join('\n');
}

async function main() {
  const { values } = parseArgs({
    options: {
      audio: { type: 'string' },
      book: { type: 'string' },
      chapter: { type: 'string' },
      narrator: { type: 'string' },
      testament: { type: 'string' },
      out: { type: 'string' },
      id: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help || !values.audio) {
    console.log('Usage: node pipeline/src/index.js --audio <file|URL|drive:ID> --book "<name>" --chapter <n|introdução|encerramento> --narrator "<name>" [--testament OT|NT] [--out <dir>] [--id <reading id>]');
    process.exit(values.help ? 0 : 1);
  }

  // Idempotency: a reading that is already in the catalog is never processed again.
  if (values.id) {
    const existing = findReading(await loadCatalog(), values.id);
    if (existing) {
      console.log(`Reading ${values.id} is already published (https://youtu.be/${existing.youtubeId}). Nothing to do.`);
      if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, 'skip=true\n');
      return;
    }
  }

  // Default output folder: out/<book-slug>-<chapter> at the repository root.
  const reading = resolveReading(values);
  const outDir = values.out ?? path.resolve(import.meta.dirname, '../../out', `${reading.bookSlug}-${partKey(reading)}`);

  const result = await processReading({ ...values, outDir });
  console.log(JSON.stringify(result, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, actionsSummary(result));
}

// Run only when called from the command line, not when imported by another module.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  });
}
