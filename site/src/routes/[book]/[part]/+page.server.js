import { error } from '@sveltejs/kit';
import { partEntries, readingPage } from '$lib/server/catalog.js';

// /tiago/1/ (or /tiago/introducao/): the latest reading of that part.
export function entries() {
  return partEntries();
}

export function load({ params }) {
  const data = readingPage(params.book, params.part);
  if (!data) error(404, 'Leitura não encontrada');
  return data;
}
