import { error } from '@sveltejs/kit';
import { narrator, narratorSlugs } from '$lib/server/catalog.js';

export function entries() {
  return narratorSlugs().map((slug) => ({ narrator: slug }));
}

export function load({ params }) {
  const data = narrator(params.narrator);
  if (!data) error(404, 'Leitora não encontrada');
  return { narrator: data };
}
