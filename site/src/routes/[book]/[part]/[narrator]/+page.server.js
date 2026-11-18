import { error } from '@sveltejs/kit';
import { readingEntries, readingPage } from '$lib/server/catalog.js';

// /tiago/1/daniela-nunes/: one specific reading (the link the share button sends).
export function entries() {
  return readingEntries();
}

export function load({ params }) {
  const data = readingPage(params.book, params.part, params.narrator);
  if (!data) error(404, 'Leitura não encontrada');
  return data;
}
