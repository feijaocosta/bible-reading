import { json, error } from '@sveltejs/kit';
import { bookPlaylist, bookSlugs } from '$lib/server/catalog.js';

// /<book>/playlist.json: what autoplay plays next (generated at build time).
export const prerender = true;

export function entries() {
  return bookSlugs().map((slug) => ({ book: slug }));
}

export function GET({ params }) {
  const list = bookPlaylist(params.book);
  if (!list.length) error(404, 'Livro não encontrado');
  return json(list);
}
