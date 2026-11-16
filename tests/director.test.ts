import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Studio } from '../src/application.js';
import {
  DirectorService,
  executeDirectorPlan,
  planDirector,
  validateDirectorPlan,
  type DirectorInput,
} from '../src/director.js';
import {
  StudioError,
  hash,
  canonical,
  profiles,
  totalFrames,
  type Artifact,
  type Job,
} from '../src/domain.js';
import type { RenderFunction } from '../src/render.js';

const intent = (script?: string): DirectorInput => ({
  title: 'A new story',
  script:
    script ??
    '[title=Greeting; action=wave; camera=static; seconds=4]\nA warm hello.\n\n' +
      '[title=Journey; action=walk; camera=pan; seconds=4]\nWalking toward tomorrow.',
  style: 'paper-cut',
  language: 'en',
  profile: 'preview',
  voice: false,
});
const synthetic: RenderFunction = async (_store, spec, profile, dir, signal) => {
  signal.throwIfAborted();
  const file = path.join(dir, 'director-fake.mp4');
  await writeFile(file, 'FAKE-TEST-BYTES-NOT-A-VIDEO');
  const frames = totalFrames(spec);
  return {
    file,
    qc: {
      frames,
      expectedFrames: frames,
      width: profiles[profile].width,
      height: profiles[profile].height,
      fps: '24/1',
      duration: frames / 24,
      hasAudio: spec.scenes.some((s) => Boolean(s.audio)),
    },
  };
};
async function fixture(
  t: test.TestContext,
  renderer: RenderFunction = synthetic,
): Promise<{ app: Studio; root: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'director-m5-test-'));
  const app = await Studio.open(root, renderer, 'm5-test-runtime');
  t.after(async () => {
    await app.close();
    await rm(root, { recursive: true, force: true });
  });
  return { app, root };
}
const codeIs = (expected: string) => (error: unknown) =>
  error instanceof StudioError && error.code === expected;

