// Downloads the reading audio from Google Drive with a service account (no third-party libraries).
// The service account only needs Viewer access to the form's upload folder.
import { createSign } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const MAX_BYTES = 200 * 1024 * 1024;

const b64url = (value) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');

export function parseServiceAccount(json) {
  let key;
  try { key = typeof json === 'string' ? JSON.parse(json) : json; } catch {
    throw new Error('GOOGLE_SA_JSON is not valid JSON. Paste the whole service account key file (docs/SETUP, section 3).');
  }
  if (!key?.client_email || !key?.private_key) throw new Error('GOOGLE_SA_JSON is missing client_email or private_key.');
  return key;
}

// Signed JWT for the OAuth "service account" flow (RFC 7523).
export function serviceAccountAssertion(key, now = Math.floor(Date.now() / 1000)) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = { iss: key.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 };
  const unsigned = `${b64url(header)}.${b64url(claims)}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key).toString('base64url');
  return `${unsigned}.${signature}`;
}

async function failure(res, context) {
  let detail = res.statusText;
  try { const body = await res.json(); detail = body.error?.message || body.error_description || body.error || detail; } catch { /* not JSON */ }
  const hint = res.status === 404
    ? '\nThe service account cannot see this file. Share the form\'s upload folder with the service account e-mail (Viewer).'
    : '';
  return new Error(`${context} failed (HTTP ${res.status}): ${detail}${hint}`);
}

export async function driveAccessToken(key, { fetchImpl = fetch } = {}) {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: serviceAccountAssertion(key) }),
  });
  if (!res.ok) throw await failure(res, 'Google Drive authorization');
  return (await res.json()).access_token;
}

export async function downloadDriveFile(fileId, dir, { credentials = process.env.GOOGLE_SA_JSON, fetchImpl = fetch } = {}) {
  if (!/^[\w-]{10,}$/.test(String(fileId))) throw new Error(`Invalid Google Drive file id: "${fileId}".`);
  if (!credentials) throw new Error('GOOGLE_SA_JSON is not set. See docs/SETUP, section 3.');
  const key = parseServiceAccount(credentials);
  const token = await driveAccessToken(key, { fetchImpl });
  const auth = { authorization: `Bearer ${token}` };
  const id = encodeURIComponent(fileId);

  const metaRes = await fetchImpl(`${DRIVE_API}/${id}?fields=name,mimeType,size&supportsAllDrives=true`, { headers: auth });
  if (!metaRes.ok) throw await failure(metaRes, 'Google Drive file lookup');
  const meta = await metaRes.json();
  if (Number(meta.size) > MAX_BYTES) throw new Error(`Audio file is too large (${Math.round(meta.size / 1e6)} MB).`);
  if (meta.mimeType && !/^(audio|video)\//.test(meta.mimeType)) {
    throw new Error(`The uploaded file "${meta.name}" is not audio (${meta.mimeType}).`);
  }

  const res = await fetchImpl(`${DRIVE_API}/${id}?alt=media&supportsAllDrives=true`, { headers: auth });
  if (!res.ok) throw await failure(res, 'Google Drive download');
  const data = Buffer.from(await res.arrayBuffer());
  if (!data.length) throw new Error('The downloaded audio file is empty.');

  const ext = (path.extname(meta.name || '').toLowerCase().match(/^\.[a-z0-9]{2,4}$/) || ['.audio'])[0];
  const file = path.join(dir, `input${ext}`);
  await writeFile(file, data);
  return file;
}
