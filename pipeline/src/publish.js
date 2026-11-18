#!/usr/bin/env node
// Publishes a generated reading: YouTube upload, thumbnail, playlist, then the catalog entry.
//
// Usage: node pipeline/src/publish.js --dir out/reading --id <reading id>
// Needs YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN (and optionally YT_PRIVACY, YT_PLAYLIST_OT, YT_PLAYLIST_NT).
// Locally: node --env-file=.env pipeline/src/publish.js ...
import { parseArgs } from 'node:util';
import { readFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { YouTubeClient, configFromEnv, videoMetadata } from './youtube.js';
import { loadCatalog, findReading, catalogEntry, addReading, CATALOG_PATH } from './catalog.js';
import { partLabel } from './books.js';

export async function publishReading({ dir, id }, { env = process.env, log = console.log, warn = console.warn, client, catalogFile = CATALOG_PATH } = {}) {
  if (!id) throw new Error('A reading id is required (--id).');
  const reading = JSON.parse(await readFile(path.join(dir, 'reading.json'), 'utf8'));

  const existing = findReading(await loadCatalog(catalogFile), id);
  if (existing) {
    log(`Reading ${id} is already published (https://youtu.be/${existing.youtubeId}). Nothing to do.`);
    return { skipped: true, entry: existing };
  }

  const config = configFromEnv(env);
  const yt = client ?? new YouTubeClient(config);
  const metadata = videoMetadata(reading, config.privacy);

  log(`Uploading "${metadata.snippet.title}" (${config.privacy})...`);
  const video = await yt.uploadVideo(path.join(dir, 'output.mp4'), metadata);
  const youtubeId = video.id;
  log(`Uploaded: https://youtu.be/${youtubeId}`);

  // From here on the video exists on YouTube: problems become warnings, and the catalog is always
  // updated, so a re-run never uploads the same reading twice.
  const warnings = [];
  const soft = async (label, fn) => {
    try { await fn(); } catch (err) { warnings.push(`${label}: ${err.message}`); warn(`Warning: ${label}: ${err.message}`); }
  };

  if (video.status?.privacyStatus && video.status.privacyStatus !== config.privacy) {
    const msg = `YouTube set the video to "${video.status.privacyStatus}" instead of "${config.privacy}". `
      + 'Unaudited API projects can only upload private videos: see docs/SETUP, section 2.';
    warnings.push(msg); warn(`Warning: ${msg}`);
  }

  await soft('Thumbnail', () => yt.setThumbnail(youtubeId, path.join(dir, 'thumbnail.jpg')));

  const playlistId = config.playlists[reading.testament];
  if (playlistId) await soft('Playlist', () => yt.addToPlaylist(playlistId, youtubeId));
  else { const msg = `No playlist configured for ${reading.testament} (YT_PLAYLIST_${reading.testament}).`; warnings.push(msg); warn(`Warning: ${msg}`); }

  const entry = catalogEntry(reading, { id, youtubeId });
  await addReading(entry, catalogFile);
  log(`Catalog updated: ${reading.book}, ${partLabel(reading)}`);

  return { skipped: false, entry, title: metadata.snippet.title, warnings };
}

async function main() {
  const { values } = parseArgs({ options: { dir: { type: 'string' }, id: { type: 'string' } } });
  if (!values.dir || !values.id) {
    console.log('Usage: node pipeline/src/publish.js --dir <output dir> --id <reading id>');
    process.exit(1);
  }
  const result = await publishReading(values);

  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `published=${result.skipped ? 'false' : 'true'}\nyoutube_id=${result.entry.youtubeId}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = result.skipped
      ? [`### Já publicado`, '', `Esta leitura já estava no catálogo: https://youtu.be/${result.entry.youtubeId}`, '']
      : [`### Publicado no YouTube`, '', `**${result.title}**`, '', `https://youtu.be/${result.entry.youtubeId}`, '',
        ...(result.warnings.length ? ['Avisos:', ...result.warnings.map((w) => `- ${w}`), ''] : [])];
    await appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  });
}
