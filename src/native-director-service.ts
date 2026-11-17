/** Native Studio Director bridge to separately pinned production M3/G3 executors.
 * Existing M5 plans and stored projects are untouched. The accepted storyboard
 * must be explicit validated data, not arbitrary generated executable code.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { hash, StudioError } from './domain.js';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const binary = path.join(repoRoot, 'production/src/director/native-director-cli.ts');
const revisionPattern = /^[0-9a-f]{64}$/;
type Job = {
  revision: string;
  status: 'rendering' | 'succeeded' | 'failed' | 'interrupted';
  mediaSha256?: string;
  error?: string;
};
function failure(code: string, message: string, status = 400): never {
  throw new StudioError(code, message, status);
}
export class NativeDirectorService {
  private readonly dir: string;
  private readonly jobs = new Map<string, Job>();
  private readonly children = new Set<ChildProcess>();
  private stopped = false;
  constructor(storeRoot: string) {
    this.dir = path.join(storeRoot, 'director-native');
  }
  private revision(value: string) {
    if (!revisionPattern.test(value))
      failure('NATIVE_DIRECTOR_REVISION_INVALID', 'Invalid revision digest.');
    return value;
  }
  private command(
    command: 'plan' | 'save' | 'get' | 'render',
    payload: unknown,
    timeoutMs: number,
  ) {
    if (this.stopped)
      return Promise.reject(new StudioError('NATIVE_DIRECTOR_STOPPED', 'Studio is closing.', 503));
    const request = JSON.stringify(payload);
    if (Buffer.byteLength(request) > 100000)
      return Promise.reject(
        new StudioError(
          'NATIVE_DIRECTOR_INPUT_TOO_LARGE',
          'Native storyboard limit is 100 KB.',
          413,
        ),
      );
    return new Promise<unknown>((resolve, reject) => {
      const child = spawn(process.execPath, ['--import', 'tsx', binary, command], {
        cwd: repoRoot,
        env: { ...process.env, NATIVE_DIRECTOR_STORE_ROOT: this.dir },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      this.children.add(child);
      let stdout = '',
        stderr = '',
        finished = false;
      const done = (err?: Error, output?: unknown) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        this.children.delete(child);
        if (err) reject(err);
        else resolve(output);
      };
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        done(
          new StudioError('NATIVE_DIRECTOR_EXECUTOR_TIMEOUT', 'Native executor timed out.', 503),
        );
      }, timeoutMs);
      child.stdout.on('data', (x: Buffer) => {
        stdout += x.toString();
        if (stdout.length > 8_000_000) child.kill('SIGKILL');
      });
      child.stderr.on('data', (x: Buffer) => {
        stderr = (stderr + x.toString()).slice(-5000);
      });
      child.once('error', (e) =>
        done(new StudioError('NATIVE_DIRECTOR_EXECUTOR_UNAVAILABLE', String(e), 503)),
      );
      child.once('close', (code) => {
        if (code !== 0) {
          const safe = stderr.replace(/[\x00-\x1f]/g, ' ').slice(-1000);
          done(
            new StudioError(
              'NATIVE_DIRECTOR_EXECUTOR_REJECTED',
              safe || 'Native command failed.',
              400,
            ),
          );
          return;
        }
        try {
          const response = JSON.parse(stdout) as { ok: boolean; result: unknown };
          if (response.ok !== true) throw Error('Native executor did not return OK.');
          done(undefined, response.result);
        } catch (e) {
          done(new StudioError('NATIVE_DIRECTOR_PROTOCOL_INVALID', String(e), 503));
        }
      });
      child.stdin.on('error', () => {});
      child.stdin.end(request);
    });
  }
  async plan(input: unknown) {
    return this.command('plan', { input }, 30000);
  }
  async save(plan: unknown) {
    return this.command('save', { plan }, 30000);
  }
  async project(revision: string) {
    return this.command('get', { revision: this.revision(revision) }, 30000);
  }
  async render(revision: string) {
    const r = this.revision(revision);
    await this.project(r);
    const current = await this.job(r);
    if (current.status === 'succeeded' || current.status === 'rendering') return current;
    if (this.stopped) failure('NATIVE_DIRECTOR_STOPPED', 'Studio is closing.', 503);
    const job: Job = { revision: r, status: 'rendering' };
    this.jobs.set(r, job);
    void this.command('render', { revision: r }, 130 * 60 * 1000).then(
      (receipt) => {
        const value = receipt as { mediaSha256: string };
        this.jobs.set(r, { revision: r, status: 'succeeded', mediaSha256: value.mediaSha256 });
      },
      (error) => {
        this.jobs.set(r, { revision: r, status: 'failed', error: String(error).slice(-1500) });
      },
    );
    return job;
  }
  async job(revision: string): Promise<Job> {
    const r = this.revision(revision);
    const cached = this.jobs.get(r);
    if (cached) return { ...cached };
    try {
      const bytes = await readFile(
        path.join(this.dir, 'jobs', r, 'published', 'native-director-receipt.json'),
      );
      const receipt = JSON.parse(bytes.toString()) as {
        status: string;
        planSha256: string;
        mediaSha256: string;
      };
      if (
        receipt.status !== 'succeeded' ||
        receipt.planSha256 !== r ||
        !revisionPattern.test(receipt.mediaSha256)
      )
        failure('NATIVE_DIRECTOR_RECEIPT_INVALID', 'Invalid native job receipt.', 409);
      return { revision: r, status: 'succeeded', mediaSha256: receipt.mediaSha256 };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    try {
      await access(path.join(this.dir, 'jobs', r));
      return {
        revision: r,
        status: 'interrupted',
        error:
          'Job not published and not running in this service process; retry requires recovery review.',
      };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    return { revision: r, status: 'interrupted', error: 'No job submitted.' };
  }
  async video(revision: string): Promise<Buffer> {
    const r = this.revision(revision),
      status = await this.job(r);
    if (status.status !== 'succeeded')
      failure('NATIVE_DIRECTOR_VIDEO_NOT_READY', 'Native job incomplete.', 409);
    const folder = path.join(this.dir, 'jobs', r, 'published');
    const receipt = JSON.parse(
      await readFile(path.join(folder, 'native-director-receipt.json'), 'utf8'),
    ) as {
      mediaSha256: string;
      mediaFile: string;
      planSha256: string;
    };
    if (
      receipt.planSha256 !== r ||
      !['m3-character-motion-final-1080p.mp4', 'g3-motion-physics-1080p.mp4'].includes(
        receipt.mediaFile,
      )
    )
      failure('NATIVE_DIRECTOR_MEDIA_INVALID', 'Invalid published video receipt.', 409);
    const bytes = await readFile(path.join(folder, receipt.mediaFile));
    if (hash(bytes) !== receipt.mediaSha256)
      failure('NATIVE_DIRECTOR_MEDIA_TAMPERED', 'Video SHA-256 does not match receipt.', 409);
    return bytes;
  }
  async close() {
    this.stopped = true;
    for (const child of this.children) child.kill('SIGTERM');
  }
}
