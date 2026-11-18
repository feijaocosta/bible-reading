// FFmpeg helpers: probe media, build the still-image video and the YouTube thumbnail.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

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

// Still image + audio -> MP4. loudnorm evens out the very different levels of WhatsApp recordings.
export async function createVideo({ image, audio, output }) {
  await exec('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-loop', '1', '-framerate', '1', '-i', image,
    '-i', audio,
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-r', '1',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '48000',
    '-shortest', '-movflags', '+faststart',
    output,
  ]);
  return output;
}

// YouTube thumbnails: 1280x720, under 2 MB.
export async function createThumbnail({ image, output }) {
  await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', image, '-vf', 'scale=1280:720:flags=lanczos', '-q:v', '3', output]);
  return output;
}
