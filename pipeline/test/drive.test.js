import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { serviceAccountAssertion, downloadDriveFile, parseServiceAccount } from '../src/drive.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const key = { client_email: 'reader@proj.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };

test('service account assertion is a valid RS256 JWT', () => {
  const jwt = serviceAccountAssertion(key, 1000);
  const [h, c, sig] = jwt.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(h, 'base64url')), { alg: 'RS256', typ: 'JWT' });
  const claims = JSON.parse(Buffer.from(c, 'base64url'));
  assert.equal(claims.iss, key.client_email);
  assert.equal(claims.scope, 'https://www.googleapis.com/auth/drive.readonly');
  assert.equal(claims.exp - claims.iat, 3600);
  assert.ok(createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, Buffer.from(sig, 'base64url')));
});

test('invalid credentials fail with a clear message', () => {
  assert.throws(() => parseServiceAccount('{oops'), /not valid JSON/);
  assert.throws(() => parseServiceAccount('{}'), /client_email or private_key/);
});

function fakeDrive({ mimeType = 'audio/mp4', status = 200 } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), auth: init.headers?.authorization });
    if (String(url).startsWith('https://oauth2.googleapis.com/token')) return Response.json({ access_token: 'DT' });
    if (status !== 200) return Response.json({ error: { message: 'File not found' } }, { status });
    if (String(url).includes('alt=media')) return new Response('audio-bytes');
    return Response.json({ name: 'AUDIO-2026-11-14.m4a', mimeType, size: '11' });
  };
  return { calls, fetchImpl };
}

test('downloads a Drive file with the service account token', async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'drive-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const g = fakeDrive();
  const file = await downloadDriveFile('1AbCdEfGhIjKlMn', dir, { credentials: JSON.stringify(key), fetchImpl: g.fetchImpl });
  assert.equal(path.basename(file), 'input.m4a');
  assert.equal(readFileSync(file, 'utf8'), 'audio-bytes');
  assert.ok(g.calls.slice(1).every((c) => c.auth === 'Bearer DT'));
});

test('rejects non-audio files, missing access and bad ids', async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'drive-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const credentials = JSON.stringify(key);
  await assert.rejects(downloadDriveFile('1AbCdEfGhIjKlMn', dir, { credentials, fetchImpl: fakeDrive({ mimeType: 'application/pdf' }).fetchImpl }), /is not audio/);
  await assert.rejects(downloadDriveFile('1AbCdEfGhIjKlMn', dir, { credentials, fetchImpl: fakeDrive({ status: 404 }).fetchImpl }), /Share the form's upload folder/);
  await assert.rejects(downloadDriveFile('../etc', dir, { credentials }), /Invalid Google Drive file id/);
  await assert.rejects(downloadDriveFile('1AbCdEfGhIjKlMn', dir, { credentials: '' }), /GOOGLE_SA_JSON is not set/);
});
