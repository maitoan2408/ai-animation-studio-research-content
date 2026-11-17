/** Local M3 Character Motion workspace. The root Studio remains the M2
 * source-of-truth; this isolated service adds a genuine native Three pipeline
 * without migrating/rewriting any accepted 1.0 projects or renderer.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { access, copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, StudioError } from './domain.js';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const validator = path.join(repoRoot, 'production/src/render/m3-validate.ts');
const renderer = path.join(repoRoot, 'production/src/render/render-m3.ts');
const defaultProject = path.join(repoRoot, 'examples/m3-studio-project.json');
const nativeRuntime = path.join(repoRoot, 'production/node_modules/@hyperframes/engine');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
type MotionProject = Record<string, unknown>;
type QualityMode = 'baseline' | 'enhanced';
type MotionDoc = { revision: string; project: MotionProject; frames?: number };
type MotionJob = {
  id: string;
  revision: string;
  status: 'rendering' | 'succeeded' | 'failed' | 'interrupted';
  createdAt: string;
  updatedAt: string;
  frames: number;
  qualityMode?: QualityMode;
  videoSha256?: string;
  error?: string;
};
const maximumProjectBytes = 30000;
async function atomicFile(file: string, text: string) {
  const tmp = file + '.' + randomUUID() + '.tmp';
  await writeFile(tmp, text, 'utf8');
  await rename(tmp, file);
}
function failure(code: string, message: string, status = 400): never {
  throw new StudioError(code, message, status);
}
async function childJson(project: unknown): Promise<{ project: MotionProject; frames: number }> {
  const data = JSON.stringify(project);
  if (!data || Buffer.byteLength(data) > maximumProjectBytes)
    failure('M3_PAYLOAD_TOO_LARGE', 'M3 project must be a JSON document under 30 KB.');
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', validator], {
      cwd: repoRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '',
      stderr = '';
    const timeout = setTimeout(() => child.kill('SIGKILL'), 15000);
    child.stdout.on('data', (b: Buffer) => {
      stdout += b.toString();
      if (stdout.length > 100000) child.kill();
    });
    child.stderr.on('data', (b: Buffer) => {
      stderr = (stderr + b.toString()).slice(-4000);
    });
    child.once('error', (e) => {
      clearTimeout(timeout);
      reject(new StudioError('M3_VALIDATOR_UNAVAILABLE', String(e), 503));
    });
    child.once('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(
          new StudioError('M3_INVALID_PROJECT', stderr.trim() || 'M3 validation failed.', 400),
        );
        return;
      }
      try {
        const result = JSON.parse(stdout) as {
          ok: boolean;
          project: MotionProject;
          frames: number;
        };
        if (!result.ok || !Number.isSafeInteger(result.frames))
          throw Error('invalid validator response');
        resolve({ project: result.project, frames: result.frames });
      } catch (e) {
        reject(new StudioError('M3_VALIDATOR_RESPONSE', String(e), 503));
      }
    });
    child.stdin.end(data);
  });
}

export class MotionService {
  private readonly dir: string;
  private readonly projectFile: string;
  private saving: Promise<void> = Promise.resolve();
  private running?: { id: string; child: ChildProcess };
  private renderStart?: Promise<MotionJob>;
  constructor(storeRoot: string) {
    this.dir = path.join(storeRoot, 'motion-m3');
    this.projectFile = path.join(this.dir, 'project.json');
  }
  async init() {
    await mkdir(path.join(this.dir, 'jobs'), { recursive: true });
    try {
      await access(this.projectFile);
    } catch {
      // Reentrant init calls must never overwrite a saved revision.
      const source = await readFile(defaultProject, 'utf8');
      const tmp = this.projectFile + '.' + randomUUID() + '.tmp';
      await writeFile(tmp, source, { flag: 'wx' });
      try {
        await copyFile(tmp, this.projectFile, 1 /* COPYFILE_EXCL */);
      } catch (e: unknown) {
        if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
      } finally {
        await import('node:fs/promises').then((fs) => fs.rm(tmp, { force: true }));
      }
    }
  }
  private async current(): Promise<MotionDoc> {
    const raw = await readFile(this.projectFile);
    return { revision: hash(raw), project: JSON.parse(raw.toString()) as MotionProject };
  }
  /** Discover SHA-locked grip-capable props; never trust user URLs or SHA. */
  async gripAssets(){
    const art=JSON.parse(await readFile(
      path.join(repoRoot,'production/assets/lantern-v1/manifest.json'),'utf8')) as {
      version:string;assets:{id:string;sha256:string;category:string;
        anchors:Record<string,[number,number]>}[]};
    if(!art.version||!Array.isArray(art.assets))
      failure('M3_ASSET_CATALOG_INVALID','Native art catalog unavailable.',503);
    const assets=art.assets.filter(a=>a.category==='prop'&&Array.isArray(a.anchors.grip))
      .map(a=>({id:a.id,sha256:a.sha256}));
    if(!assets.length||assets.some(a=>!/^props\/[a-z0-9-]+$/.test(a.id)||
      !/^[a-f0-9]{64}$/.test(a.sha256)))
      failure('M3_ASSET_CATALOG_INVALID','Untrusted grip asset metadata.',503);
    return {schemaVersion:'native-grip-assets/1',artPackId:art.version,assets};
  }
  async validate(project: unknown) {
    return childJson(project);
  }
  async get(): Promise<MotionDoc> {
    await this.init();
    const doc = await this.current();
    return { ...doc, frames: (await childJson(doc.project)).frames };
  }
  async save(expectedRevision: string, project: unknown): Promise<MotionDoc> {
    await this.init();
    const previous = this.saving;
    let unlock!: () => void;
    this.saving = new Promise<void>((r) => {
      unlock = r;
    });
    await previous;
    try {
      const existing = await this.current();
      if (existing.revision !== expectedRevision)
        failure('M3_REVISION_CONFLICT', 'Character project changed. Reload before saving.', 409);
      const validated = await childJson(project);
      const text = JSON.stringify(validated.project, null, 2) + '\n';
      await atomicFile(this.projectFile, text);
      return { revision: hash(text), project: validated.project, frames: validated.frames };
    } finally {
      unlock();
    }
  }
  private folder(id: string): string {
    if (!UUID.test(id)) failure('M3_JOB_NOT_FOUND', 'Unknown render job.', 404);
    return path.join(this.dir, 'jobs', id);
  }
  private async writeJob(job: MotionJob) {
    await atomicFile(
      path.join(this.folder(job.id), 'status.json'),
      JSON.stringify(job, null, 2) + '\n',
    );
  }
  async job(id: string): Promise<MotionJob> {
    const dir = this.folder(id);
    let job: MotionJob;
    try {
      job = JSON.parse(await readFile(path.join(dir, 'status.json'), 'utf8')) as MotionJob;
    } catch {
      failure('M3_JOB_NOT_FOUND', 'Unknown render job.', 404);
    }
    if (job.status === 'rendering' && this.running?.id !== id)
      return { ...job, status: 'interrupted', error: 'Render was interrupted by service restart.' };
    return job;
  }
  async render(revision: string, qualityMode: QualityMode = 'baseline'): Promise<MotionJob> {
    if (qualityMode !== 'baseline' && qualityMode !== 'enhanced')
      failure(
        'M6_QUALITY_MODE_INVALID',
        'Only baseline/enhanced native motion modes are supported.',
      );
    if (this.renderStart || this.running)
      failure('M3_RENDER_BUSY', 'A native M3 render is already running.', 409);
    const launched = this.renderInner(revision, qualityMode);
    this.renderStart = launched;
    try {
      return await launched;
    } finally {
      if (this.renderStart === launched) this.renderStart = undefined;
    }
  }
  private async renderInner(revision: string, qualityMode: QualityMode): Promise<MotionJob> {
    await this.init();
    if (this.running) failure('M3_RENDER_BUSY', 'A native M3 render is already running.', 409);
    const doc = await this.current();
    if (doc.revision !== revision)
      failure('M3_REVISION_CONFLICT', 'Reload the saved M3 project before rendering.', 409);
    const validated = await childJson(doc.project);
    try {
      await access(nativeRuntime);
    } catch {
      failure(
        'M3_RUNTIME_MISSING',
        'Install the pinned workbench dependencies: npm --prefix production ci.',
        503,
      );
    }
    const id = randomUUID(),
      dir = this.folder(id);
    await mkdir(dir, { recursive: true });
    const projectPath = path.join(dir, 'input-project.json');
    await writeFile(projectPath, JSON.stringify(validated.project, null, 2) + '\n');
    let status: MotionJob = {
      id,
      revision,
      status: 'rendering',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      frames: validated.frames,
      qualityMode,
    };
    await this.writeJob(status);
    const child = spawn(process.execPath, ['--import', 'tsx', renderer], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
      env: {
        ...process.env,
        M3_PROJECT_FILE: projectPath,
        M3_OUTPUT_DIR: dir,
        ...(qualityMode === 'enhanced' ? { M6_QUALITY_MODE: 'enhanced' } : {}),
      },
    });
    this.running = { id, child };
    let transcript = '';
    const logs = (chunk: Buffer) => {
      transcript = (transcript + chunk.toString()).slice(-12000);
    };
    child.stdout?.on('data', logs);
    child.stderr?.on('data', logs);
    const complete = async (code: number | null, error?: Error) => {
      try {
        if (code !== 0 || error)
          throw Error(
            error?.message ||
              'Native render failed (exit ' + String(code) + '): ' + transcript.slice(-2000),
          );
        const manifest = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8')) as {
          milestone: string;
          qualityMode?: string | null;
          video: {
            file: string;
            sha256: string;
            frames: number;
            width: number;
            height: number;
            fps: number;
          };
        };
        if (
          manifest.milestone !== (qualityMode === 'enhanced' ? 'M6' : 'M3') ||
          manifest.qualityMode !== (qualityMode === 'enhanced' ? 'enhanced' : null) ||
          manifest.video.file !== 'm3-character-motion-final-1080p.mp4' ||
          manifest.video.frames !== validated.frames ||
          manifest.video.width !== 1920 ||
          manifest.video.height !== 1080 ||
          manifest.video.fps !== 24
        )
          throw Error('M3_MEDIA_PROFILE_MISMATCH');
        const bytes = await readFile(path.join(dir, manifest.video.file));
        if (hash(bytes) !== manifest.video.sha256) throw Error('M3_VIDEO_SHA_MISMATCH');
        status = { ...status, status: 'succeeded', videoSha256: manifest.video.sha256 };
      } catch (e) {
        status = { ...status, status: 'failed', error: String(e) };
      } finally {
        status.updatedAt = new Date().toISOString();
        try {
          await this.writeJob(status);
        } finally {
          if (this.running?.id === id) this.running = undefined;
        }
      }
    };
    let settled = false;
    child.once('error', (e) => {
      if (!settled) {
        settled = true;
        void complete(null, e);
      }
    });
    child.once('close', (code) => {
      if (!settled) {
        settled = true;
        void complete(code);
      }
    });
    return status;
  }
  async video(id: string): Promise<Buffer> {
    const job = await this.job(id);
    if (job.status !== 'succeeded' || !job.videoSha256)
      failure('M3_VIDEO_UNAVAILABLE', 'Render has not completed successfully.', 409);
    const bytes = await readFile(path.join(this.folder(id), 'm3-character-motion-final-1080p.mp4'));
    if (hash(bytes) !== job.videoSha256)
      failure('M3_VIDEO_SHA_MISMATCH', 'Video no longer matches its verified SHA.', 409);
    return bytes;
  }
  async close() {
    if (this.running?.child.pid) {
      try {
        if (process.platform !== 'win32') process.kill(-this.running.child.pid, 'SIGTERM');
        else this.running.child.kill('SIGTERM');
      } catch {}
    }
  }
}
