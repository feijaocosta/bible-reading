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

// Audio mix:
//  - voice: high-pass to remove rumble + a short, subtle "room" reverb so phone recordings don't sound dry;
//  - music: looped pad, softened and reverberated, faded in/out, ducked by the voice (sidechain compression);
//  - final loudnorm evens out the very different levels of WhatsApp recordings.
export function audioFilter(totalSeconds) {
  const lead = MUSIC_LEAD_IN_SECONDS, fadeOutAt = (totalSeconds - MUSIC_TAIL_SECONDS).toFixed(3), total = totalSeconds.toFixed(3);
  return [
    `[1:a]highpass=f=80,aecho=1.0:0.85:23|41|67:0.20|0.13|0.07,aformat=channel_layouts=stereo,`
      + `adelay=${lead}s:all=1,apad=whole_dur=${total},asplit=2[voice][sidechain]`,
    `[2:a]atrim=0:${total},lowpass=f=2600,aecho=0.8:0.7:90|170|260:0.35|0.25|0.15,volume=0.22,`
      + `afade=t=in:st=0:d=${lead},afade=t=out:st=${fadeOutAt}:d=${MUSIC_TAIL_SECONDS}[music]`,
    `[music][sidechain]sidechaincompress=threshold=0.02:ratio=5:attack=120:release=1200[ducked]`,
    `[voice][ducked]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[mix]`,
  ].join(';');
}

// Still image + voice + background music -> MP4.
export async function createVideo({ image, audio, output }) {
  const voiceSeconds = await probeDuration(audio);
  const totalSeconds = voiceSeconds + MUSIC_LEAD_IN_SECONDS + MUSIC_TAIL_SECONDS;
  await exec('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-loop', '1', '-framerate', '1', '-i', image,
    '-i', audio,
    '-stream_loop', '-1', '-i', BACKGROUND_MUSIC,
    '-filter_complex', audioFilter(totalSeconds),
    '-map', '0:v', '-map', '[mix]',
    '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-r', '1',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
    '-t', totalSeconds.toFixed(3), '-movflags', '+faststart',
    output,
  ]);
  return output;
}

// YouTube thumbnails: 1280x720, under 2 MB.
export async function createThumbnail({ image, output }) {
  await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', image, '-vf', 'scale=1280:720:flags=lanczos', '-q:v', '3', output]);
  return output;
}
