import { spawn } from 'node:child_process';
import { StudioError } from './domain.js';

/** Argument arrays only: project text never becomes shell code. */
export function run(
  command: string,
  args: string[],
  signal?: AbortSignal,
  onOutput?: (chunk: string) => void,
  processTree = false,
): Promise<string> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    // POSIX render workers launch native encoders. Cancelling only their Node
    // parent leaves those children rendering after a job is marked cancelled.
    const grouped = processTree && process.platform !== 'win32';
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: grouped,
      signal: grouped ? undefined : signal,
    });
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const killGroup = (kind: NodeJS.Signals) => {
      if (!child.pid) return;
      try {
        process.kill(-child.pid, kind);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
      }
    };
    const abort = () => {
      killGroup('SIGTERM');
      killTimer = setTimeout(() => killGroup('SIGKILL'), 1000);
      killTimer.unref();
    };
    if (grouped) signal?.addEventListener('abort', abort, { once: true });
    const cleanup = () => {
      signal?.removeEventListener('abort', abort);
      if (killTimer) clearTimeout(killTimer);
      if (grouped) killGroup('SIGKILL');
    };
    let stdout = '',
      stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout = (stdout + String(chunk)).slice(-2_000_000);
      onOutput?.(String(chunk));
    });
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + String(chunk)).slice(-12000);
      onOutput?.(String(chunk));
    });
    child.on('error', (error) => {
      cleanup();
      reject(error);
    });
    child.on('close', (code) => {
      cleanup();
      if (signal?.aborted) {
        reject(signal.reason);
        return;
      }
      code === 0
        ? resolve(stdout)
        : reject(
            new StudioError(
              'PROCESS_FAILED',
              `${command} exited ${code}: ${stderr.slice(-2500)}`,
              500,
            ),
          );
    });
  });
}

export async function doctor() {
  const browser = process.env.STUDIO_BROWSER ?? '/usr/bin/chromium';
  const [ffmpeg, ffprobe, chromium] = await Promise.all([
    run('ffmpeg', ['-version']),
    run('ffprobe', ['-version']),
    run(browser, ['--version']).catch(() => {
      throw new StudioError(
        'BROWSER_UNAVAILABLE',
        `Không chạy được trình duyệt ${browser}. Đặt STUDIO_BROWSER tới Chromium đã cài.`,
        503,
      );
    }),
  ]);
  return {
    node: process.version,
    ffmpeg: ffmpeg.split('\n')[0]!,
    ffprobe: ffprobe.split('\n')[0]!,
    chromium: chromium.trim(),
    browser,
    backend: 'none: film renderer is connected in G4',
    compiler: 'paper-studio/3',
  };
}
