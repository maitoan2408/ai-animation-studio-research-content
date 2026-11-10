import { spawn } from 'node:child_process';
import { StudioError } from './domain.js';

/** Argument arrays only: project text never becomes shell code. */
export function run(command: string, args: string[], signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], signal });
    let stdout = '',
      stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout = (stdout + String(chunk)).slice(-2_000_000);
    });
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + String(chunk)).slice(-12000);
    });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve(stdout)
        : reject(
            new StudioError(
              'PROCESS_FAILED',
              `${command} exited ${code}: ${stderr.slice(-2500)}`,
              500,
            ),
          ),
    );
  });
}

export async function doctor() {
  const browser = process.env.STUDIO_BROWSER ?? '/usr/bin/chromium';
  const [ffmpeg, ffprobe, chromium] = await Promise.all([
    run('ffmpeg', ['-version']),
    run('ffprobe', ['-version']),
    run(browser, ['--version']),
  ]);
  return {
    node: process.version,
    ffmpeg: ffmpeg.split('\n')[0]!,
    ffprobe: ffprobe.split('\n')[0]!,
    chromium: chromium.trim(),
    browser,
    backend: 'HyperFrames 0.9.30',
    compiler: 'paper-studio/1',
  };
}
