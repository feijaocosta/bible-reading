// Minimal YouTube Data API v3 client (OAuth refresh token + resumable upload), using Node's built-in fetch.
import { readFile, stat } from 'node:fs/promises';
import { partLabel, PART_LABELS } from './books.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/youtube/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/youtube/v3';

export const PRIVACY_VALUES = ['public', 'unlisted', 'private'];
const TITLE_MAX = 100;
// "Education" fits a Bible reading better than the generic categories.
const CATEGORY_EDUCATION = '27';

export class YouTubeError extends Error {
  constructor(message, { status, reason } = {}) {
    super(message);
    this.status = status;
    this.reason = reason;
  }
}

// Human-friendly explanations for the API errors we are most likely to hit.
const HINTS = {
  quotaExceeded: 'The daily YouTube API quota is used up. The video is saved as an artifact; run it again tomorrow.',
  uploadLimitExceeded: 'The channel reached its daily upload limit. Run it again tomorrow.',
  invalid_grant: 'The YouTube refresh token expired or was revoked. Generate a new one (docs/SETUP, section 2) and update the YT_REFRESH_TOKEN secret.',
  forbidden: 'The account is not allowed to do this. Check that the token belongs to the channel that owns the playlists.',
  playlistNotFound: 'Playlist not found. Check the YT_PLAYLIST_OT / YT_PLAYLIST_NT variables.',
};

async function apiError(res, context) {
  let reason = '', message = res.statusText;
  try {
    const body = await res.json();
    reason = body.error?.errors?.[0]?.reason || (typeof body.error === 'string' ? body.error : '') || '';
    message = body.error?.message || body.error_description || message;
  } catch { /* body was not JSON */ }
  const hint = HINTS[reason] ? `\n${HINTS[reason]}` : '';
  return new YouTubeError(`${context} failed (HTTP ${res.status}${reason ? `, ${reason}` : ''}): ${message}${hint}`, { status: res.status, reason });
}

export function configFromEnv(env = process.env) {
  const missing = ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'].filter((k) => !env[k]);
  if (missing.length) throw new Error(`Missing YouTube credentials: ${missing.join(', ')}. See docs/SETUP, section 2.`);
  const privacy = (env.YT_PRIVACY || 'unlisted').toLowerCase();
  if (!PRIVACY_VALUES.includes(privacy)) throw new Error(`YT_PRIVACY must be one of ${PRIVACY_VALUES.join(', ')}, got "${env.YT_PRIVACY}".`);
  return {
    clientId: env.YT_CLIENT_ID,
    clientSecret: env.YT_CLIENT_SECRET,
    refreshToken: env.YT_REFRESH_TOKEN,
    privacy,
    playlists: { OT: env.YT_PLAYLIST_OT || '', NT: env.YT_PLAYLIST_NT || '' },
  };
}

// Video title and description (user-facing, in Portuguese).
export function videoMetadata(reading, privacy = 'unlisted') {
  const clean = (s) => String(s).replace(/[<>]/g, '').trim(); // YouTube rejects < and > in titles
  const part = reading.part === 'chapter' ? `${reading.chapter}` : `— ${PART_LABELS[reading.part]}`;
  let title = clean(`${reading.book} ${part} — Leitura por ${reading.narrator}`);
  if (title.length > TITLE_MAX) title = title.slice(0, TITLE_MAX - 1).trimEnd() + '…';

  const reference = reading.part === 'chapter' ? `${reading.book} ${reading.chapter}` : `${reading.book}, ${partLabel(reading)}`;
  const description = [
    `${reference} (${reading.testamentLabel}), Nova Versão Internacional (NVI).`,
    `Leitura: ${clean(reading.narrator)}`,
    '',
    'Bíblia lida por elas: mulheres lendo a Bíblia em voz alta, capítulo a capítulo.',
  ].join('\n');

  return {
    snippet: {
      title,
      description,
      tags: ['Bíblia', 'leitura bíblica', 'Bíblia lida por elas', reading.book, reading.testamentLabel],
      categoryId: CATEGORY_EDUCATION,
      defaultLanguage: 'pt-BR',
      defaultAudioLanguage: 'pt-BR',
    },
    status: { privacyStatus: privacy, selfDeclaredMadeForKids: false, embeddable: true },
  };
}

export class YouTubeClient {
  constructor({ clientId, clientSecret, refreshToken }, { fetchImpl = fetch } = {}) {
    Object.assign(this, { clientId, clientSecret, refreshToken, fetch: fetchImpl });
  }

  async token() {
    if (this.accessToken) return this.accessToken;
    const res = await this.fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId, client_secret: this.clientSecret,
        refresh_token: this.refreshToken, grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) throw await apiError(res, 'YouTube authorization');
    this.accessToken = (await res.json()).access_token;
    return this.accessToken;
  }

  async auth(extra = {}) {
    return { authorization: `Bearer ${await this.token()}`, ...extra };
  }

  // Resumable upload: one request with the metadata, then one with the file bytes.
  async uploadVideo(file, metadata) {
    const size = (await stat(file)).size;
    const init = await this.fetch(`${UPLOAD_API}/videos?uploadType=resumable&part=snippet,status`, {
      method: 'POST',
      headers: await this.auth({
        'content-type': 'application/json; charset=UTF-8',
        'x-upload-content-type': 'video/mp4',
        'x-upload-content-length': String(size),
      }),
      body: JSON.stringify(metadata),
    });
    if (!init.ok) throw await apiError(init, 'Video upload (start)');
    const location = init.headers.get('location');
    if (!location) throw new YouTubeError('Video upload (start) returned no upload URL.');

    const res = await this.fetch(location, {
      method: 'PUT',
      headers: await this.auth({ 'content-type': 'video/mp4', 'content-length': String(size) }),
      body: await readFile(file),
    });
    if (!res.ok) throw await apiError(res, 'Video upload');
    return res.json();
  }

  async setThumbnail(videoId, jpegFile) {
    const res = await this.fetch(`${UPLOAD_API}/thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`, {
      method: 'POST',
      headers: await this.auth({ 'content-type': 'image/jpeg' }),
      body: await readFile(jpegFile),
    });
    if (!res.ok) throw await apiError(res, 'Thumbnail');
    return res.json();
  }

  async addToPlaylist(playlistId, videoId) {
    const res = await this.fetch(`${API}/playlistItems?part=snippet`, {
      method: 'POST',
      headers: await this.auth({ 'content-type': 'application/json' }),
      body: JSON.stringify({ snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } } }),
    });
    if (!res.ok) throw await apiError(res, 'Add to playlist');
    return res.json();
  }
}
