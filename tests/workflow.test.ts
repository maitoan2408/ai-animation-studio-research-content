import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Studio } from '../src/application.js';
import { StudioError, type Artifact, type Job } from '../src/domain.js';
import type { RenderFunction } from '../src/render.js';
import { wav, pcmFromWav, bindAudio } from '../src/audio.js';
import { hash, now, uid } from '../src/domain.js';

const fakeRenderer: RenderFunction = async (_store, spec, _profile, dir, signal, progress) => {
  signal.throwIfAborted();
  await progress(0.5, 'Fake renderer for state tests');
  const file = path.join(dir, 'test.mp4');
  await writeFile(file, 'state-machine-test-only');
  return {
    file,
    qc: {
      frames: spec.scenes.reduce((n, s) => n + s.durationFrames, 0),
      expectedFrames: 48,
      fps: '24/1',
      width: 640,
      height: 360,
      duration: 2,
      hasAudio: false,
    },
  };
};
async function fixture(t: test.TestContext, renderer = fakeRenderer) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'studio-unit-')),
    app = await Studio.open(root, renderer, 'test-runtime');
  t.after(async () => {
    await app.close();
    await rm(root, { recursive: true, force: true });
  });
  const project = await app.create('[action=wave; seconds=2]\nHello.', 'Test');
  return { app, project, root };
}
test('one data owner; failed attempt retries without overwriting history', async (t) => {
  let count = 0;
  const { app, root, project } = await fixture(t, async (...args) => {
    if (count++ === 0) throw new StudioError('INJECTED_FAILURE', 'test failure');
    return fakeRenderer(...args);
  });
  await assert.rejects(() => Studio.open(root), /đang được process/);
  const job = await app.enqueue(project.id, project.currentRevisionId);
  assert.equal((await app.wait(job.id)).status, 'failed');
  assert.equal((await app.store.list<Artifact>('artifacts')).length, 0);
  await app.retry(job.id);
  const done = await app.wait(job.id);
  assert.equal(done.status, 'succeeded');
  assert.equal(done.attempts.length, 2);
  assert.equal(done.attempts[0]!.error!.code, 'INJECTED_FAILURE');
  await assert.rejects(() => app.retry(job.id), /Chỉ retry/);
});
test('duplicate submit, active cancellation and manual retry', async (t) => {
  let block = true;
  const { app, project } = await fixture(t, async (...args) => {
    if (block)
      await new Promise<void>((resolve, reject) => {
        const signal = args[4];
        if (signal.aborted) reject(signal.reason);
        else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
    return fakeRenderer(...args);
  });
  const submissions = await Promise.all(
    Array.from({ length: 4 }, () => app.enqueue(project.id, project.currentRevisionId)),
  );
  assert.equal(new Set(submissions.map((j) => j.id)).size, 1);
  const job = submissions[0]!;
  while ((await app.store.get<Job>('jobs', job.id)).status === 'queued')
    await new Promise((r) => setTimeout(r, 10));
  await app.cancel(job.id);
  assert.equal((await app.wait(job.id)).status, 'cancelled');
  assert.equal((await app.store.list('artifacts')).length, 0);
  block = false;
  await app.retry(job.id);
  assert.equal((await app.wait(job.id)).status, 'succeeded');
});
test('cache verifies bytes and binds reused output to the requested revision', async (t) => {
  let calls = 0;
  const { app, project } = await fixture(t, async (...args) => {
    calls++;
    return fakeRenderer(...args);
  });
  const first = await app.wait((await app.enqueue(project.id, project.currentRevisionId)).id);
  const { revision } = await app.store.current(project.id);
  const next = await app.store.revise(project.id, revision.id, revision.spec);
  const cached = await app.wait((await app.enqueue(project.id, next.id)).id);
  assert.equal(calls, 1);
  assert.equal(cached.cacheHit, true);
  assert.notEqual(cached.artifactId, first.artifactId);
  const review = await app.store.review(cached.artifactId!, {
    reviewer: 'Unit test reviewer',
    decision: 'approved',
    notes: 'Synthetic fixture',
  });
  assert.equal(review.revisionId, next.id);
  for (const artifact of await app.store.list<Artifact>('artifacts'))
    await writeFile(app.store.artifactFile(artifact.id), 'corrupt');
  await assert.rejects(
    () =>
      app.store.review(cached.artifactId!, { reviewer: 'test', decision: 'approved', notes: '' }),
    /khớp artifact/,
  );
  const repaired = await app.wait((await app.enqueue(project.id, next.id)).id);
  assert.equal(repaired.status, 'succeeded');
  assert.equal(calls, 2);
  assert.equal(repaired.cacheHit, false);
});
test('portable package checks all hashes before importing and does not inherit approval', async (t) => {
  const { app, project } = await fixture(t),
    { revision } = await app.store.current(project.id);
  const bytes = wav(Buffer.alloc(9600)),
    id = hash(bytes);
  const asset = {
    id,
    kind: 'audio' as const,
    extension: 'wav' as const,
    bytes: bytes.length,
    duration: 0.1,
    sampleRate: 48000,
    source: 'upload' as const,
    createdAt: now(),
  };
  await writeFile(app.store.assetFile(id), bytes);
  await app.store.put('assets', id, asset);
  await app.store.revise(project.id, revision.id, bindAudio(revision.spec, 's001', asset));
  const exported = await app.export(project.id),
    imported = await app.import(exported);
  assert.deepEqual((await app.store.current(imported.id)).revision.spec, exported.spec);
  assert.equal((await app.snapshot(imported.id)).reviews.length, 0);
  const count = (await app.store.list('projects')).length;
  exported.assets[0]!.base64 = Buffer.from('tampered').toString('base64');
  await assert.rejects(() => app.import(exported), /hash/);
  assert.equal((await app.store.list('projects')).length, count);
});
test('WAV parsing rejects format confusion and truncated chunks', () => {
  const bytes = wav(Buffer.alloc(100));
  assert.equal(pcmFromWav(bytes).length, 100);
  assert.throws(() => pcmFromWav(bytes.subarray(0, 90)), /cắt/);
  const stereo = Buffer.from(bytes);
  stereo.writeUInt16LE(2, 22);
  assert.throws(() => pcmFromWav(stereo), /PCM mono/);
});

test('reopening persisted running state interrupts its attempt and keeps the next owner locked', async (t) => {
  const { app, project, root } = await fixture(t);
  const completed = await app.wait((await app.enqueue(project.id, project.currentRevisionId)).id);
  const interrupted: Job = {
    ...completed,
    id: uid('job'),
    status: 'running',
    stage: 'Capturing',
    progress: 0.3,
    attempts: [{ id: uid('attempt'), startedAt: now() }],
  };
  delete interrupted.artifactId;
  await app.store.put('jobs', interrupted.id, interrupted);
  await app.close();
  const reopened = await Studio.open(root, fakeRenderer, 'test-runtime');
  try {
    const recovered = await reopened.store.get<Job>('jobs', interrupted.id);
    assert.equal(recovered.status, 'interrupted');
    assert.equal(recovered.attempts[0]!.error!.code, 'WORKER_INTERRUPTED');
    await app.close(); // An old owner closing twice must not remove the new owner's lock.
    await assert.rejects(() => Studio.open(root), /đang được process/);
    await reopened.retry(interrupted.id);
    assert.equal((await reopened.wait(interrupted.id)).status, 'succeeded');
    assert.ok(await readFile(reopened.store.artifactFile(completed.artifactId!)));
  } finally {
    await reopened.close();
  }
});
