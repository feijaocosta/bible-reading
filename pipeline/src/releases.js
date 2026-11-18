// Stores the app's audio (MP3) and cover (JPG) as GitHub Release assets: free, public downloads.
// One release per book (tag "audio-<book-slug>"); asset names are stable, so a re-run replaces them.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { partKey, normalize } from './books.js';

const API = 'https://api.github.com';
const UPLOADS = 'https://uploads.github.com';

export function slugify(text) {
  return normalize(text).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'leitura';
}

// e.g. "tiago-1-daniela-nunes-3f9a1c"; the short hash of the reading id keeps names unique.
export function assetBaseName(reading, id) {
  const hash = createHash('sha256').update(String(id)).digest('hex').slice(0, 6);
  return `${reading.bookSlug}-${partKey(reading)}-${slugify(reading.narrator)}-${hash}`;
}

export function releaseTag(reading) {
  return `audio-${reading.bookSlug}`;
}

export class GitHubReleases {
  constructor({ token, repository }, { fetchImpl = fetch } = {}) {
    if (!token || !repository) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required to store the app audio.');
    Object.assign(this, { token, repository, fetch: fetchImpl });
  }

  headers(extra = {}) {
    return { authorization: `Bearer ${this.token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...extra };
  }

  async request(url, init = {}, context = 'GitHub request') {
    const res = await this.fetch(url, { ...init, headers: this.headers(init.headers) });
    if (!res.ok && res.status !== 404) {
      let detail = res.statusText;
      try { detail = (await res.json()).message || detail; } catch { /* not JSON */ }
      throw new Error(`${context} failed (HTTP ${res.status}): ${detail}`);
    }
    return res;
  }

  async ensureRelease(tag, bookName) {
    const found = await this.request(`${API}/repos/${this.repository}/releases/tags/${encodeURIComponent(tag)}`, {}, 'Release lookup');
    if (found.status !== 404) return found.json();
    const created = await this.request(`${API}/repos/${this.repository}/releases`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tag_name: tag,
        name: `Áudios — ${bookName}`,
        body: `Áudios das leituras de ${bookName} usados pelo app Bíblia lida por elas. Gerado automaticamente.`,
        make_latest: 'false',
      }),
    }, 'Release creation');
    return created.json();
  }

  async uploadAsset(release, file, name, contentType) {
    const existing = (release.assets || []).find((a) => a.name === name);
    if (existing) await this.request(`${API}/repos/${this.repository}/releases/assets/${existing.id}`, { method: 'DELETE' }, 'Old asset removal');
    const data = await readFile(file);
    const res = await this.request(`${UPLOADS}/repos/${this.repository}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { 'content-type': contentType, 'content-length': String(data.length) },
      body: data,
    }, `Upload of ${name}`);
    return (await res.json()).browser_download_url;
  }
}

// Uploads the MP3 and the cover; returns their public URLs.
export async function storeAppMedia(reading, id, { mp3, cover }, client) {
  const release = await client.ensureRelease(releaseTag(reading), reading.book);
  const base = assetBaseName(reading, id);
  const audioUrl = await client.uploadAsset(release, mp3, `${base}.mp3`, 'audio/mpeg');
  const coverUrl = await client.uploadAsset(release, cover, `${base}.jpg`, 'image/jpeg');
  return { audioUrl, coverUrl };
}
