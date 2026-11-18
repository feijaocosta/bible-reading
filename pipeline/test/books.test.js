import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadBooks, findBook, resolveReading } from '../src/books.js';

test('catalog has the 66 books and 1189 chapters', () => {
  const books = loadBooks();
  assert.equal(books.length, 66);
  assert.equal(books.filter((b) => b.testament === 'OT').length, 39);
  assert.equal(books.reduce((sum, b) => sum + b.chapters, 0), 1189);
});

test('book lookup ignores case and accents', () => {
  assert.equal(findBook('genesis').name, 'Gênesis');
  assert.equal(findBook('GÊNESIS').slug, 'genesis');
  assert.equal(findBook('cantico dos canticos').name, 'Cântico dos Cânticos');
  assert.equal(findBook('1 tessalonicenses').slug, '1-tessalonicenses');
  assert.equal(findBook('Revelation').name, 'Apocalipse');
});

test('resolveReading validates chapter, testament and narrator', () => {
  const r = resolveReading({ book: 'Salmos', chapter: '23', narrator: '  Ana  Lúcia ', testament: 'ot' });
  assert.deepEqual(
    { book: r.book, chapter: r.chapter, testament: r.testament, narrator: r.narrator },
    { book: 'Salmos', chapter: 23, testament: 'OT', narrator: 'Ana Lúcia' },
  );
  assert.throws(() => resolveReading({ book: 'Salmos', chapter: 151, narrator: 'A' }), /chapters 1 to 150/);
  assert.throws(() => resolveReading({ book: 'Salmos', chapter: 0, narrator: 'A' }), /Invalid chapter/);
  assert.throws(() => resolveReading({ book: 'Romanos', chapter: 1, narrator: 'A', testament: 'OT' }), /testament NT/);
  assert.throws(() => resolveReading({ book: 'Livro X', chapter: 1, narrator: 'A' }), /Unknown book/);
  assert.throws(() => resolveReading({ book: 'Rute', chapter: 1, narrator: ' ' }), /Narrator/);
});
