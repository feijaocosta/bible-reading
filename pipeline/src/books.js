// Book catalog lookup and validation, backed by data/books.json (NVI names).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BOOKS_PATH = fileURLToPath(new URL('../../data/books.json', import.meta.url));

export const TESTAMENT_LABELS = { OT: 'Antigo Testamento', NT: 'Novo Testamento' };

let cache;
export function loadBooks() {
  cache ??= JSON.parse(readFileSync(BOOKS_PATH, 'utf8'));
  return cache;
}

// Case- and accent-insensitive key, so "genesis", "Gênesis" and "GÊNESIS" all match.
export function normalize(text) {
  return String(text).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function findBook(nameOrSlug) {
  const key = normalize(nameOrSlug);
  return loadBooks().find((b) => normalize(b.name) === key || b.slug === key.replace(/ /g, '-') || normalize(b.nameEn) === key);
}

// Validates a reading request and returns a normalized reading, or throws with a clear message.
export function resolveReading({ book, chapter, narrator, testament }) {
  const found = findBook(book ?? '');
  if (!found) throw new Error(`Unknown book "${book}". Use a name from data/books.json, e.g. "Gênesis".`);

  const chapterNum = Number(chapter);
  if (!Number.isInteger(chapterNum) || chapterNum < 1 || chapterNum > found.chapters) {
    throw new Error(`Invalid chapter "${chapter}" for ${found.name}: it has chapters 1 to ${found.chapters}.`);
  }

  if (testament && String(testament).toUpperCase() !== found.testament) {
    throw new Error(`${found.name} belongs to testament ${found.testament}, but "${testament}" was given.`);
  }

  const narratorName = String(narrator ?? '').replace(/\s+/g, ' ').trim();
  if (!narratorName) throw new Error('Narrator name is required.');

  return {
    book: found.name,
    bookSlug: found.slug,
    bookOrder: found.order,
    chapter: chapterNum,
    testament: found.testament,
    testamentLabel: TESTAMENT_LABELS[found.testament],
    narrator: narratorName,
  };
}
