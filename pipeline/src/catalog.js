// Reads and writes data/readings.json, the public catalog the PWA reads.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const CATALOG_PATH = fileURLToPath(new URL('../../data/readings.json', import.meta.url));

const PART_RANK = { intro: 0, chapter: 1, closing: 2 };

export async function loadCatalog(file = CATALOG_PATH) {
  try {
    const data = JSON.parse(await readFile(file, 'utf8'));
    if (!Array.isArray(data)) throw new Error('expected a JSON array');
    return data;
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw new Error(`Could not read the catalog ${file}: ${err.message}`);
  }
}

export function findReading(catalog, id) {
  return catalog.find((r) => r.id === id);
}

// Bible order: book, then introduction, chapters, closing; same chapter by publish date.
export function sortCatalog(catalog) {
  return [...catalog].sort((a, b) =>
    a.bookOrder - b.bookOrder
    || PART_RANK[a.part] - PART_RANK[b.part]
    || (a.chapter ?? 0) - (b.chapter ?? 0)
    || String(a.publishedAt).localeCompare(String(b.publishedAt)));
}

// The public entry: only what the app needs (no local file paths).
export function catalogEntry(reading, { id, youtubeId, publishedAt = new Date().toISOString() }) {
  return {
    id,
    testament: reading.testament,
    book: reading.book,
    bookSlug: reading.bookSlug,
    bookOrder: reading.bookOrder,
    part: reading.part,
    chapter: reading.chapter,
    narrator: reading.narrator,
    youtubeId,
    durationSec: reading.durationSec,
    publishedAt,
  };
}

export async function addReading(entry, file = CATALOG_PATH) {
  const catalog = await loadCatalog(file);
  if (findReading(catalog, entry.id)) throw new Error(`Reading ${entry.id} is already in the catalog.`);
  const next = sortCatalog([...catalog, entry]);
  await writeFile(file, JSON.stringify(next, null, 2) + '\n');
  return next;
}
