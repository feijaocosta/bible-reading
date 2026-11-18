import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sortCatalog, addReading, loadCatalog, catalogEntry } from '../src/catalog.js';

const r = (id, bookOrder, part, chapter, publishedAt = '2026-01-01') => ({ id, bookOrder, part, chapter, publishedAt });

test('catalog is in Bible order: intro, chapters, closing', () => {
  const sorted = sortCatalog([r('a', 59, 'chapter', 2), r('b', 59, 'closing', null), r('c', 1, 'chapter', 1), r('d', 59, 'intro', null), r('e', 59, 'chapter', 1)]);
  assert.deepEqual(sorted.map((x) => x.id), ['c', 'd', 'e', 'a', 'b']);
});

test('addReading writes sorted JSON and refuses duplicates', async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'catalog-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'readings.json');
  assert.deepEqual(await loadCatalog(file), []);
  await addReading(r('x', 40, 'chapter', 5), file);
  await addReading(r('y', 1, 'chapter', 1), file);
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')).map((e) => e.id), ['y', 'x']);
  await assert.rejects(addReading(r('x', 40, 'chapter', 5), file), /already in the catalog/);
});

test('catalog entry has only public fields', () => {
  const entry = catalogEntry({ testament: 'NT', book: 'Tiago', bookSlug: 'tiago', bookOrder: 59, part: 'intro', chapter: null,
    narrator: 'Ana', durationSec: 85, video: '/tmp/x.mp4', artwork: '/tmp/a.png' }, { id: 'f1', youtubeId: 'yt1', publishedAt: 'T' });
  assert.deepEqual(Object.keys(entry), ['id', 'testament', 'book', 'bookSlug', 'bookOrder', 'part', 'chapter', 'narrator', 'youtubeId', 'durationSec', 'publishedAt']);
});
