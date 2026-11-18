import { error } from '@sveltejs/kit';
import { book, bookSlugs } from '$lib/server/catalog.js';

export function entries() {
  return bookSlugs().map((slug) => ({ book: slug }));
}

export function load({ params }) {
  const data = book(params.book);
  if (!data) error(404, 'Livro não encontrado');
  return { book: data };
}
