// Book catalog lookup and validation, backed by data/books.json (NVI names).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BOOKS_PATH = fileURLToPath(new URL('../../data/books.json', import.meta.url));

export const TESTAMENT_LABELS = { OT: 'Antigo Testamento', NT: 'Novo Testamento' };

// A reading is a chapter, or an optional introduction/closing for the whole book.
export const PARTS = ['intro', 'chapter', 'closing'];
const PART_ALIASES = {
  intro: 'intro', introduction: 'intro', introducao: 'intro',
  closing: 'closing', encerramento: 'closing', conclusao: 'closing',
};
export const PART_LABELS = { intro: 'Introdução', closing: 'Encerramento' };

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

// "1".."n" -> chapter; "intro"/"introdução" and "closing"/"encerramento" -> book intro/closing.
export function parsePart(value, book) {
  const alias = PART_ALIASES[normalize(value ?? '')];
  if (alias) return { part: alias, chapter: null };
  const chapterNum = Number(value);
  if (!Number.isInteger(chapterNum) || chapterNum < 1 || chapterNum > book.chapters) {
    throw new Error(`Invalid chapter "${value}" for ${book.name}: use 1 to ${book.chapters}, "introdução" or "encerramento".`);
  }
  return { part: 'chapter', chapter: chapterNum };
}

// Short user-facing label: "capítulo 3", "introdução", "encerramento".
export function partLabel({ part, chapter }) {
  return part === 'chapter' ? `capítulo ${chapter}` : PART_LABELS[part].toLowerCase();
}

// Stable id fragment for file names and URLs: "3", "intro", "closing".
export function partKey({ part, chapter }) {
  return part === 'chapter' ? String(chapter) : part;
}

// Validates a reading request and returns a normalized reading, or throws with a clear message.
export function resolveReading({ book, chapter, narrator, testament }) {
  const found = findBook(book ?? '');
  if (!found) throw new Error(`Unknown book "${book}". Use a name from data/books.json, e.g. "Gênesis".`);

  const { part, chapter: chapterNum } = parsePart(chapter, found);

  if (testament && String(testament).toUpperCase() !== found.testament) {
    throw new Error(`${found.name} belongs to testament ${found.testament}, but "${testament}" was given.`);
  }

  const narratorName = String(narrator ?? '').replace(/\s+/g, ' ').trim();
  if (!narratorName) throw new Error('Narrator name is required.');

  return {
    book: found.name,
    bookSlug: found.slug,
    bookOrder: found.order,
    part,
    chapter: chapterNum,
    testament: found.testament,
    testamentLabel: TESTAMENT_LABELS[found.testament],
    narrator: narratorName,
  };
}