test('M5 versioned deterministic graph includes actual executors, action capabilities and hashes', () => {
  const first = planDirector(intent());
  assert.deepEqual(first, planDirector(intent()));
  assert.equal(first.schemaVersion, 'director-m5/1');
  assert.equal(first.graph.length, 3);
  assert.deepEqual(
    first.graph.map((n) => n.id),
    ['scenes', 'render', 'verify'],
  );
  assert.deepEqual(first.graph[2]!.needs, ['render']);
  assert.deepEqual(
    first.spec.scenes.map((s) => s.action),
    ['wave', 'walk'],
  );
  assert.equal(validateDirectorPlan(first).planSha256, first.planSha256);
  const withVoice = planDirector({ ...intent(), voice: true, profile: 'final' });
  assert.deepEqual(
    withVoice.graph.map((n) => n.id),
    ['scenes', 'voice', 'render', 'verify'],
  );
  assert.deepEqual(withVoice.graph[2]!.needs, ['voice']);
  assert.notEqual(withVoice.planSha256, first.planSha256);
  const other = planDirector(intent('[action=pick-up; seconds=4]\nA little cup.'));
  assert.notEqual(other.planSha256, first.planSha256);
});
test('M5 fail closed for unsupported skills, forged graph, malicious extra fields and impossible inputs', () => {
  for (const input of [
    { ...intent(), script: '[action=fly; seconds=4]\nI fly.' },
    { ...intent(), script: '[action=wave; camera=orbit; seconds=4]\nHi.' },
    { ...intent(), script: '[action=wave; seconds=0]\nHi.' },
    { ...intent(), script: '[code=process.exit(1)]\nunsafe' },
    { ...intent(), style: '3d' },
    { ...intent(), profile: 'raw' },
    { ...intent(), dangerous: true },
  ])
    assert.throws(() => planDirector(input));
  const valid = planDirector(intent());
  const forgery = structuredClone(valid);
  forgery.graph[1]!.skill = 'arbitrary-javascript' as (typeof forgery.graph)[number]['skill'];
  assert.throws(() => validateDirectorPlan(forgery), codeIs('DIRECTOR_PLAN_TAMPERED'));
  const cycle = structuredClone(valid);
  cycle.graph[0]!.needs = ['verify'];
  assert.throws(() => validateDirectorPlan(cycle), codeIs('DIRECTOR_PLAN_TAMPERED'));
  const replay = structuredClone(valid);
  replay.planSha256 = '0'.repeat(64);
  assert.throws(() => validateDirectorPlan(replay), codeIs('DIRECTOR_PLAN_TAMPERED'));
  const unknown = structuredClone(valid) as typeof valid & { extra?: boolean };
  unknown.extra = true;
  assert.throws(() => validateDirectorPlan(unknown), codeIs('DIRECTOR_PLAN_TAMPERED'));
});
test('M5 requires explicit approval and never modifies an already saved human edit', async (t) => {
  const { app } = await fixture(t);
  const plan = planDirector(intent());
  await assert.rejects(
    executeDirectorPlan(app, plan, { approved: false }),
    codeIs('DIRECTOR_APPROVAL_REQUIRED'),
  );
  assert.equal((await app.store.list('projects')).length, 0);
  const director = new DirectorService(app);
  await assert.rejects(director.run(plan, false), codeIs('DIRECTOR_APPROVAL_REQUIRED'));
  const done = await director.run(plan, true);
  assert.equal(done.autoApproved, false);
  assert.equal(done.status, 'succeeded');
  assert.deepEqual(
    done.tasks.map((s) => s.id),
    ['scenes', 'render', 'verify'],
  );
  const same = await director.run(plan, true);
  assert.equal(same.receiptSha256, done.receiptSha256);
  assert.equal((await app.store.list('projects')).length, 1);
  const current = await app.store.current(done.projectId);
  const revised = structuredClone(current.revision.spec);
  revised.scenes[0]!.title = 'A HUMAN EDIT';
  await app.store.revise(done.projectId, current.revision.id, revised);
  await assert.rejects(director.run(plan, true), codeIs('DIRECTOR_REVISION_CHANGED'));
  assert.equal(
    (await app.store.current(done.projectId)).revision.spec.scenes[0]!.title,
    'A HUMAN EDIT',
  );
  assert.equal((await app.store.list('projects')).length, 1);
});
test('M5 renderer transient failure uses one bounded retry and preserves original failed attempt', async (t) => {
  let calls = 0;
  const { app } = await fixture(t, async (...args) => {
    if (calls++ === 0) throw new StudioError('RENDER_TEMPORARY', 'Injected retryable failure');
    return synthetic(...args);
  });
  const receipt = await new DirectorService(app).run(planDirector(intent()), true);
  assert.equal(calls, 2);
  const job = await app.store.get<Job>('jobs', receipt.jobId);
  assert.equal(job.attempts.length, 2);
  assert.equal(job.attempts[0]!.error?.code, 'RENDER_TEMPORARY');
  assert.equal(job.status, 'succeeded');
});
test('M5 permanent renderer failure never retries or fabricates a succeeded receipt', async (t) => {
  let calls = 0;
  const { app, root } = await fixture(t, async () => {
    calls++;
    throw new StudioError('INVALID_RENDER_INPUT', 'Fatal unsupported render input');
  });
  const plan = planDirector(intent());
  await assert.rejects(new DirectorService(app).run(plan, true), codeIs('DIRECTOR_RENDER_FAILED'));
  assert.equal(calls, 1);
  assert.equal((await app.store.list<Artifact>('artifacts')).length, 0);
  await assert.rejects(readFile(path.join(root, 'director-m5', plan.planSha256 + '.json')));
});
test('M5 media QC and receipt persistence reject fabricated profiles and changed bytes', async (t) => {
  const { app, root } = await fixture(t, async (...args) => {
    const value = await synthetic(...args);
    value.qc.width = 123;
    return value;
  });
  const plan = planDirector(intent());
  await assert.rejects(
    new DirectorService(app).run(plan, true),
    codeIs('DIRECTOR_MEDIA_QC_INVALID'),
  );
  await assert.rejects(readFile(path.join(root, 'director-m5', plan.planSha256 + '.json')));
});
test('M5 stored recipe refuses corrupted artifact rather than trusting cache', async (t) => {
  const { app } = await fixture(t);
  const director = new DirectorService(app);
  const receipt = await director.run(planDirector(intent()), true);
  await writeFile(app.store.artifactFile(receipt.artifactId), 'CORRUPTED');
  await assert.rejects(
    director.run(planDirector(intent()), true),
    codeIs('DIRECTOR_ARTIFACT_INVALID'),
  );
  assert.equal((await app.store.list('projects')).length, 1);
  assert.notEqual(hash('CORRUPTED'), receipt.artifactSha256);
});

test('M5-RECHECK-002 recover a completed video after missing receipt and process restart', async (t) => {
  const { app, root } = await fixture(t);
  const plan = planDirector(intent());
  // Simulates a real process crash after Studio committed the final artifact,
  // before the Director service wrote its success receipt.
  const first = await executeDirectorPlan(app, plan, { approved: true });
  assert.equal((await app.store.list('projects')).length, 1);
  assert.equal((await app.store.list('artifacts')).length, 1);
  await app.close();
  const restarted = await Studio.open(root, synthetic, 'm5-test-runtime');
  try {
    const resumed = await new DirectorService(restarted).run(plan, true);
    assert.equal(resumed.projectId, first.projectId);
    assert.equal(resumed.artifactId, first.artifactId);
    assert.equal((await restarted.store.list('projects')).length, 1);
    assert.equal((await restarted.store.list('jobs')).length, 1);
    assert.equal((await restarted.store.list('artifacts')).length, 1);
  } finally {
    await restarted.close();
  }
});

