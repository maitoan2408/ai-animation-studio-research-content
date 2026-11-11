import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import puppeteer from 'puppeteer-core';
import { Studio } from '../src/application.js';
import { compile, qcVideo } from '../src/render.js';
import { hash, StudioError, type Artifact, type Job } from '../src/domain.js';
import { pcmFromWav, mixAudio } from '../src/audio.js';
import { doctor, run } from '../src/process.js';

const root = await mkdtemp(path.join(os.tmpdir(), 'studio-integration-'));
const output = path.resolve('artifacts');
await mkdir(output, { recursive: true });
const app = await Studio.open(root);
const checks: Array<{ name: string; status: 'PASS'; detail: unknown }> = [];
const pass = (name: string, detail: unknown) => {
  checks.push({ name, status: 'PASS', detail });
  console.log('PASS', name);
};
const started = Date.now();
try {
  const runtime = await doctor();
  const project = await app.create(
    await readFile('examples/smoke.txt', 'utf8'),
    'Integration smoke',
  );
  const voice = await app.voice(project.id, project.currentRevisionId);
  for (const scene of voice.spec.scenes) {
    assert.ok(scene.audio);
    const asset = await app.store.verifyAsset(scene.audio.assetId);
    assert.ok(asset.duration > 0 && asset.duration <= scene.durationFrames / 24);
    const pcm = pcmFromWav(await readFile(app.store.assetFile(asset.id)));
    let peak = 0;
    for (let i = 0; i < pcm.length; i += 2) peak = Math.max(peak, Math.abs(pcm.readInt16LE(i)));
    assert.ok(peak > 100);
    assert.equal(scene.audio.textHash, hash(scene.narration));
  }
  pass(
    'real Vietnamese draft voice is audible and fits every scene',
    voice.spec.scenes.map((s) => ({ id: s.id, frames: s.durationFrames, audio: s.audio })),
  );
  const composition = path.join(root, 'seek-composition');
  await compile(app.store, voice.spec, 'preview', composition);
  const compositionServer = http.createServer(async (req, res) => {
    const name = req.url === '/' ? 'index.html' : req.url?.slice(1);
    if (!name || !['index.html', 'gsap.min.js', 'audio.wav'].includes(name)) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader(
      'Content-Type',
      name.endsWith('.js') ? 'text/javascript' : name.endsWith('.wav') ? 'audio/wav' : 'text/html',
    );
    res.end(await readFile(path.join(composition, name)));
  });
  await new Promise<void>((resolve) => compositionServer.listen(0, '127.0.0.1', resolve));
  const browser = await puppeteer.launch({
    executablePath: runtime.browser,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 640, height: 360, deviceScaleFactor: 1 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(`http://127.0.0.1:${(compositionServer.address() as { port: number }).port}`);
    const capture = async (frame: number) => {
      await page.evaluate((f) => {
        const w = window as unknown as {
          __timelines: { shot: { seek: (time: number, suppressEvents: boolean) => void } };
        };
        w.__timelines.shot.seek(f / 24, false);
      }, frame);
      return hash(Buffer.from(await page.screenshot()));
    };
    const frames = [0, 12, 36, 47, 48, 72, 95],
      baseline = new Map<number, string>();
    for (const frame of frames) baseline.set(frame, await capture(frame));
    for (const frame of [...frames].reverse())
      assert.equal(await capture(frame), baseline.get(frame));
    assert.equal(errors.length, 0, errors.join('\n'));
    pass('browser seeks reproduce pixels in reverse order', Object.fromEntries(baseline));
  } finally {
    await browser.close();
    await new Promise<void>((resolve) => compositionServer.close(() => resolve()));
  }
  const preview = await app.wait((await app.enqueue(project.id, voice.id, 'preview')).id);
  assert.equal(preview.status, 'succeeded', JSON.stringify(preview.error));
  const artifact = await app.store.get<Artifact>('artifacts', preview.artifactId!);
  await copyFile(app.store.artifactFile(artifact.id), path.join(output, 'smoke-preview.mp4'));
  pass('HyperFrames strict multi-scene render + full decode/QC', artifact);
  const wrongSpec = structuredClone(voice.spec);
  wrongSpec.scenes[0]!.durationFrames += 24;
  await assert.rejects(
    () => qcVideo(app.store.artifactFile(artifact.id), wrongSpec, 'preview'),
    (error) => error instanceof StudioError && error.code === 'QC_FAILED',
  );
  pass('QC rejects output whose frame count disagrees with the revision', {
    expected: 120,
    actual: 96,
  });
  const decodedFile = path.join(root, 'decoded-audio.pcm');
  await run('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-i',
    app.store.artifactFile(artifact.id),
    '-vn',
    '-ac',
    '1',
    '-ar',
    '48000',
    '-f',
    's16le',
    decodedFile,
  ]);
  const decoded = await readFile(decodedFile),
    expected = pcmFromWav((await mixAudio(app.store, voice.spec)).audio!);
  let product = 0,
    energyExpected = 0,
    energyDecoded = 0;
  for (let i = 0; i < Math.min(decoded.length, expected.length); i += 2) {
    const a = expected.readInt16LE(i),
      b = decoded.readInt16LE(i);
    product += a * b;
    energyExpected += a * a;
    energyDecoded += b * b;
  }
  const correlation = product / Math.sqrt(energyExpected * energyDecoded);
  assert.ok(correlation > 0.98, `Audio at zero lag correlation=${correlation}`);
  pass('encoded speech remains aligned to mixed PCM at zero sample lag', {
    correlation,
    minimum: 0.98,
  });
  const hit = await app.wait((await app.enqueue(project.id, voice.id, 'preview')).id);
  assert.equal(hit.cacheHit, true);
  pass('real artifact cache hit after hash verification', { job: hit.id });
  const packed = await app.export(project.id),
    reopened = await app.import(packed);
  assert.deepEqual((await app.store.current(reopened.id)).revision.spec, voice.spec);
  pass('export and reopen preserve exact spec and audio hashes', { project: reopened.id });
  const audio = voice.spec.scenes[0]!.audio!,
    file = app.store.assetFile(audio.assetId),
    saved = await readFile(file);
  await writeFile(file, Buffer.from('corrupt'));
  await assert.rejects(() => app.enqueue(project.id, voice.id), /thay đổi/);
  await writeFile(file, saved);
  pass('tampered audio rejected before queueing', { assetId: audio.assetId });
  const cancellable = await app.create(
    '[action=walk; seconds=3]\nCancel fixture.',
    'Cancel fixture',
  );
  const cancelling = await app.enqueue(cancellable.id, cancellable.currentRevisionId);
  const cancelDeadline = Date.now() + 30000;
  while (Date.now() < cancelDeadline) {
    const job = await app.store.get<Job>('jobs', cancelling.id);
    if (job.status === 'running' && job.progress >= 0.05) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  await app.cancel(cancelling.id);
  const cancelled = await app.wait(cancelling.id);
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.artifactId, undefined);
  await app.retry(cancelling.id);
  const retried = await app.wait(cancelling.id);
  assert.equal(retried.status, 'succeeded');
  assert.equal(retried.attempts.length, 2);
  pass('real renderer cancellation publishes nothing; manual retry succeeds', {
    cancelled: cancelled.status,
    retried: retried.status,
    attempts: retried.attempts.length,
  });
  const { revision } = await app.store.current(project.id);
  for (const style of ['multiplane', 'shadow-box'] as const) {
    const current = await app.store.current(project.id),
      spec = structuredClone(revision.spec);
    spec.style = style;
    const rev = await app.store.revise(project.id, current.revision.id, spec);
    const done = await app.wait((await app.enqueue(project.id, rev.id)).id);
    assert.equal(done.status, 'succeeded', JSON.stringify(done.error));
    pass(`real ${style} render`, (await app.store.get<Artifact>('artifacts', done.artifactId!)).qc);
  }
  const pilot = await app.create(
    await readFile('examples/morning.txt', 'utf8'),
    'Chiếc cốc buổi sáng',
    'paper-cut',
  );
  const pilotVoice = await app.voice(pilot.id, pilot.currentRevisionId);
  const final = await app.wait((await app.enqueue(pilot.id, pilotVoice.id, 'final')).id);
  assert.equal(final.status, 'succeeded', JSON.stringify(final.error));
  const finalArtifact = await app.store.get<Artifact>('artifacts', final.artifactId!);
  await copyFile(app.store.artifactFile(finalArtifact.id), path.join(output, 'morning-final.mp4'));
  await writeFile(
    path.join(output, 'morning.studio.json'),
    JSON.stringify(await app.export(pilot.id), null, 2) + '\n',
  );
  await run('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-ss',
    '6',
    '-i',
    path.join(output, 'morning-final.mp4'),
    '-frames:v',
    '1',
    path.join(output, 'morning-frame.png'),
  ]);
  pass('1080p pilot with three scenes and local voice', finalArtifact);
  // CLI uses the compiled application and an independent store.
  const cliData = path.join(root, 'cli-data'),
    cli = (args: string[]) => run(process.execPath, ['dist/cli.js', ...args, '--data', cliData]);
  const created = JSON.parse(await cli(['create', 'examples/smoke.txt', '--title', 'CLI smoke']));
  await cli(['voice', created.id]);
  const cliJob = JSON.parse(await cli(['render', created.id]));
  assert.equal(cliJob.status, 'succeeded');
  pass('compiled CLI create -> voice -> render', { project: created.id, job: cliJob.id });
  await writeFile(
    path.join(output, 'integration-results.json'),
    JSON.stringify(
      {
        status: 'PASS',
        runtime,
        elapsedSeconds: (Date.now() - started) / 1000,
        dataRoot: root,
        checks,
        limitations: [
          'Voice is a timing draft; no phoneme lip-sync claim.',
          'Human artistic review is pending.',
          'Single trial is not a production throughput benchmark.',
        ],
      },
      null,
      2,
    ) + '\n',
  );
} catch (error) {
  await writeFile(
    path.join(output, 'integration-failure.json'),
    JSON.stringify({ root, error: String(error), checks }, null, 2),
  );
  throw error;
} finally {
  await app.close();
  console.log('Integration data:', root);
}
