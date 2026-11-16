/** M5 bounded Director: validated, data-only graph over actual Studio executors.
 * This is an offline deterministic capability planner, NOT an LLM service.
 * Render, voice, project persistence and artifact QC remain owned by Studio.
 */
import { readFile, mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Studio } from './application.js';
import {
  StudioError,
  actionSchema,
  canonical,
  errorInfo,
  hash,
  now,
  parseSpec,
  profileSchema,
  profiles,
  styleSchema,
  totalFrames,
  directorProjectId,
  type Job,
  type Revision,
  type Artifact,
  type ProjectSpec,
} from './domain.js';
import { planScript } from './planner.js';

const inputSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    script: z.string().trim().min(1).max(12000),
    style: styleSchema,
    language: z.enum(['vi', 'en']),
    profile: profileSchema,
    voice: z.boolean(),
  })
  .strict();
export type DirectorInput = z.infer<typeof inputSchema>;
type SkillId = 'script-to-scenes' | 'prepare-audio' | 'render-review' | 'verify-artifact';
export type DirectorNode = {
  id: 'scenes' | 'voice' | 'render' | 'verify';
  skill: SkillId;
  needs: DirectorNode['id'][];
  inputSha256: string;
};
export type DirectorPlan = {
  schemaVersion: 'director-m5/1';
  intent: DirectorInput;
  spec: ProjectSpec;
  notes: string[];
  graph: DirectorNode[];
  specSha256: string;
  planSha256: string;
};
export type DirectorReceipt = {
  schemaVersion: 'director-m5-receipt/1';
  planSha256: string;
  status: 'succeeded';
  tasks: Array<{ id: DirectorNode['id']; skill: SkillId; status: 'succeeded'; attempt: number }>;
  projectId: string;
  revisionId: string;
  revisionDigest: string;
  renderInputSha256: string;
  audioAssetSha256s: string[];
  jobId: string;
  artifactId: string;
  artifactSha256: string;
  profile: DirectorInput['profile'];
  qc: Artifact['qc'];
  voice: boolean;
  source: 'root-studio-v1';
  autoApproved: false;
  createdAt: string;
  receiptSha256: string;
};
const supportedActions = new Set(actionSchema.options);
const supportedSkills: Record<SkillId, string> = {
  'script-to-scenes': 'src/planner.ts + Studio.create',
  'prepare-audio': 'src/audio.ts + Studio.voice (local draft)',
  'render-review': 'src/render.ts + Studio.enqueue/wait',
  'verify-artifact': 'src/store.ts + SHA/QC recheck',
};
const digest = (x: unknown) => hash(canonical(x));
function graphFor(input: DirectorInput, spec: ProjectSpec): DirectorNode[] {
  const nodes: DirectorNode[] = [
    { id: 'scenes', skill: 'script-to-scenes', needs: [], inputSha256: digest(spec) },
  ];
  if (input.voice) {
    nodes.push({
      id: 'voice',
      skill: 'prepare-audio',
      needs: ['scenes'],
      inputSha256: digest(spec.scenes.map((s) => [s.id, s.narration])),
    });
  }
  nodes.push({
    id: 'render',
    skill: 'render-review',
    needs: [input.voice ? 'voice' : 'scenes'],
    inputSha256: digest({ spec, profile: input.profile, voice: input.voice }),
  });
  nodes.push({
    id: 'verify',
    skill: 'verify-artifact',
    needs: ['render'],
    inputSha256: digest({ profile: input.profile, fps: spec.fps }),
  });
  return nodes;
}
/** Generate a reviewable graph, never silently invent an executable skill. */
export function planDirector(raw: unknown): DirectorPlan {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) throw new StudioError('DIRECTOR_INPUT_INVALID', parsed.error.message);
  const intent = parsed.data;
  const draft = planScript(intent.script, intent.title, intent.style, intent.language);
  const spec = parseSpec(draft.spec);
  for (const scene of spec.scenes) {
    if (!supportedActions.has(scene.action))
      throw new StudioError('DIRECTOR_ACTION_UNSUPPORTED', scene.action);
  }
  const graph = graphFor(intent, spec);
  for (const step of graph) {
    if (!(step.skill in supportedSkills))
      throw new StudioError('DIRECTOR_SKILL_UNAVAILABLE', step.skill);
  }
  const payload = {
    schemaVersion: 'director-m5/1' as const,
    intent,
    spec,
    notes: draft.notes,
    graph,
    specSha256: digest(spec),
  };
  return { ...payload, planSha256: digest(payload) };
}
/** Recompile the entire graph; a valid-looking SHA is not authority to execute
 * arbitrary steps or to overwrite an existing human revision.
 */
