// FFmpeg helpers: probe media, build the still-image video and the YouTube thumbnail.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);

export const MIN_AUDIO_SECONDS = 10;

async function exec(cmd, args) {
  try {
    return await run(cmd, args, { maxBuffer: 32 * 1024 * 1024 });
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error(`"${cmd}" was not found. Install FFmpeg (it includes ffprobe) and try again.`);
    const detail = (err.stderr || err.message).toString().trim().split('\n').slice(-15).join('\n');
    throw new Error(`${cmd} failed:\n${detail}`);
  }
}

export async function probeDuration(file) {
  const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  const seconds = Number.parseFloat(stdout);
  if (!Number.isFinite(seconds)) throw new Error(`Could not read the duration of ${file}.`);
  return seconds;
}

export async function probeImageSize(file) {
  const { stdout } = await exec('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file]);
  const [width, height] = stdout.trim().split('x').map(Number);
  return { width, height };
}

export async function assertAudio(file) {
  const duration = await probeDuration(file);
  if (duration < MIN_AUDIO_SECONDS) {
    throw new Error(`The audio is only ${duration.toFixed(1)}s long; the minimum is ${MIN_AUDIO_SECONDS}s. Was the right file sent?`);
  }
  return duration;
}

export const BACKGROUND_MUSIC = fileURLToPath(new URL('../template/assets/audio/pad.flac', import.meta.url));
export const MUSIC_LEAD_IN_SECONDS = 2.5; // music alone before the voice starts
export const MUSIC_TAIL_SECONDS = 4; // music fading out after the voice ends

// Audio mix (done once; the MP4 and the MP3 are encoded from it):
//  - voice: high-pass to remove rumble + a short, subtle "room" reverb so phone recordings don't sound dry;
//  - music: looped pad, softened and reverberated, faded in/out, ducked by the voice (sidechain compression);
//  - final loudnorm evens out the very different levels of WhatsApp recordings.
// Inputs: [0:a] voice, [1:a] looped background music.
export function audioFilter(totalSeconds) {
  const lead = MUSIC_LEAD_IN_SECONDS, fadeOutAt = (totalSeconds - MUSIC_TAIL_SECONDS).toFixed(3), total = totalSeconds.toFixed(3);
  return [
    `[0:a]highpass=f=80,aecho=1.0:0.85:23|41|67:0.20|0.13|0.07,aformat=channel_layouts=stereo,`
      + `adelay=${lead}s:all=1,apad=whole_dur=${total},asplit=2[voice][sidechain]`,
    `[1:a]atrim=0:${total},lowpass=f=2600,aecho=0.8:0.7:90|170|260:0.35|0.25|0.15,volume=0.22,`
      + `afade=t=in:st=0:d=${lead},afade=t=out:st=${fadeOutAt}:d=${MUSIC_TAIL_SECONDS}[music]`,
    `[music][sidechain]sidechaincompress=threshold=0.02:ratio=5:attack=120:release=1200[ducked]`,
    `[voice][ducked]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[mix]`,
  ].join(';');
}

// Voice + background music -> lossless stereo mix (WAV, 48 kHz).
export async function createMix({ audio, output }) {
  const voiceSeconds = await probeDuration(audio);
  const totalSeconds = voiceSeconds + MUSIC_LEAD_IN_SECONDS + MUSIC_TAIL_SECONDS;
  await exec('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', audio,
    '-stream_loop', '-1', '-i', BACKGROUND_MUSIC,
    '-filter_complex', audioFilter(totalSeconds),
    '-map', '[mix]', '-ar', '48000', '-c:a', 'pcm_s16le',
    '-t', totalSeconds.toFixed(3),
    output,
  ]);
  return output;
}

// Still image + mix -> MP4 (YouTube).
// The length is set explicitly from the mix: with a looped still image, "-shortest" ends the video at
// different points depending on the FFmpeg version (newer runners produced a wrong duration).
export async function createVideo({ image, mix, output }) {
  const seconds = await probeDuration(mix);
  await exec('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-loop', '1', '-framerate', '1', '-i', image,
    '-i', mix,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-r', '1',
    '-c:a', 'aac', '-b:a', '160k',
    '-t', seconds.toFixed(3), '-movflags', '+faststart',
    output,
  ]);
  return output;
}

// Mix -> MP3 for the app. 64 kbps is plenty for voice, light on mobile data, and keeps the audio served by
// GitHub Pages (1 GB limit) at roughly 2 MB per 4-minute reading.
export async function createMp3({ mix, output, title, artist }) {
  await exec('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', mix,
    '-c:a', 'libmp3lame', '-b:a', '64k',
    '-metadata', `title=${title ?? ''}`, '-metadata', `artist=${artist ?? ''}`, '-metadata', 'album=Bíblia lida por elas',
    output,
  ]);
  return output;
}

// YouTube thumbnails: 1280x720, under 2 MB.
export async function createThumbnail({ image, output }) {
  await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', image, '-vf', 'scale=1280:720:flags=lanczos', '-q:v', '3', output]);
  return output;
}
