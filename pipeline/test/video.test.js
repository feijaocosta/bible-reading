import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  createVideo, createThumbnail, assertAudio, probeDuration, probeImageSize,
  MUSIC_LEAD_IN_SECONDS, MUSIC_TAIL_SECONDS,
} from '../src/video.js';

const hasFfmpeg = (() => { try { execFileSync('ffmpeg', ['-version']); return true; } catch { return false; } })();
const ff = (...args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);

test('video gets voice + music lead-in/tail, and a 1280x720 thumbnail', { skip: !hasFfmpeg && 'ffmpeg not installed' }, async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'video-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const image = path.join(dir, 'art.png'), voice = path.join(dir, 'voice.ogg'), short = path.join(dir, 'short.ogg');
  ff('-f', 'lavfi', '-i', 'color=c=pink:s=1920x1080', '-frames:v', '1', image);
  ff('-f', 'lavfi', '-i', 'sine=frequency=220:duration=12', '-c:a', 'libopus', voice);
  ff('-f', 'lavfi', '-i', 'sine=frequency=220:duration=4', '-c:a', 'libopus', short);

  await assert.rejects(assertAudio(short), /minimum is 10s/);

  const output = path.join(dir, 'out.mp4');
  await createVideo({ image, audio: voice, output });
  const expected = 12 + MUSIC_LEAD_IN_SECONDS + MUSIC_TAIL_SECONDS;
  assert.ok(Math.abs((await probeDuration(output)) - expected) < 1, 'duration includes lead-in and tail');

  const thumb = path.join(dir, 'thumb.jpg');
  await createThumbnail({ image, output: thumb });
  assert.deepEqual(await probeImageSize(thumb), { width: 1280, height: 720 });
});