test('M5 recovery rejects a corrupted plan journal without creating another project', async (t) => {
  const { app, root } = await fixture(t);
  const director = new DirectorService(app);
  const plan = planDirector(intent());
  const first = await director.run(plan, true);
  await rm(path.join(root, 'director-m5', plan.planSha256 + '.json'));
  await writeFile(
    path.join(root, 'director-m5', plan.planSha256 + '.progress.json'),
    JSON.stringify({
      schemaVersion: 'director-m5-progress/1',
      planSha256: plan.planSha256,
      projectId: 'prj_fake',
    }),
  );
  await assert.rejects(director.run(plan, true), codeIs('DIRECTOR_PROGRESS_CORRUPT'));
  assert.equal((await app.store.list('projects')).length, 1);
  assert.equal((await app.store.list('artifacts')).length, 1);
  assert.ok(first.artifactId);
});

test('M5-RECHECK-003 reject voice-induced changes to approved scene duration before rendering', async (t) => {
  const { app } = await fixture(t);
  const voice = app.voice.bind(app);
  app.voice = async (projectId, revisionId) => {
    const initial = await voice(projectId, revisionId);
    const changed = structuredClone(initial.spec);
    changed.scenes[0]!.durationFrames += 24;
    return app.store.revise(projectId, initial.id, changed, [
      'Giọng eSpeak local dùng cho timing nháp; người dùng cần duyệt chất lượng hoặc thay WAV.',
    ]);
  };
  await assert.rejects(
    new DirectorService(app).run(planDirector({ ...intent(), voice: true }), true),
    codeIs('DIRECTOR_VOICE_TIMING_CHANGED'),
  );
  assert.equal((await app.store.list('jobs')).length, 0);
});

test('M5-AUDIT-004: forged rehashed receipt cannot pretend to be native M4 or auto-approved', async (t) => {
  const { app, root } = await fixture(t);
  const director = new DirectorService(app);
  const plan = planDirector(intent());
  const original = await director.run(plan, true);
  const file = path.join(root, 'director-m5', plan.planSha256 + '.json');
  for (const forged of [
    { source: 'native-m4-physics' },
    { autoApproved: true },
    { schemaVersion: 'director-m5-receipt/99' },
  ]) {
    const payload = { ...original, ...forged } as Record<string, unknown>;
    delete payload.receiptSha256;
    await writeFile(file, JSON.stringify({ ...payload, receiptSha256: hash(canonical(payload)) }));
    await assert.rejects(
      director.run(plan, true),
      codeIs('DIRECTOR_RECEIPT_CORRUPT'),
      'A receipt rehashed after unsupported source/approval/schema changes must be rejected',
    );
  }
});

test('M5-AUDIT-005: forged QC and graph-task evidence cannot bypass receipt revalidation', async (t) => {
  const { app, root } = await fixture(t);
  const director = new DirectorService(app);
  const plan = planDirector(intent());
  const original = await director.run(plan, true);
  const file = path.join(root, 'director-m5', plan.planSha256 + '.json');
  const variants = [
    { qc: { ...original.qc, width: 17 } },
    { tasks: original.tasks.filter((x) => x.id !== 'verify') },
    { jobId: 'job_fabricated' },
  ];
  for (const forged of variants) {
    const payload = { ...original, ...forged } as Record<string, unknown>;
    delete payload.receiptSha256;
    await writeFile(file, JSON.stringify({ ...payload, receiptSha256: hash(canonical(payload)) }));
    await assert.rejects(
      director.run(plan, true),
      codeIs('DIRECTOR_RECEIPT_CORRUPT'),
      'A rehashed but untruthful success claim must be rejected',
    );
  }
});

test('M5-AUDIT-006: cached Director receipt cannot succeed when associated render job is no longer successful', async (t) => {
  const { app } = await fixture(t);
  const director = new DirectorService(app);
  const plan = planDirector(intent());
  const original = await director.run(plan, true);
  const job = await app.store.get<Job>('jobs', original.jobId);
  job.status = 'failed';
  job.error = { code: 'INJECTED_JOB_CORRUPTION', message: 'job no longer succeeded' };
  await app.store.put('jobs', job.id, job);
  await assert.rejects(
    director.run(plan, true),
    codeIs('DIRECTOR_RECEIPT_CORRUPT'),
    'Previously completed receipt must be bound to an actually successful job',
  );
});
