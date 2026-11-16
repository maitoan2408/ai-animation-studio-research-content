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
/** Strictly user-confirmed execution. No review or aesthetic approval is written. */
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
  );
  let revision = await assertCurrent(app, project.id, project.currentRevisionId);
  if (digest(revision.spec) !== plan.specSha256)
    throw new StudioError(
      'DIRECTOR_COMPILE_DIVERGED',
      'Compiled project is not the approved plan.',
    );
  const tasks: DirectorReceipt['tasks'] = [
    { id: 'scenes', skill: 'script-to-scenes', status: 'succeeded', attempt: 1 },
  ];
  if (plan.intent.voice) {
    revision = await app.voice(project.id, revision.id);
    await assertCurrent(app, project.id, revision.id);
    // A voice step may extend timing; the immutable revised spec is the render input.
    tasks.push({ id: 'voice', skill: 'prepare-audio', status: 'succeeded', attempt: 1 });
  }
  await assertCurrent(app, project.id, revision.id);
  let job = await app.enqueue(project.id, revision.id, plan.intent.profile);
  job = await app.wait(job.id);
  if (
    job.status !== 'succeeded' &&
    options.retryTransient &&
    transient.has(job.error?.code ?? '')
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
    (plan.intent.voice && !artifact.qc.hasAudio)
  )
    throw new StudioError('DIRECTOR_MEDIA_QC_INVALID', 'Real media profile fails plan checks.');
  tasks.push({ id: 'verify', skill: 'verify-artifact', status: 'succeeded', attempt: 1 });
  const payload = {
    schemaVersion: 'director-m5-receipt/1' as const,
    planSha256: plan.planSha256,
    status: 'succeeded' as const,
    tasks,
    projectId: project.id,
    revisionId: revision.id,
    revisionDigest: revision.digest,
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
        const { receiptSha256, ...payload } = existing;
        if (
          receiptSha256 !== digest(payload) ||
          existing.planSha256 !== plan.planSha256 ||
          existing.status !== 'succeeded'
        )
          throw new StudioError('DIRECTOR_RECEIPT_CORRUPT', 'Stored receipt was modified.');
        const artifact = await this.app.store.get<Artifact>('artifacts', existing.artifactId);
        if (
          artifact.sha256 !== existing.artifactSha256 ||
          !(await this.app.store.verifyArtifact(artifact))
        )
          throw new StudioError(
            'DIRECTOR_ARTIFACT_INVALID',
            'Previously completed video was modified.',
          );
        await assertCurrent(this.app, existing.projectId, existing.revisionId);
        return existing;
      }
      const receipt = await executeDirectorPlan(this.app, plan, {
        approved: true,
        retryTransient: true,
      });
      await mkdir(path.dirname(file), { recursive: true });
      const temp = file + '.' + randomUUID() + '.tmp';
      await writeFile(temp, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
      await rename(temp, file);
      return receipt;
    };
    const pending = execute();
    this.running = pending;
    try {
      return await pending;
    } catch (error) {
      // The root Studio still owns and records any failed render attempt.
      const safe = errorInfo(error);
      if (safe.code === 'INTERNAL_ERROR')
        throw new StudioError('DIRECTOR_EXECUTION_FAILED', safe.message, 500);
      throw error;
    } finally {
      if (this.running === pending) this.running = undefined;
    }
  }
}
