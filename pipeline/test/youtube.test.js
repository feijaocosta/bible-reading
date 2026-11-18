import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { videoMetadata, configFromEnv, YouTubeClient } from '../src/youtube.js';
import { publishReading } from '../src/publish.js';
import { resolveReading } from '../src/books.js';

const reading = (chapter, narrator = 'Ana Lúcia') => ({ ...resolveReading({ book: 'Tiago', chapter, narrator }), durationSec: 90 });

test('video titles follow the brief', () => {
  assert.equal(videoMetadata(reading('1')).snippet.title, 'Tiago 1 — Leitura por Ana Lúcia');
  assert.equal(videoMetadata(reading('introdução')).snippet.title, 'Tiago — Introdução — Leitura por Ana Lúcia');
  assert.equal(videoMetadata(reading('encerramento')).snippet.title, 'Tiago — Encerramento — Leitura por Ana Lúcia');
  const long = videoMetadata(reading('1', 'A'.repeat(200))).snippet.title;
  assert.equal(long.length, 100);
  assert.match(videoMetadata(reading('1', 'Ana <b>')).snippet.title, /Ana b$/);
  const meta = videoMetadata(reading('2'), 'public');
  assert.equal(meta.status.privacyStatus, 'public');
  assert.match(meta.snippet.description, /^Tiago 2 \(Novo Testamento\)/);
});

test('config requires credentials and a valid privacy', () => {
  assert.throws(() => configFromEnv({}), /YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN/);
  const env = { YT_CLIENT_ID: 'i', YT_CLIENT_SECRET: 's', YT_REFRESH_TOKEN: 'r' };
  assert.equal(configFromEnv(env).privacy, 'unlisted');
  assert.throws(() => configFromEnv({ ...env, YT_PRIVACY: 'secret' }), /YT_PRIVACY/);
});

// Fake fetch that mimics the Google endpoints and records calls.
function fakeGoogle({ failPlaylist = false, quota = false } = {}) {
  const calls = [];
  const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method, auth: init.headers?.authorization });
    if (String(url).startsWith('https://oauth2.googleapis.com/token')) return json(200, { access_token: 'AT' });
    if (String(url).includes('/upload/youtube/v3/videos')) {
      if (quota) return json(403, { error: { message: 'quota', errors: [{ reason: 'quotaExceeded' }] } });
      return new Response(null, { status: 200, headers: { location: 'https://upload.example/session1' } });
    }
    if (String(url) === 'https://upload.example/session1') return json(200, { id: 'VID123', status: { privacyStatus: 'unlisted' } });
    if (String(url).includes('/thumbnails/set')) return json(200, {});
    if (String(url).includes('/playlistItems')) return failPlaylist ? json(404, { error: { message: 'nope', errors: [{ reason: 'playlistNotFound' }] } }) : json(200, {});
    return json(500, {});
  };
  return { calls, fetchImpl };
}

function setup(t) {
  const dir = mkdtempSync(path.join(tmpdir(), 'publish-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(path.join(dir, 'reading.json'), JSON.stringify(reading('1')));
  writeFileSync(path.join(dir, 'output.mp4'), 'video');
  writeFileSync(path.join(dir, 'output.mp3'), 'audio');
  writeFileSync(path.join(dir, 'thumbnail.jpg'), 'jpg');
  const catalogFile = path.join(dir, 'readings.json');
  writeFileSync(catalogFile, '[]');
  const env = { YT_CLIENT_ID: 'i', YT_CLIENT_SECRET: 's', YT_REFRESH_TOKEN: 'r', YT_PLAYLIST_NT: 'PLnt' };
  return { dir, catalogFile, env };
}
const quiet = { log() {}, warn() {} };
// Fake GitHub Releases that records uploads.
const fakeReleases = (uploads = []) => ({
  uploads,
  async ensureRelease(tag) { return { id: 1, tag, assets: [] }; },
  async uploadAsset(release, file, name) { uploads.push(name); return `https://github.com/o/r/releases/download/${release.tag}/${name}`; },
});

test('publish uploads, sets thumbnail, adds to playlist and is idempotent', async (t) => {
  const { dir, catalogFile, env } = setup(t);
  const g = fakeGoogle();
  const client = new YouTubeClient(configFromEnv(env), { fetchImpl: g.fetchImpl });

  const res = await publishReading({ dir, id: 'resp-1' }, { env, client, catalogFile, releases: fakeReleases(), ...quiet });
  assert.equal(res.entry.youtubeId, 'VID123');
  assert.deepEqual(res.warnings, []);
  assert.ok(g.calls.some((c) => c.url.includes('/thumbnails/set')));
  assert.ok(g.calls.some((c) => c.url.includes('/playlistItems')));
  assert.ok(g.calls.filter((c) => c.url.includes('googleapis.com/') && !c.url.includes('oauth2')).every((c) => c.auth === 'Bearer AT'));
  const catalog = JSON.parse(readFileSync(catalogFile, 'utf8'));
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].part, 'chapter');
  assert.match(catalog[0].audioUrl, /releases\/download\/audio-tiago\/tiago-1-ana-lucia-[0-9a-f]{6}\.mp3$/);
  assert.match(catalog[0].coverUrl, /\.jpg$/);

  const again = await publishReading({ dir, id: 'resp-1' }, { env, client, catalogFile, releases: fakeReleases(), ...quiet });
  assert.equal(again.skipped, true);
  assert.equal(g.calls.filter((c) => c.url.includes('/upload/youtube/v3/videos')).length, 1, 'uploaded only once');
});

test('after the upload, a playlist failure is only a warning and the catalog is still updated', async (t) => {
  const { dir, catalogFile, env } = setup(t);
  const client = new YouTubeClient(configFromEnv(env), { fetchImpl: fakeGoogle({ failPlaylist: true }).fetchImpl });
  const res = await publishReading({ dir, id: 'resp-2' }, { env, client, catalogFile, releases: fakeReleases(), ...quiet });
  assert.match(res.warnings[0], /Playlist.*playlistNotFound.*YT_PLAYLIST/s);
  assert.equal(JSON.parse(readFileSync(catalogFile, 'utf8')).length, 1);
});

test('quota errors fail clearly and leave the catalog untouched', async (t) => {
  const { dir, catalogFile, env } = setup(t);
  const client = new YouTubeClient(configFromEnv(env), { fetchImpl: fakeGoogle({ quota: true }).fetchImpl });
  await assert.rejects(publishReading({ dir, id: 'resp-3' }, { env, client, catalogFile, releases: fakeReleases(), ...quiet }), /quotaExceeded.*run it again tomorrow/s);
  assert.equal(JSON.parse(readFileSync(catalogFile, 'utf8')).length, 0);
});
