#!/usr/bin/env node
// Pipeline entry point: audio + reading details -> artwork.png, thumbnail.jpg and output.mp4.
//
// Usage:
//   node pipeline/src/index.js --audio reading.ogg --book "Gênesis" --chapter 1 --narrator "Maria" [--testament OT] [--out dir]
import { parseArgs } from 'node:util';
import { mkdir, access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { resolveReading } from './books.js';
import { renderArtwork, ARTWORK_SIZE } from './artwork.js';
import { assertAudio, createVideo, createThumbnail, probeDuration, probeImageSize } from './video.js';

export async function processReading({ audio, outDir, ...details }, log = console.log) {
  const reading = resolveReading(details);
  await access(audio).catch(() => { throw new Error(`Audio file not found: ${audio}`); });
  await mkdir(outDir, { recursive: true });

  log(`Reading: ${reading.book} ${reading.chapter} (${reading.testament}), narrated by ${reading.narrator}`);

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

  const video = path.join(outDir, 'output.mp4');
  await createVideo({ image: artwork, audio, output: video });
  const durationSec = Math.round(await probeDuration(video));
  log(`Video: ${video} (${durationSec}s)`);

  return { ...reading, artwork, thumbnail, video, durationSec };
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
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help || !values.audio) {
    console.log('Usage: node pipeline/src/index.js --audio <file> --book "<name>" --chapter <n> --narrator "<name>" [--testament OT|NT] [--out <dir>]');
    process.exit(values.help ? 0 : 1);
  }

  // Default output folder: out/<book-slug>-<chapter> at the repository root.
  const reading = resolveReading(values);
  const outDir = values.out ?? path.resolve(import.meta.dirname, '../../out', `${reading.bookSlug}-${reading.chapter}`);

  const result = await processReading({ ...values, outDir });
  console.log(JSON.stringify(result, null, 2));
}

// Run only when called from the command line, not when imported by another module.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  });
}
