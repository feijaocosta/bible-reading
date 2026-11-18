// Build-time access to data/books.json and data/readings.json.
// Every page is prerendered from here, so each reading gets a real URL (and a link preview).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { slugify } from '$lib/text.js';
import { t } from '$lib/strings.js';
import { base } from '$app/paths';
import { isReleaseAsset, mediaPath } from '$lib/media.js';

// The build runs from site/; READINGS_FILE lets local previews use sample data.
const DATA = path.resolve(process.cwd(), '..', 'data');
const PART_SEGMENT = { intro: 'introducao', closing: 'encerramento' };
const PART_RANK = { intro: 0, chapter: 1, closing: 2 };
const AVATAR_VARIANTS = 5;

// Release media is served from this site (copied at deploy time); other URLs are used as they are.
const local = (url) => (url && isReleaseAsset(url) ? `${base}${mediaPath(url)}` : url ?? null);

let cache;

function hash(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return h;
}

export function partSegment(r) {
  return r.part === 'chapter' ? String(r.chapter) : PART_SEGMENT[r.part];
}

function partLabel(r) {
  return r.part === 'chapter' ? t.chapter(r.chapter) : (r.part === 'intro' ? t.intro : t.closing).toLowerCase();
}

function load() {
  if (cache) return cache;
  const books = JSON.parse(readFileSync(path.join(DATA, 'books.json'), 'utf8'));
  const readingsFile = process.env.READINGS_FILE ? path.resolve(process.env.READINGS_FILE) : path.join(DATA, 'readings.json');
  const raw = JSON.parse(readFileSync(readingsFile, 'utf8'));
  const bookBySlug = new Map(books.map((b) => [b.slug, b]));

  // Oldest first, so the first reading of a narrator/chapter keeps the shortest URL forever.
  const sorted = [...raw].sort((a, b) => String(a.publishedAt).localeCompare(String(b.publishedAt)));
  const taken = new Set();
  const readings = sorted.filter((r) => bookBySlug.has(r.bookSlug)).map((r) => {
    const seg = partSegment(r);
    const narratorSlug = slugify(r.narrator);
    let slug = narratorSlug;
    for (let i = 2; taken.has(`${r.bookSlug}/${seg}/${slug}`); i++) slug = `${narratorSlug}-${i}`;
    taken.add(`${r.bookSlug}/${seg}/${slug}`);
    const title = r.part === 'chapter' ? `${r.book} ${r.chapter}` : `${r.book} — ${r.part === 'intro' ? t.intro : t.closing}`;
    return {
      id: r.id,
      book: r.book,
      bookSlug: r.bookSlug,
      bookOrder: r.bookOrder,
      testament: r.testament,
      part: r.part,
      chapter: r.chapter,
      segment: seg,
      slug,
      path: `/${r.bookSlug}/${seg}/${slug}/`,
      partPath: `/${r.bookSlug}/${seg}/`,
      title,
      partLabel: partLabel(r),
      narrator: r.narrator,
      narratorSlug,
      narratorPath: `/leitora/${narratorSlug}/`,
      avatar: hash(narratorSlug) % AVATAR_VARIANTS,
      youtubeId: r.youtubeId,
      audioUrl: local(r.audioUrl),
      coverUrl: local(r.coverUrl) ?? (r.youtubeId ? `https://i.ytimg.com/vi/${r.youtubeId}/maxresdefault.jpg` : null),
      durationSec: r.durationSec,
      publishedAt: r.publishedAt,
    };
  });

  const bibleOrder = (a, b) => a.bookOrder - b.bookOrder || PART_RANK[a.part] - PART_RANK[b.part]
    || (a.chapter ?? 0) - (b.chapter ?? 0) || String(a.publishedAt).localeCompare(String(b.publishedAt));
  readings.sort(bibleOrder);
  cache = { books, bookBySlug, readings };
  return cache;
}

// Light reading object for cards and the player (no internal fields).
const card = (r) => r && ({
  id: r.id, title: r.title, book: r.book, bookSlug: r.bookSlug, testament: r.testament, part: r.part, chapter: r.chapter,
  partLabel: r.partLabel, narrator: r.narrator, path: r.path, narratorPath: r.narratorPath, avatar: r.avatar,
  youtubeId: r.youtubeId, audioUrl: r.audioUrl, coverUrl: r.coverUrl, durationSec: r.durationSec, publishedAt: r.publishedAt,
});

