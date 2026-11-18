import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { toDirectUrl, isUrl, downloadAudio } from '../src/download.js';

test('share links become direct download links', () => {
  const direct = 'https://drive.usercontent.google.com/download?id=ABC123&export=download&confirm=t';
  assert.equal(toDirectUrl('https://drive.google.com/file/d/ABC123/view?usp=sharing'), direct);
  assert.equal(toDirectUrl('https://drive.google.com/open?id=ABC123'), direct);
  assert.equal(toDirectUrl('https://drive.google.com/uc?id=ABC123&export=download'), direct);
  assert.equal(toDirectUrl('https://www.dropbox.com/s/x/a.ogg?dl=0'), 'https://www.dropbox.com/s/x/a.ogg?dl=1');
  assert.equal(toDirectUrl('https://example.org/a.mp3'), 'https://example.org/a.mp3');
  assert.ok(isUrl('https://x.y/a') && !isUrl('/tmp/a.ogg'));
});

test('downloads audio and rejects HTML pages and errors', async (t) => {
  const server = createServer((req, res) => {
    if (req.url === '/a.ogg') { res.writeHead(200, { 'content-type': 'audio/ogg' }); res.end('OggS-data'); }
    else if (req.url === '/page') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end('<html>'); }
    else { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const dir = mkdtempSync(path.join(tmpdir(), 'dl-test-'));
  t.after(() => { server.close(); rmSync(dir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;

  const file = await downloadAudio(`${base}/a.ogg`, dir);
  assert.equal(path.basename(file), 'input.ogg');
  assert.equal(readFileSync(file, 'utf8'), 'OggS-data');
  await assert.rejects(downloadAudio(`${base}/page`, dir), /web page instead of an audio file/);
  await assert.rejects(downloadAudio(`${base}/missing`, dir), /HTTP 404/);
});
