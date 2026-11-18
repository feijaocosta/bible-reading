import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { addAppAudio } from '../src/app-audio.js';
import { driveIdFromUrl } from '../src/download.js';
import { resolveReading } from '../src/books.js';

test('Drive links give the file id; other links give null', () => {
  assert.equal(driveIdFromUrl('https://drive.google.com/file/d/1AbC_d-9/view?usp=drive_link'), '1AbC_d-9');
  assert.equal(driveIdFromUrl('https://drive.google.com/open?id=XYZ123'), 'XYZ123');
  assert.equal(driveIdFromUrl('https://example.org/a.mp3'), null);
  assert.equal(driveIdFromUrl('not a url'), null);
});

test('adds audio to an older reading from its catalog details, without touching YouTube', async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'app-audio-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const catalogFile = path.join(dir, 'readings.json');
  const old = { id: 'r1', testament: 'NT', book: 'Tiago', bookSlug: 'tiago', bookOrder: 59, part: 'intro', chapter: null,
    narrator: 'Silceia Jacinto', youtubeId: 'YT1', durationSec: 85, publishedAt: '2026-11-18T12:53:45Z' };
  writeFileSync(catalogFile, JSON.stringify([old]));

  let asked;
  const fakeProcess = async (details) => {
    asked = details;
    return { ...resolveReading(details), mp3: '/x/output.mp3', thumbnail: '/x/thumbnail.jpg', durationSec: 86 };
  };
  const releases = {
    async ensureRelease(tag) { return { id: 1, tag, assets: [] }; },
    async uploadAsset(rel, file, name) { return `https://github.com/o/r/releases/download/${rel.tag}/${name}`; },
  };
  const quiet = { log() {} };

  const res = await addAppAudio({ id: 'r1', audio: 'drive:abc', outDir: dir }, { releases, catalogFile, process: fakeProcess, ...quiet });
  assert.equal(res.updated, true);
  assert.deepEqual({ book: asked.book, chapter: asked.chapter, narrator: asked.narrator }, { book: 'Tiago', chapter: 'intro', narrator: 'Silceia Jacinto' });
  const saved = JSON.parse(readFileSync(catalogFile, 'utf8'))[0];
  assert.match(saved.audioUrl, /audio-tiago\/tiago-intro-silceia-jacinto-[0-9a-f]{6}\.mp3$/);
  assert.equal(saved.youtubeId, 'YT1');
  assert.equal(saved.publishedAt, old.publishedAt);

  const again = await addAppAudio({ id: 'r1', audio: 'drive:abc', outDir: dir }, { releases, catalogFile, process: fakeProcess, ...quiet });
  assert.equal(again.updated, false, 'skips when audio already exists');
  await assert.rejects(addAppAudio({ id: 'nope', audio: 'x', outDir: dir }, { releases, catalogFile, process: fakeProcess, ...quiet }), /not in data\/readings.json/);
});
