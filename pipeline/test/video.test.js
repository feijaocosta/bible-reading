import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  createMix, createVideo, createMp3, createThumbnail, assertAudio, probeDuration, probeImageSize,
  MUSIC_LEAD_IN_SECONDS, MUSIC_TAIL_SECONDS,
} from '../src/video.js';

const hasFfmpeg = (() => { try { execFileSync('ffmpeg', ['-version']); return true; } catch { return false; } })();
const ff = (...args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);

test('mix gets music lead-in/tail; MP4, MP3 and a 1280x720 thumbnail are built from it', { skip: !hasFfmpeg && 'ffmpeg not installed' }, async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'video-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const image = path.join(dir, 'art.png'), voice = path.join(dir, 'voice.ogg'), short = path.join(dir, 'short.ogg');
  ff('-f', 'lavfi', '-i', 'color=c=pink:s=1920x1080', '-frames:v', '1', image);
  ff('-f', 'lavfi', '-i', 'sine=frequency=220:duration=12', '-c:a', 'libopus', voice);
  ff('-f', 'lavfi', '-i', 'sine=frequency=220:duration=4', '-c:a', 'libopus', short);

  await assert.rejects(assertAudio(short), /minimum is 10s/);

  const mix = path.join(dir, 'mix.wav');
  await createMix({ audio: voice, output: mix });
  const expected = 12 + MUSIC_LEAD_IN_SECONDS + MUSIC_TAIL_SECONDS;
  assert.ok(Math.abs((await probeDuration(mix)) - expected) < 0.5, 'mix includes lead-in and tail');

  const output = path.join(dir, 'out.mp4');
  await createVideo({ image, mix, output });
  assert.ok(Math.abs((await probeDuration(output)) - expected) < 1, 'video has the mix duration');

  const mp3 = path.join(dir, 'out.mp3');
  await createMp3({ mix, output: mp3, title: 'Tiago, capítulo 1', artist: 'Ana' });
  assert.ok(Math.abs((await probeDuration(mp3)) - expected) < 0.5, 'mp3 has the mix duration');

  const thumb = path.join(dir, 'thumb.jpg');
  await createThumbnail({ image, output: thumb });
  assert.deepEqual(await probeImageSize(thumb), { width: 1280, height: 720 });
});
