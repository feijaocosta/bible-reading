import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { GitHubReleases, storeAppMedia, assetBaseName, slugify } from '../src/releases.js';
import { resolveReading } from '../src/books.js';

test('asset names are stable, ascii and unique per reading', () => {
  const r = resolveReading({ book: 'Cântico dos Cânticos', chapter: 'introdução', narrator: 'Ana Lúcia' });
  assert.match(assetBaseName(r, 'resp-1'), /^canticos-intro-ana-lucia-[0-9a-f]{6}$/);
  assert.equal(assetBaseName(r, 'resp-1'), assetBaseName(r, 'resp-1'));
  assert.notEqual(assetBaseName(r, 'resp-1'), assetBaseName(r, 'resp-2'));
  assert.equal(slugify('  Maria  da Conceição! '), 'maria-da-conceicao');
});

test('creates the book release once, replaces an existing asset and uploads both files', async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'rel-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(path.join(dir, 'a.mp3'), 'mp3'); writeFileSync(path.join(dir, 'c.jpg'), 'jpg');
  const reading = resolveReading({ book: 'Tiago', chapter: '1', narrator: 'Daniela Nunes' });
  const base = assetBaseName(reading, 'id-9');

  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push(`${init.method || 'GET'} ${url}`);
    if (url.endsWith('/releases/tags/audio-tiago')) return new Response('{}', { status: 404 });
    if (url.endsWith('/releases') && init.method === 'POST') {
      assert.equal(JSON.parse(init.body).tag_name, 'audio-tiago');
      return Response.json({ id: 7, assets: [{ id: 99, name: `${base}.mp3` }] }, { status: 201 });
    }
    if (init.method === 'DELETE') return new Response(null, { status: 204 });
    if (url.startsWith('https://uploads.github.com/')) {
      const name = new URL(url).searchParams.get('name');
      return Response.json({ browser_download_url: `https://github.com/o/r/releases/download/audio-tiago/${name}` }, { status: 201 });
    }
    return new Response('{}', { status: 500 });
  };
  const client = new GitHubReleases({ token: 't', repository: 'o/r' }, { fetchImpl });
  const media = await storeAppMedia(reading, 'id-9', { mp3: path.join(dir, 'a.mp3'), cover: path.join(dir, 'c.jpg') }, client);
  assert.equal(media.audioUrl, `https://github.com/o/r/releases/download/audio-tiago/${base}.mp3`);
  assert.equal(media.coverUrl, `https://github.com/o/r/releases/download/audio-tiago/${base}.jpg`);
  assert.ok(calls.includes('DELETE https://api.github.com/repos/o/r/releases/assets/99'), 'old asset replaced');
  assert.throws(() => new GitHubReleases({}), /GITHUB_TOKEN and GITHUB_REPOSITORY/);
});
