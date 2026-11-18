// Downloads the reading audio from a URL (direct link, Google Drive or Dropbox share link).
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const MAX_BYTES = 200 * 1024 * 1024;

const EXTENSIONS = {
  'audio/ogg': '.ogg', 'audio/opus': '.opus', 'audio/mpeg': '.mp3', 'audio/mp3': '.mp3',
  'audio/mp4': '.m4a', 'audio/x-m4a': '.m4a', 'audio/aac': '.aac', 'audio/wav': '.wav', 'audio/x-wav': '.wav',
  'video/mp4': '.mp4',
};

export function isUrl(value) {
  return /^https?:\/\//i.test(String(value));
}

// Turns share links into direct-download links.
export function toDirectUrl(input) {
  const url = new URL(input);
  if (/(^|\.)drive\.google\.com$/.test(url.hostname)) {
    const id = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get('id');
    if (!id) throw new Error('Could not find the file id in this Google Drive link.');
    return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`;
  }
  if (/(^|\.)dropbox\.com$/.test(url.hostname)) {
    url.searchParams.set('dl', '1');
    return url.toString();
  }
  return url.toString();
}

export async function downloadAudio(input, dir, { fetchImpl = fetch } = {}) {
  const url = toDirectUrl(input);
  const res = await fetchImpl(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Audio download failed: HTTP ${res.status} ${res.statusText}.`);

  const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (type === 'text/html') {
    throw new Error('The link returned a web page instead of an audio file. For Google Drive, share it as "Anyone with the link".');
  }
  const length = Number(res.headers.get('content-length') || 0);
  if (length > MAX_BYTES) throw new Error(`Audio file is too large (${Math.round(length / 1e6)} MB).`);

  const data = Buffer.from(await res.arrayBuffer());
  if (data.length > MAX_BYTES) throw new Error(`Audio file is too large (${Math.round(data.length / 1e6)} MB).`);
  if (data.length === 0) throw new Error('The downloaded audio file is empty.');

  const fromUrl = path.extname(new URL(url).pathname).toLowerCase();
  const ext = EXTENSIONS[type] ?? (/^\.[a-z0-9]{2,4}$/.test(fromUrl) ? fromUrl : '.audio');
  const file = path.join(dir, `input${ext}`);
  await writeFile(file, data);
  return file;
}
