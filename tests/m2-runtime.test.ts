import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { doctor, run } from '../src/process.js';
import { StudioError } from '../src/domain.js';
import { Studio } from '../src/application.js';
import { m2Provenance } from '../scripts/m2-provenance.js';

test('M2 provenance supports a container checkout owned by another UID', (t) => {
  const original = process.env.GIT_TEST_ASSUME_DIFFERENT_OWNER;
  process.env.GIT_TEST_ASSUME_DIFFERENT_OWNER = 'true';
  t.after(() => {
    if (original === undefined) delete process.env.GIT_TEST_ASSUME_DIFFERENT_OWNER;
    else process.env.GIT_TEST_ASSUME_DIFFERENT_OWNER = original;
  });
  const result = m2Provenance();
  assert.match(result.checkoutCommit, /^[0-9a-f]{40}$/);
  assert.match(result.trackedDiffSha256, /^[0-9a-f]{64}$/);
});

test('doctor fails helpfully on missing rasterizer and recovers after installation', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'studio-doctor-'));
  const oldPath = process.env.PATH,
    oldBrowser = process.env.STUDIO_BROWSER;
  t.after(async () => {
    process.env.PATH = oldPath;
    if (oldBrowser === undefined) delete process.env.STUDIO_BROWSER;
    else process.env.STUDIO_BROWSER = oldBrowser;
    await rm(dir, { recursive: true, force: true });
  });
  for (const name of ['ffmpeg', 'ffprobe', 'browser'])
    await writeFile(path.join(dir, name), '#!/bin/sh\necho fixture-version\n', { mode: 0o755 });
  process.env.PATH = dir;
  process.env.STUDIO_BROWSER = path.join(dir, 'browser');
  const app = await Studio.open(
    path.join(dir, 'store'),
    async (_store, _spec, _profile, output) => {
      const file = path.join(output, 'output.mp4');
      await writeFile(file, 'mock-output-for-state-test');
      return {
        file,
        qc: {
          frames: 96,
          expectedFrames: 96,
          fps: '24/1',
          width: 640,
          height: 360,
          duration: 4,
          hasAudio: false,
        },
      };
    },
  );
  t.after(() => app.close());
  const project = await app.create('Fixture.', 'Recover dependency');
  await assert.rejects(
    doctor,
    (error: unknown) =>
      error instanceof StudioError &&
      error.code === 'RASTERIZER_UNAVAILABLE' &&
      /librsvg2-bin/.test(error.message),
  );
  await assert.rejects(() => app.enqueue(project.id, project.currentRevisionId), /librsvg2-bin/);
  await writeFile(
    path.join(dir, 'rsvg-convert'),
    '#!/bin/sh\necho rsvg-convert-version-fixture\n',
    { mode: 0o755 },
  );
  assert.match(JSON.stringify(await doctor()), /rsvg-convert-version-fixture/);
  const completed = await app.wait((await app.enqueue(project.id, project.currentRevisionId)).id);
  assert.equal(completed.status, 'succeeded');
});

test(
  'cancelling a worker terminates its native child before a new attempt',
  { skip: process.platform !== 'linux' },
  async (t) => {
    const abort = new AbortController();
    let descendant = 0;
    t.after(() => {
      if (descendant) {
        try {
          process.kill(descendant, 'SIGKILL');
        } catch {}
      }
    });
    const program = `const {spawn}=require('node:child_process');
    const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'});
    console.log('READY '+child.pid); setInterval(()=>{},1000);`;
    await assert.rejects(
      () =>
        run(
          process.execPath,
          ['-e', program],
          abort.signal,
          (chunk) => {
            const ready = /READY (\d+)/.exec(chunk);
            if (ready) {
              descendant = Number(ready[1]);
              abort.abort();
            }
          },
          true,
        ),
      /abort/i,
    );
    assert.ok(descendant > 0);
    // A briefly unreaped zombie has exited and holds no renderer/encoder resources.
    const status = await readFile('/proc/' + descendant + '/status', 'utf8').catch(() => 'gone');
    assert.ok(status === 'gone' || /^State:\s+Z/m.test(status), 'native child still running');
    assert.equal(
      (
        await run(process.execPath, ['-e', 'console.log("retry")'], undefined, undefined, true)
      ).trim(),
      'retry',
    );
  },
);
