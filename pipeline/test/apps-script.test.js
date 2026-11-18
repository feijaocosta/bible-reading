// Runs the pure parts of apps-script/Code.gs in Node (the Google services are not needed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const code = readFileSync(new URL('../../apps-script/Code.gs', import.meta.url), 'utf8');
const gs = vm.createContext({});
vm.runInContext(code, gs);

const answers = (over = {}) => ({
  'Nome de quem leu': '  Ana   Lúcia ',
  Livro: 'Tiago',
  'Parte da leitura': 'Capítulo',
  'Capítulo': '3',
  'Áudio': ['1AbCdEfGhIjKl'],
  'Conferência': ['Ouvi e validei esta leitura'],
  ...over,
});

test('builds the dispatch payload from the form answers', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(gs.buildPayload(answers(), 'resp-1'))),
    { id: 'resp-1', book: 'Tiago', part: 'chapter', chapter: 3, narrator: 'Ana Lúcia', driveFileId: '1AbCdEfGhIjKl' });
});

test('introduction and closing ignore the chapter number', () => {
  const intro = gs.buildPayload(answers({ 'Parte da leitura': 'Introdução', 'Capítulo': '' }), 'r');
  assert.equal(intro.part, 'intro');
  assert.equal(intro.chapter, null);
  assert.equal(gs.buildPayload(answers({ 'Parte da leitura': 'Encerramento', 'Capítulo': '7' }), 'r').chapter, null);
});

test('missing or invalid answers fail in Portuguese', () => {
  assert.throws(() => gs.buildPayload(answers({ 'Capítulo': '' }), 'r'), /número do capítulo/);
  assert.throws(() => gs.buildPayload(answers({ 'Áudio': [] }), 'r'), /Faltou o áudio/);
  assert.throws(() => gs.buildPayload(answers({ 'Conferência': [] }), 'r'), /validada/);
  assert.throws(() => gs.buildPayload(answers({ 'Nome de quem leu': ' ' }), 'r'), /nome de quem leu/);
  assert.throws(() => gs.buildPayload(answers({ 'Parte da leitura': 'Outra' }), 'r'), /parte da leitura/);
});
