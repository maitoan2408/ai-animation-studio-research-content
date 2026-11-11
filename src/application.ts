import { mkdir, readFile, writeFile, rename, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { Store, acquireLock } from './store.js';
import {
  StudioError,
  canonical,
  hash,
  uid,
  now,
  errorInfo,
  parseSpec,
  profileSchema,
  hashSchema,
  projectSpecSchema,
  type Project,
  type Revision,
  type Job,
  type Artifact,
  type Review,
  type Asset,
  type Profile,
} from './domain.js';
import { planScript } from './planner.js';
import { draftVoice, bindAudio, importAudio, pcmFromWav } from './audio.js';
import { renderVideo, type RenderFunction } from './render.js';
import { doctor } from './process.js';

const packageSchema = z
  .object({
    format: z.literal('paper-studio-project'),
    version: z.literal(1),
    spec: projectSpecSchema,
    assets: z
      .array(z.object({ id: hashSchema, base64: z.string().max(32_000_000) }).strict())
      .max(12),
  })
  .strict();
export type ProjectPackage = z.infer<typeof packageSchema>;

/** A single local worker. UI and CLI call the same state transitions. */
export class Studio {
  readonly store: Store;
  private release?: () => Promise<void>;
  private pump?: Promise<void>;
  private closing = false;
  private wakeRequested = false;
  workerError?: ReturnType<typeof errorInfo>;
  private active?: { id: string; controller: AbortController };
  private fingerprint?: Promise<string>;
  private constructor(
    root: string,
    private renderer: RenderFunction,
    private runtimeKey?: string,
  ) {
    this.store = new Store(root);
  }

  static async open(
    root: string,
    renderer: RenderFunction = renderVideo,
    runtimeKey?: string,
  ): Promise<Studio> {
    const app = new Studio(root, renderer, runtimeKey);
    app.release = await acquireLock(app.store.root);
    try {
      await app.store.init();
      await app.store.recover();
      app.kick();
      return app;
    } catch (error) {
      await app.release();
      throw error;
    }
  }
  async close() {
    if (this.closing) {
      await this.pump;
      return;
    }
    this.closing = true;
    this.active?.controller.abort();
    await this.pump;
    const release = this.release;
    this.release = undefined;
    await release?.();
  }
  async create(
    script: string,
    title: string,
    style: unknown = 'paper-cut',
    language: 'vi' | 'en' = 'vi',
  ) {
    const planned = planScript(script, title, style, language);
    return this.store.create(planned.spec, planned.notes);
  }
  async snapshot(projectId: string) {
    const current = await this.store.current(projectId);
    const [jobs, artifacts, reviews, revisions] = await Promise.all([
      this.store.list<Job>('jobs'),
      this.store.list<Artifact>('artifacts'),
      this.store.list<Review>('reviews'),
      Promise.all(
        current.project.revisionIds.map((id) => this.store.get<Revision>('revisions', id)),
      ),
    ]);
    return {
      ...current,
      jobs: jobs
        .filter((x) => x.projectId === projectId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      artifacts: artifacts.filter((x) => x.projectId === projectId),
      reviews: reviews.filter((x) => x.projectId === projectId),
      revisions,
    };
  }
  private async expected(projectId: string, revisionId: string) {
    const current = await this.store.current(projectId);
    if (current.project.currentRevisionId !== revisionId)
      throw new StudioError(
        'REVISION_CONFLICT',
        'Dự án đã thay đổi. Tải lại trước khi tiếp tục.',
        409,
      );
    return current.revision;
  }
  async voice(projectId: string, revisionId: string) {
    const revision = await this.expected(projectId, revisionId);
    let spec = revision.spec;
    for (const scene of spec.scenes)
      if (scene.narration.trim()) {
        const asset = await draftVoice(this.store, scene.narration, spec.language);
        spec = bindAudio(spec, scene.id, asset, hash(scene.narration));
      }
    return this.store.revise(projectId, revisionId, spec, [
      'Giọng eSpeak local dùng cho timing nháp; người dùng cần duyệt chất lượng hoặc thay WAV.',
    ]);
  }
  async upload(projectId: string, revisionId: string, sceneId: string, bytes: Buffer) {
    const revision = await this.expected(projectId, revisionId);
    if (!revision.spec.scenes.some((s) => s.id === sceneId))
      throw new StudioError('SCENE_NOT_FOUND', 'Không tìm thấy cảnh.', 404);
    const asset = await importAudio(this.store, bytes);
    return this.store.revise(projectId, revisionId, bindAudio(revision.spec, sceneId, asset), [
      'WAV được chuẩn hóa mono PCM 48 kHz; đã mở rộng cảnh nếu cần.',
    ]);
  }
  async enqueue(
    projectId: string,
    revisionId: string,
    profileInput: unknown = 'preview',
  ): Promise<Job> {
    const parsed = profileSchema.safeParse(profileInput);
    if (!parsed.success)
      throw new StudioError('INVALID_PROFILE', 'Profile phải là preview hoặc final.');
    const profile: Profile = parsed.data,
      revision = await this.store.get<Revision>('revisions', revisionId);
    const project = await this.store.get<Project>('projects', projectId);
    if (revision.projectId !== projectId || !project.revisionIds.includes(revisionId))
      throw new StudioError('REVISION_MISMATCH', 'Revision không thuộc project.');
    const spec = parseSpec(revision.spec);
    for (const scene of spec.scenes)
      if (scene.audio) await this.store.verifyAsset(scene.audio.assetId);
    this.fingerprint ??= this.runtimeKey
      ? Promise.resolve(this.runtimeKey)
      : doctor().then(canonical);
    const cacheKey = hash(canonical({ spec, profile, runtime: await this.fingerprint }));
    const job = await this.store.transaction(async () => {
      const jobs = await this.store.list<Job>('jobs');
      const duplicate = jobs.find(
        (j) =>
          j.projectId === projectId &&
          j.revisionId === revisionId &&
          j.profile === profile &&
          ['queued', 'running'].includes(j.status),
      );
      if (duplicate) return duplicate;
      const time = now(),
        created: Job = {
          id: uid('job'),
          projectId,
          revisionId,
          profile,
          cacheKey,
          status: 'queued',
          progress: 0,
          stage: 'Queued',
          attempts: [],
          createdAt: time,
          updatedAt: time,
        };
      await this.store.put('jobs', created.id, created);
      return created;
    });
    this.kick();
    return job;
  }
  private kick() {
    this.wakeRequested = true;
    if (this.closing || this.pump) return;
    this.pump = (async () => {
      do {
        this.wakeRequested = false;
        await this.drain();
      } while (this.wakeRequested && !this.closing);
    })()
      .catch((error) => {
        this.workerError = errorInfo(error);
        this.wakeRequested = false;
      })
      .finally(() => {
        this.pump = undefined;
        if (this.wakeRequested && !this.closing) this.kick();
      });
  }
  private async drain() {
    while (!this.closing) {
      const queued = (await this.store.list<Job>('jobs'))
        .filter((j) => j.status === 'queued')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      if (!queued[0]) return;
      await this.execute(queued[0].id);
    }
  }
  private async execute(jobId: string) {
    const controller = new AbortController();
    const job = await this.store.transaction(async () => {
      const j = await this.store.get<Job>('jobs', jobId);
      if (j.status !== 'queued') return undefined;
      j.status = 'running';
      j.stage = 'Preparing';
      j.updatedAt = now();
      j.attempts.push({ id: uid('attempt'), startedAt: now() });
      this.active = { id: j.id, controller };
      await this.store.put('jobs', j.id, j);
      return j;
    });
    if (!job) return;
    const attempt = job.attempts.at(-1)!,
      dir = path.join(this.store.root, 'tmp', attempt.id);
    try {
      await mkdir(dir, { recursive: true });
      const revision = await this.store.get<Revision>('revisions', job.revisionId);
      for (const scene of revision.spec.scenes)
        if (scene.audio) await this.store.verifyAsset(scene.audio.assetId);
      const candidates = (await this.store.list<Artifact>('artifacts')).filter(
        (a) => a.cacheKey === job.cacheKey,
      );
      let cached: Artifact | undefined;
      for (const a of candidates)
        if (await this.store.verifyArtifact(a)) {
          cached = a;
          break;
        }
      const result = cached
        ? { file: path.join(dir, 'output.mp4'), qc: cached.qc }
        : await this.renderer(
            this.store,
            revision.spec,
            job.profile,
            dir,
            controller.signal,
            async (progress, stage) => {
              job.progress = progress;
              job.stage = stage;
              job.updatedAt = now();
              await this.store.put('jobs', job.id, job);
            },
          );
      if (cached) await copyFile(this.store.artifactFile(cached.id), result.file);
      controller.signal.throwIfAborted();
      const bytes = await readFile(result.file);
      const artifact: Artifact = {
        id: uid('artifact'),
        projectId: job.projectId,
        revisionId: job.revisionId,
        jobId: job.id,
        profile: job.profile,
        cacheKey: job.cacheKey,
        sha256: hash(bytes),
        bytes: bytes.length,
        createdAt: now(),
        qc: result.qc,
      };
      // Cancellation and publication are serialized. No partial output is listed as an artifact.
      await this.store.transaction(async () => {
        controller.signal.throwIfAborted();
        await rename(result.file, this.store.artifactFile(artifact.id));
        await this.store.put('artifacts', artifact.id, artifact);
        job.status = 'succeeded';
        job.stage = cached ? 'Cache verified' : 'QC passed';
        job.progress = 1;
        job.artifactId = artifact.id;
        job.cacheHit = !!cached;
        attempt.finishedAt = now();
        job.updatedAt = now();
        await this.store.put('jobs', job.id, job);
      });
    } catch (error) {
      job.status = controller.signal.aborted ? 'cancelled' : 'failed';
      job.error = controller.signal.aborted
        ? { code: 'CANCELLED', message: 'Render đã hủy.' }
        : errorInfo(error);
      job.stage = job.error.message;
      job.updatedAt = now();
      attempt.finishedAt = now();
      attempt.error = job.error;
      await this.store.put('jobs', job.id, job);
      await writeFile(path.join(dir, 'failure.json'), JSON.stringify(job.error, null, 2)).catch(
        () => {},
      );
    } finally {
      this.active = undefined;
    }
  }
  async cancel(jobId: string) {
    await this.store.transaction(async () => {
      const job = await this.store.get<Job>('jobs', jobId);
      if (job.status === 'running') {
        this.active?.id === jobId && this.active.controller.abort();
      } else if (job.status === 'queued') {
        job.status = 'cancelled';
        job.stage = 'Cancelled before start';
        job.updatedAt = now();
        await this.store.put('jobs', jobId, job);
      } else throw new StudioError('INVALID_JOB_STATE', 'Chỉ hủy job queued/running.', 409);
    });
  }
  async retry(jobId: string) {
    const job = await this.store.transaction(async () => {
      const j = await this.store.get<Job>('jobs', jobId);
      if (!['failed', 'cancelled', 'interrupted'].includes(j.status))
        throw new StudioError(
          'INVALID_JOB_STATE',
          'Chỉ retry job lỗi, bị hủy hoặc gián đoạn.',
          409,
        );
      j.status = 'queued';
      j.progress = 0;
      j.stage = 'Queued for retry';
      j.updatedAt = now();
      delete j.error;
      await this.store.put('jobs', jobId, j);
      return j;
    });
    this.kick();
    return job;
  }
  async wait(jobId: string, timeoutMs = 1_000_000): Promise<Job> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const job = await this.store.get<Job>('jobs', jobId);
      if (!['queued', 'running'].includes(job.status)) return job;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new StudioError('WAIT_TIMEOUT', 'Job chưa hoàn thành trong thời gian chờ.');
  }
  async export(projectId: string, revisionId?: string): Promise<ProjectPackage> {
    const current = await this.store.current(projectId),
      revision = revisionId
        ? await this.store.get<Revision>('revisions', revisionId)
        : current.revision;
    if (revision.projectId !== projectId)
      throw new StudioError('REVISION_MISMATCH', 'Revision không thuộc project.');
    const ids = [
      ...new Set(revision.spec.scenes.flatMap((s) => (s.audio ? [s.audio.assetId] : []))),
    ];
    const assets = await Promise.all(
      ids.map(async (id) => {
        await this.store.verifyAsset(id);
        return { id, base64: (await readFile(this.store.assetFile(id))).toString('base64') };
      }),
    );
    return { format: 'paper-studio-project', version: 1, spec: revision.spec, assets };
  }
  async import(input: unknown): Promise<Project> {
    const parsed = packageSchema.safeParse(input);
    if (!parsed.success) throw new StudioError('INVALID_PACKAGE', parsed.error.message);
    const data = parsed.data,
      required = new Set(data.spec.scenes.flatMap((s) => (s.audio ? [s.audio.assetId] : [])));
    if (new Set(data.assets.map((a) => a.id)).size !== data.assets.length)
      throw new StudioError('DUPLICATE_ASSET', 'Gói có asset trùng.');
    const assets = data.assets.map((a) => {
      const bytes = Buffer.from(a.base64, 'base64');
      if (bytes.length > 24_000_000 || hash(bytes) !== a.id)
        throw new StudioError('PACKAGE_HASH_MISMATCH', 'Asset trong gói sai hash hoặc quá lớn.');
      const pcm = pcmFromWav(bytes),
        duration = pcm.length / 96000;
      if (duration > 120 || !required.has(a.id))
        throw new StudioError(
          'INVALID_PACKAGE_ASSET',
          'Asset không hợp lệ hoặc không được sử dụng.',
        );
      return {
        bytes,
        asset: {
          id: a.id,
          kind: 'audio',
          extension: 'wav',
          bytes: bytes.length,
          duration,
          sampleRate: 48000,
          source: 'upload',
          createdAt: now(),
        } satisfies Asset,
      };
    });
    if (assets.length !== required.size)
      throw new StudioError('MISSING_PACKAGE_ASSET', 'Gói thiếu audio.');
    for (const scene of data.spec.scenes)
      if (
        scene.audio &&
        assets.find((a) => a.asset.id === scene.audio!.assetId)!.asset.duration >
          scene.durationFrames / 24
      )
        throw new StudioError('AUDIO_OVERFLOW', 'Audio trong gói dài hơn cảnh.');
    // Validate every byte before any write; identifiers are generated locally.
    for (const { asset, bytes } of assets) {
      const temp = path.join(this.store.root, 'tmp', uid('asset'));
      await writeFile(temp, bytes);
      await rename(temp, this.store.assetFile(asset.id));
      await this.store.put('assets', asset.id, asset);
    }
    return this.store.create(data.spec, [
      'Imported portable project; review records are not inherited.',
    ]);
  }
}