export function siteIndex() {
  const { books, readings } = load();
  const withAudio = new Set(readings.map((r) => r.bookSlug));
  const narrators = new Map();
  for (const r of readings) narrators.set(r.narratorSlug, { slug: r.narratorSlug, name: r.narrator, path: r.narratorPath });
  return {
    books: books.filter((b) => withAudio.has(b.slug)).map((b) => ({ slug: b.slug, name: b.name, testament: b.testament })),
    narrators: [...narrators.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  };
}

export function home() {
  const { books, readings } = load();
  const recent = [...readings].sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))).slice(0, 10).map(card);
  const shelf = { OT: [], NT: [] };
  for (const b of books) {
    const mine = readings.filter((r) => r.bookSlug === b.slug);
    if (!mine.length) continue;
    const chaptersDone = new Set(mine.filter((r) => r.part === 'chapter').map((r) => r.chapter)).size;
    shelf[b.testament].push({ slug: b.slug, name: b.name, chapters: b.chapters, chaptersDone, readings: mine.length });
  }
  return { recent, shelf, total: readings.length };
}

export function bookSlugs() {
  return [...new Set(load().readings.map((r) => r.bookSlug))];
}

export function book(slug) {
  const { bookBySlug, readings } = load();
  const b = bookBySlug.get(slug);
  if (!b) return null;
  const mine = readings.filter((r) => r.bookSlug === slug);
  if (!mine.length) return null;
  const has = (seg) => mine.some((r) => r.segment === seg);
  const chapters = Array.from({ length: b.chapters }, (_, i) => ({ n: i + 1, available: has(String(i + 1)), path: `/${slug}/${i + 1}/` }));
  return {
    slug, name: b.name, testament: b.testament, total: b.chapters,
    done: chapters.filter((c) => c.available).length,
    readings: mine.map(card),
    intro: has('introducao') ? `/${slug}/introducao/` : null,
    closing: has('encerramento') ? `/${slug}/encerramento/` : null,
    chapters,
  };
}

// For autoplay: one reading per part (the latest), in Bible order (intro, chapters, closing).
export function bookPlaylist(slug) {
  const latest = new Map();
  for (const r of load().readings.filter((x) => x.bookSlug === slug)) {
    const cur = latest.get(r.segment);
    if (!cur || String(r.publishedAt) > String(cur.publishedAt)) latest.set(r.segment, r);
  }
  return [...latest.values()].sort((a, b) => PART_RANK[a.part] - PART_RANK[b.part] || (a.chapter ?? 0) - (b.chapter ?? 0)).map(card);
}

export function partEntries() {
  return [...new Set(load().readings.map((r) => `${r.bookSlug}/${r.segment}`))].map((k) => {
    const [book, part] = k.split('/');
    return { book, part };
  });
}

export function readingEntries() {
  return load().readings.map((r) => ({ book: r.bookSlug, part: r.segment, narrator: r.slug }));
}

// Everything the listening page needs: the reading, other readings of the same part, previous/next.
export function readingPage(bookSlug, segment, slug) {
  const { readings, bookBySlug } = load();
  const same = readings.filter((r) => r.bookSlug === bookSlug && r.segment === segment);
  if (!same.length) return null;
  const latest = [...same].sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))[0];
  const current = slug ? same.find((r) => r.slug === slug) : latest;
  if (!current) return null;

  // Previous/next part of the same book that has audio (intro → chapters → closing).
  const parts = [];
  for (const r of readings.filter((x) => x.bookSlug === bookSlug)) if (!parts.some((p) => p.segment === r.segment)) parts.push(r);
  const i = parts.findIndex((p) => p.segment === segment);
  const nav = (r) => r && { label: r.part === 'chapter' ? t.chapterTitle(r.chapter) : (r.part === 'intro' ? t.intro : t.closing), path: r.partPath };

  return {
    reading: card(current),
    others: same.filter((r) => r !== current).map(card),
    prev: nav(parts[i - 1]),
    next: nav(parts[i + 1]),
    bookName: bookBySlug.get(bookSlug).name,
  };
}

export function narratorSlugs() {
  return [...new Set(load().readings.map((r) => r.narratorSlug))];
}

export function narrator(slug) {
  const mine = load().readings.filter((r) => r.narratorSlug === slug);
  if (!mine.length) return null;
  return {
    name: mine[0].narrator,
    avatar: mine[0].avatar,
    totalSec: mine.reduce((s, r) => s + (r.durationSec || 0), 0),
    readings: mine.map(card),
  };
}