export function validateDirectorPlan(raw: unknown): DirectorPlan {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new StudioError('DIRECTOR_PLAN_INVALID', 'Expected a plan object.');
  const value = raw as Record<string, unknown>;
  const expected = planDirector(value.intent);
  if (canonical(value) !== canonical(expected))
    throw new StudioError('DIRECTOR_PLAN_TAMPERED', 'Graph or plan receipt differs from input.');
  return expected;
}
const hexSha = z.string().regex(/^[a-f0-9]{64}$/);
const persistedReceiptSchema = z
  .object({
    schemaVersion: z.literal('director-m5-receipt/1'),
    planSha256: hexSha,
    status: z.literal('succeeded'),
    tasks: z.array(
      z
        .object({
          id: z.enum(['scenes', 'voice', 'render', 'verify']),
          skill: z.enum(['script-to-scenes', 'prepare-audio', 'render-review', 'verify-artifact']),
          status: z.literal('succeeded'),
          attempt: z.number().int().positive(),
        })
        .strict(),
    ),
    projectId: z.string().min(1),
    revisionId: z.string().min(1),
    revisionDigest: hexSha,
    renderInputSha256: hexSha,
    audioAssetSha256s: z.array(hexSha),
    jobId: z.string().min(1),
    artifactId: z.string().min(1),
    artifactSha256: hexSha,
    profile: profileSchema,
    qc: z
      .object({
        frames: z.number().int().positive(),
        expectedFrames: z.number().int().positive(),
        fps: z.string(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        duration: z.number().finite(),
        hasAudio: z.boolean(),
        audioDuration: z.number().finite().optional(),
        audioSampleRate: z.number().int().positive().optional(),
      })
      .strict(),
    voice: z.boolean(),
    source: z.literal('root-studio-v1'),
    autoApproved: z.literal(false),
    createdAt: z.string().min(1),
    receiptSha256: hexSha,
  })
  .strict();
const transient = new Set(['RENDER_TEMPORARY', 'PROCESS_FAILED', 'WORKER_INTERRUPTED']);
async function assertCurrent(app: Studio, projectId: string, revisionId: string) {
  const doc = await app.store.current(projectId);
  if (doc.project.currentRevisionId !== revisionId)
    throw new StudioError(
      'DIRECTOR_REVISION_CHANGED',
      'A human edited the project; Director will not overwrite or publish over this revision.',
      409,
    );
  return doc.revision;
}
/** Strictly user-confirmed execution; deterministic project identity also survives crashes.
 * Audio materialization may change asset IDs but NEVER the approved scene durations.
 */
export async function executeDirectorPlan(
  app: Studio,
  raw: unknown,
  options: { approved: boolean; retryTransient?: boolean },
): Promise<DirectorReceipt> {
  const plan = validateDirectorPlan(raw);
  if (options.approved !== true)
    throw new StudioError('DIRECTOR_APPROVAL_REQUIRED', 'Review and explicitly approve graph.');
  const project = await app.create(
    plan.intent.script,
    plan.intent.title,
    plan.intent.style,
    plan.intent.language,
    plan.planSha256,
  );
  const first = await app.store.get<Revision>('revisions', project.revisionIds[0]!);
  if (
    first.projectId !== project.id ||
    first.digest !== plan.specSha256 ||
    !first.notes.includes('director-plan-sha256=' + plan.planSha256)
  )
    throw new StudioError(
      'DIRECTOR_PROJECT_CONFLICT',
      'Project is not bound to this approved plan.',
      409,
    );
  let revision = await assertCurrent(app, project.id, project.currentRevisionId);
  const tasks: DirectorReceipt['tasks'] = [
    { id: 'scenes', skill: 'script-to-scenes', status: 'succeeded', attempt: 1 },
  ];
  if (plan.intent.voice) {
    if (revision.id === first.id) {
      revision = await app.voice(project.id, revision.id);
    } else if (
      !revision.notes.some((note) => note.startsWith('Giọng eSpeak local dùng cho timing nháp'))
    ) {
      throw new StudioError(
        'DIRECTOR_REVISION_CHANGED',
        'A human edit has changed the Director revision.',
        409,
      );
    }
    await assertCurrent(app, project.id, revision.id);
    const expected = structuredClone(plan.spec);
    for (const scene of expected.scenes) {
      const actual = revision.spec.scenes.find((s) => s.id === scene.id);
      if (!actual || actual.durationFrames !== scene.durationFrames)
        throw new StudioError(
          'DIRECTOR_VOICE_TIMING_CHANGED',
          'Voice would change the approved scene timing. Increase seconds and approve a new plan.',
          409,
        );
      if (scene.narration.trim()) {
        if (!actual.audio || actual.audio.textHash !== hash(scene.narration))
          throw new StudioError(
            'DIRECTOR_VOICE_INVALID',
            'Draft voice must bind to the exact narration.',
          );
        await app.store.verifyAsset(actual.audio.assetId);
        scene.audio = actual.audio;
      } else if (actual.audio) {
        throw new StudioError(
          'DIRECTOR_VOICE_INVALID',
          'Unexpected voice asset in an empty scene.',
        );
      }
    }
    if (digest(expected) !== digest(revision.spec))
      throw new StudioError(
        'DIRECTOR_REVISION_CHANGED',
        'Voice stage modified other approved content.',
        409,
      );
    tasks.push({ id: 'voice', skill: 'prepare-audio', status: 'succeeded', attempt: 1 });
  } else if (revision.id !== first.id || digest(revision.spec) !== plan.specSha256) {
    throw new StudioError(
      'DIRECTOR_REVISION_CHANGED',
      'A human edit has changed the Director revision.',
      409,
    );
  }
  await assertCurrent(app, project.id, revision.id);
  const matches = (await app.store.list<Job>('jobs')).filter(
    (j) =>
      j.projectId === project.id &&
      j.revisionId === revision.id &&
      j.profile === plan.intent.profile,
  );
  if (matches.length > 1)
    throw new StudioError(
      'DIRECTOR_JOB_CONFLICT',
      'Multiple jobs target the same approved revision.',
      409,
    );
  let job = matches[0] ?? (await app.enqueue(project.id, revision.id, plan.intent.profile));
  if (job.status === 'queued' || job.status === 'running') job = await app.wait(job.id);
  if (
    ['failed', 'interrupted'].includes(job.status) &&
    options.retryTransient &&
    transient.has(job.error?.code ?? '') &&
    job.attempts.length < 2
  ) {
    await assertCurrent(app, project.id, revision.id);
    await app.retry(job.id);
    job = await app.wait(job.id);
  }
  if (job.status !== 'succeeded' || !job.artifactId)
    throw new StudioError(
      'DIRECTOR_RENDER_FAILED',
      'Rendering failed without a publishable artifact: ' + (job.error?.code ?? job.status),
    );
  tasks.push({
    id: 'render',
    skill: 'render-review',
    status: 'succeeded',
    attempt: job.attempts.length,
  });
  await assertCurrent(app, project.id, revision.id);
  const artifact = await app.store.get<Artifact>('artifacts', job.artifactId);
  if (
    artifact.projectId !== project.id ||
    artifact.revisionId !== revision.id ||
    artifact.jobId !== job.id ||
    artifact.profile !== plan.intent.profile ||
    !(await app.store.verifyArtifact(artifact))
  )
    throw new StudioError(
      'DIRECTOR_ARTIFACT_INVALID',
      'Artifact is stale, mismatched or corrupted.',
    );
  const original = await readFile(app.store.artifactFile(artifact.id));
  const expectedSize = profiles[plan.intent.profile];
  if (
    hash(original) !== artifact.sha256 ||
    artifact.qc.frames !== totalFrames(revision.spec) ||
    artifact.qc.expectedFrames !== totalFrames(revision.spec) ||
    artifact.qc.width !== expectedSize.width ||
    artifact.qc.height !== expectedSize.height ||
    artifact.qc.fps !== '24/1' ||
    artifact.qc.hasAudio !== plan.intent.voice
  )
    throw new StudioError('DIRECTOR_MEDIA_QC_INVALID', 'Real media profile fails plan checks.');
  tasks.push({ id: 'verify', skill: 'verify-artifact', status: 'succeeded', attempt: 1 });
  const audioAssetSha256s = revision.spec.scenes.flatMap((scene) =>
    scene.audio ? [scene.audio.assetId] : [],
  );
  const payload = {
    schemaVersion: 'director-m5-receipt/1' as const,
    planSha256: plan.planSha256,
    status: 'succeeded' as const,
    tasks,
    projectId: project.id,
    revisionId: revision.id,
    revisionDigest: revision.digest,
    renderInputSha256: digest({ spec: revision.spec, profile: plan.intent.profile }),
    audioAssetSha256s,
    jobId: job.id,
    artifactId: artifact.id,
    artifactSha256: artifact.sha256,
    profile: plan.intent.profile,
    qc: artifact.qc,
    voice: plan.intent.voice,
    source: 'root-studio-v1' as const,
    autoApproved: false as const,
    createdAt: now(),
  };
  return { ...payload, receiptSha256: digest(payload) };
}
/** Same-origin HTTP service: single-flight, persisted receipts, verified reuse.
 * A retry of an ambiguous completed request must not create a second project.
 */
export class DirectorService {
  private running?: Promise<DirectorReceipt>;
  constructor(private readonly app: Studio) {}
  plan(raw: unknown) {
    return planDirector(raw);
  }
  private receiptPath(sha: string) {
    return path.join(this.app.store.root, 'director-m5', sha + '.json');
  }
  async run(raw: unknown, approved: boolean): Promise<DirectorReceipt> {
    const plan = validateDirectorPlan(raw);
    if (approved !== true)
      throw new StudioError('DIRECTOR_APPROVAL_REQUIRED', 'Graph approval is required.');
    if (this.running)
      throw new StudioError('DIRECTOR_BUSY', 'Another Director run is active.', 409);
    const execute = async () => {
      const file = this.receiptPath(plan.planSha256);
      let existing: DirectorReceipt | undefined;
      try {
        existing = JSON.parse(await readFile(file, 'utf8')) as DirectorReceipt;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
          throw new StudioError('DIRECTOR_RECEIPT_CORRUPT', 'Cannot load existing receipt.');
      }
      if (existing) {
        const parsed = persistedReceiptSchema.safeParse(existing);
        if (!parsed.success)
          throw new StudioError('DIRECTOR_RECEIPT_CORRUPT', 'Stored receipt has invalid fields.');
        existing = parsed.data;
        const { receiptSha256, ...payload } = existing;
        const expectedTasks = plan.graph.map((node) => ({ id: node.id, skill: node.skill }));
        const actualTasks = existing.tasks.map((task) => ({ id: task.id, skill: task.skill }));
        if (
          receiptSha256 !== digest(payload) ||
          existing.planSha256 !== plan.planSha256 ||
          existing.projectId !== directorProjectId(plan.planSha256) ||
          existing.profile !== plan.intent.profile ||
          existing.voice !== plan.intent.voice ||
          canonical(actualTasks) !== canonical(expectedTasks) ||
          existing.tasks.some((task) => task.status !== 'succeeded') ||
          existing.tasks.some(
            (task) => task.id !== 'render' && task.attempt !== 1,
          )
        )
          throw new StudioError('DIRECTOR_RECEIPT_CORRUPT', 'Stored execution claims are inconsistent.');
        let job: Job;
        try {
          job = await this.app.store.get<Job>('jobs', existing.jobId);
        } catch {
          throw new StudioError('DIRECTOR_RECEIPT_CORRUPT', 'Stored render job does not exist.');
        }
        const renderTask = existing.tasks.find((task) => task.id === 'render');
        if (
          job.status !== 'succeeded' ||
          job.error ||
          job.projectId !== existing.projectId ||
          job.revisionId !== existing.revisionId ||
          job.profile !== existing.profile ||
          job.artifactId !== existing.artifactId ||
          job.attempts.length !== renderTask?.attempt ||
          !job.attempts.length ||
          !job.attempts.at(-1)?.finishedAt ||
          job.attempts.at(-1)?.error
        )
          throw new StudioError('DIRECTOR_RECEIPT_CORRUPT', 'Persisted job no longer proves successful rendering.');
        const artifact = await this.app.store.get<Artifact>('artifacts', existing.artifactId);
        if (
          artifact.sha256 !== existing.artifactSha256 ||
          artifact.projectId !== existing.projectId ||
          artifact.revisionId !== existing.revisionId ||
          artifact.jobId !== job.id ||
          artifact.profile !== existing.profile ||
          artifact.cacheKey !== job.cacheKey ||
          canonical(artifact.qc) !== canonical(existing.qc) ||
          !(await this.app.store.verifyArtifact(artifact))
        )
          throw new StudioError(
            'DIRECTOR_ARTIFACT_INVALID',
            'Previously completed video or artifact evidence was modified.',
          );
        const revision = await assertCurrent(this.app, existing.projectId, existing.revisionId);
        const original = await this.app.store.get<Revision>(
          'revisions',
          (await this.app.store.get<{ revisionIds: string[] }>(
            'projects',
            existing.projectId,
          )).revisionIds[0]!,
        );
        if (
          original.digest !== plan.specSha256 ||
          original.projectId !== existing.projectId ||
          !original.notes.includes('director-plan-sha256=' + plan.planSha256) ||
          revision.digest !== existing.revisionDigest ||
          existing.renderInputSha256 !==
            digest({ spec: revision.spec, profile: existing.profile }) ||
          canonical(existing.audioAssetSha256s) !==
            canonical(
              revision.spec.scenes.flatMap((scene) => (scene.audio ? [scene.audio.assetId] : [])),
            ) ||
          artifact.qc.frames !== totalFrames(revision.spec) ||
          artifact.qc.expectedFrames !== totalFrames(revision.spec) ||
          artifact.qc.width !== profiles[existing.profile].width ||
          artifact.qc.height !== profiles[existing.profile].height ||
          artifact.qc.fps !== '24/1' ||
          artifact.qc.hasAudio !== existing.voice
        )
          throw new StudioError('DIRECTOR_RECEIPT_CORRUPT', 'Source plan, revision or media profile differs.');
        for (const id of existing.audioAssetSha256s) await this.app.store.verifyAsset(id);
        return existing;
      }
      // Write the deterministic project identity BEFORE the first project mutation.
      // Store.create binds the same stable key and handles restart after partial writes.
      const progressFile = path.join(
        this.app.store.root,
        'director-m5',
        plan.planSha256 + '.progress.json',
      );
      const progress = {
        schemaVersion: 'director-m5-progress/1',
        planSha256: plan.planSha256,
        projectId: directorProjectId(plan.planSha256),
      };
      await mkdir(path.dirname(progressFile), { recursive: true });
      let previous: unknown;
      try {
        previous = JSON.parse(await readFile(progressFile, 'utf8'));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
          throw new StudioError('DIRECTOR_PROGRESS_CORRUPT', 'Cannot read progress journal.');
      }
      if (previous) {
        if (canonical(previous) !== canonical(progress))
          throw new StudioError(
            'DIRECTOR_PROGRESS_CORRUPT',
            'Progress journal is not bound to this plan.',
          );
      } else {
        const temp = progressFile + '.' + randomUUID() + '.tmp';
        await writeFile(temp, JSON.stringify(progress, null, 2) + '\n', {
          flag: 'wx',
          mode: 0o600,
        });
        await rename(temp, progressFile);
      }
      const receipt = await executeDirectorPlan(this.app, plan, {
        approved: true,
        retryTransient: true,
      });
      await mkdir(path.dirname(file), { recursive: true });
      const temp = file + '.' + randomUUID() + '.tmp';
      await writeFile(temp, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      await rename(temp, file);
      return receipt;
    };
    const pending = execute();
    this.running = pending;
    try {
      return await pending;
    } catch (error) {
      const safe = errorInfo(error);
      if (safe.code === 'INTERNAL_ERROR')
        throw new StudioError('DIRECTOR_EXECUTION_FAILED', safe.message, 500);
      throw error;
    } finally {
      if (this.running === pending) this.running = undefined;
    }
  }
}
