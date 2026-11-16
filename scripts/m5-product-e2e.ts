/** M5 product gate: two NEW scripts → approved graph UI → real Studio/voice/1080p MP4.
 * Artifacts are copied from the actual persisted Studio output, never mock media.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { Studio } from '../src/application.js';
import { serve } from '../src/server.js';
import { doctor } from '../src/process.js';
import { planDirector, validateDirectorPlan, type DirectorReceipt } from '../src/director.js';
import { totalFrames, type Artifact, type Job } from '../src/domain.js';

const folder = path.resolve(process.env.M5_OUTPUT_DIR ?? 'artifacts/product-first/m5');
const head = process.env.SOURCE_HEAD_SHA || process.env.GITHUB_SHA || 'LOCAL_UNPINNED';
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
const run = (command: string, args: string[], limit = 12 * 1024 * 1024) => {
  const p = spawnSync(command, args, { maxBuffer: limit });
  assert.equal(p.status, 0, command + ': ' + String(p.stderr || p.error).slice(-3000));
  return p.stdout;
};
const cases = [
  {
    id: 'a',
    title: 'Khu vườn thức giấc',
    style: 'paper-cut',
    language: 'vi',
    profile: 'final',
    voice: true,
    script: `[title=Ánh sáng đầu ngày; action=wave; camera=static; seconds=6]
Buổi sáng đã đến rồi. Tôi vẫy tay chào một ngày mới.

[title=Đường nhỏ; action=walk; camera=pan; seconds=6]
Tôi bước chậm trên con đường xanh và ngắm khu vườn yên bình.

[title=Lời hứa; action=talk; camera=static; seconds=6]
Ngày hôm nay sẽ là một hành trình rất đẹp, hãy cùng bắt đầu nhé.`,
  },
  {
    id: 'b',
    title: 'Letters from the river',
    style: 'multiplane',
    language: 'en',
    profile: 'final',
    voice: true,
    script: `[title=The riverside; action=walk; camera=pan; seconds=6]
I follow the river as the first leaves dance in the morning breeze.

[title=A little discovery; action=pick-up; camera=static; seconds=6]
A small cup waits on the table. I lift it and smile.

[title=An invitation; action=wave; camera=static; seconds=6]
The day is full of possibilities. Come and explore it with me.`,
  },
] as const;
const manifest: {
  milestone: string;
  sourceCommit: string;
  programs: Array<{
    id: string;
    title: string;
    planSha256: string;
    receiptSha256: string;
    projectId: string;
    revisionId: string;
    artifactId: string;
    revisionDigest: string;
    video: { file: string; sha256: string; frames: number; width: number; height: number; fps: string; audio: boolean };
    graphScreenshot: { file: string; sha256: string };
    completedScreenshot: { file: string; sha256: string };
    contact: { file: string; sha256: string };
    projectFile: { file: string; sha256: string };
    planFile: { file: string; sha256: string };
    receiptFile: { file: string; sha256: string };
    audioSamples: number;
    audioEnergy: number;
  }>;
  failureScreenshot?: { file: string; sha256: string; code: string };
  createdAt: string;
} = { milestone: 'M5', sourceCommit: head, programs: [], createdAt: new Date().toISOString() };

await mkdir(folder, { recursive: true });
const tmp = await mkdtemp(path.join(os.tmpdir(), 'm5-director-studio-'));
const runtime = await doctor();
const app = await Studio.open(tmp);
const server = await serve(app, 0);
const browser = await puppeteer.launch({
  executablePath: runtime.browser,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  const fill = async (name: string, value: string) => {
    await page.$eval(
      '#director-form [name="' + name + '"]',
      (el, text) => {
        (el as HTMLInputElement).value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      },
      value,
    );
  };
  const save = async (file: string, bytes: Buffer | string) => {
    const content = typeof bytes === 'string' ? Buffer.from(bytes) : bytes;
    await writeFile(path.join(folder, file), content);
    return { file, sha256: sha(content) };
  };
  for (const story of cases) {
    await page.goto(server.url + '/director', { waitUntil: 'networkidle0' });
    const intent = {
      title: story.title,
      script: story.script,
      style: story.style,
      language: story.language,
      profile: story.profile,
      voice: story.voice,
    };
    await fill('title', story.title);
    await fill('script', story.script);
    await page.select('#director-form [name="style"]', story.style);
    await page.select('#director-form [name="language"]', story.language);
    await page.select('#director-form [name="profile"]', story.profile);
    await page.select('#director-form [name="voice"]', String(story.voice));
    await page.click('#director-plan');
    await page.waitForFunction(
      () => document.querySelector('#director-phase')?.textContent?.includes('Ready'),
      { timeout: 20000 },
    );
    assert.equal(await page.$$eval('#director-graph li', (nodes) => nodes.length), 4);
    assert.equal(await page.$$eval('#director-scenes li', (nodes) => nodes.length), 3);
    const plan = planDirector(intent);
    assert.equal(validateDirectorPlan(plan).planSha256, plan.planSha256);
    assert.ok(
      (await page.$eval('#director-sha', (node) => node.textContent ?? '')).includes(
        plan.planSha256,
      ),
    );
    const graphFile = 'm5-' + story.id + '-task-graph.png';
    await page.screenshot({ path: path.join(folder, graphFile), fullPage: true });
    const graphScreenshot = {
      file: graphFile,
      sha256: sha(await readFile(path.join(folder, graphFile))),
    };
    const planFile = await save('m5-' + story.id + '-plan.json', JSON.stringify(plan, null, 2) + '\n');
    await page.click('#director-run');
    await page.waitForFunction(
      () => {
        const phase = document.querySelector('#director-phase')?.textContent ?? '';
        return phase.includes('Rendered') || phase.includes('Failed');
      },
      { timeout: 1000000, polling: 1000 },
    );
    const finalPhase = await page.$eval('#director-phase', (n) => n.textContent);
    assert.ok(finalPhase?.includes('Rendered'), 'Director failed: ' + String(await page.$eval('#director-notice', (n) => n.textContent)));
    await page.waitForFunction(
      () => {
        const video = document.querySelector<HTMLVideoElement>('#director-video');
        return video && video.readyState >= 1 && video.videoWidth === 1920 &&
          video.videoHeight === 1080;
      },
      { timeout: 45000 },
    );
    const receiptFileName = path.join(tmp, 'director-m5', plan.planSha256 + '.json');
    const receipt = JSON.parse(await readFile(receiptFileName, 'utf8')) as DirectorReceipt;
    assert.equal(receipt.status, 'succeeded');
    assert.equal(receipt.autoApproved, false);
    assert.equal(receipt.source, 'root-studio-v1');
    assert.equal(receipt.planSha256, plan.planSha256);
    assert.equal(receipt.qc.width, 1920);
    assert.equal(receipt.qc.height, 1080);
    assert.equal(receipt.qc.fps, '24/1');
    assert.equal(receipt.qc.hasAudio, true);
    assert.ok(receipt.qc.frames >= 432);
    const snapshot = await app.snapshot(receipt.projectId);
    assert.equal(snapshot.reviews.length, 0, 'Director cannot forge an artistic review');
    assert.equal(snapshot.revision.id, receipt.revisionId);
    assert.deepEqual(snapshot.revision.spec.scenes.map((s) => s.action), plan.spec.scenes.map((s) => s.action));
    const packageSource = await app.export(receipt.projectId, receipt.revisionId);
    const projectFile = await save('m5-' + story.id + '-editable-project.json', JSON.stringify(packageSource, null, 2) + '\n');
    const revision = snapshot.revision;
    const job = await app.store.get<Job>('jobs', receipt.jobId);
    assert.equal(job.status, 'succeeded');
    assert.ok(job.attempts.length >= 1);
    const sourceArtifact = await app.store.get<Artifact>('artifacts', receipt.artifactId);
    assert.equal(sourceArtifact.sha256, receipt.artifactSha256);
    const videoFile = 'm5-script-' + story.id + '-final-1080p.mp4';
    await copyFile(app.store.artifactFile(receipt.artifactId), path.join(folder, videoFile));
    const videoBytes = await readFile(path.join(folder, videoFile));
    assert.equal(sha(videoBytes), receipt.artifactSha256);
    const probe = JSON.parse(
      run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-of', 'json', path.join(folder, videoFile)]).toString(),
    ) as { streams: Array<{
      codec_type: string; nb_read_frames: string; avg_frame_rate: string;
      sample_rate?: string; width?: number; height?: number;
    }> };
    const picture = probe.streams.find((s) => s.codec_type === 'video');
    const audio = probe.streams.find((s) => s.codec_type === 'audio');
    assert.equal(picture?.width, 1920);
    assert.equal(picture?.height, 1080);
    assert.equal(picture?.nb_read_frames, String(totalFrames(revision.spec)));
    assert.equal(picture?.avg_frame_rate, '24/1');
    assert.equal(audio?.sample_rate, '48000', 'real local voice must be muxed at 48 kHz');
    run('ffmpeg', ['-v', 'error', '-xerror', '-nostdin', '-threads', '1', '-i', path.join(folder, videoFile), '-f', 'null', '-']);
    const pcm = run('ffmpeg', ['-v', 'error', '-nostdin', '-threads', '1', '-i', path.join(folder, videoFile), '-vn', '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], 8 * 1024 * 1024);
    let energy = 0;
    for (let i = 0; i + 1 < pcm.length; i += 2) {
      const n = pcm.readInt16LE(i);
      energy += n * n;
    }
    assert.ok(energy > 1000000, 'real voice is silent');
    const audioEnergy = Math.sqrt(energy / Math.max(1, pcm.length / 2));
    const contactName = 'm5-' + story.id + '-chronological-contact.png';
    const last = totalFrames(revision.spec) - 1;
    const offsets = [0, Math.floor(last / 4), Math.floor(last / 2), Math.floor((last * 3) / 4), last];
    const filter = offsets.map((f) => 'eq(n\\,' + f + ')').join('+');
    run('ffmpeg', ['-v', 'error', '-y', '-i', path.join(folder, videoFile),
      '-vf', 'select=' + filter + ',scale=480:270,tile=3x2',
      '-frames:v', '1', path.join(folder, contactName)]);
    const contact = { file: contactName, sha256: sha(await readFile(path.join(folder, contactName))) };
    const doneScreenshotFile = 'm5-' + story.id + '-director-rendered.png';
    await page.screenshot({ path: path.join(folder, doneScreenshotFile), fullPage: true });
    const completedScreenshot = {
      file: doneScreenshotFile,
      sha256: sha(await readFile(path.join(folder, doneScreenshotFile))),
    };
    const receiptFile = await save('m5-' + story.id + '-receipt.json', JSON.stringify(receipt, null, 2) + '\n');
    manifest.programs.push({
      id: story.id,
      title: story.title,
      planSha256: plan.planSha256,
      receiptSha256: receipt.receiptSha256,
      projectId: receipt.projectId,
      revisionId: receipt.revisionId,
      artifactId: receipt.artifactId,
      revisionDigest: receipt.revisionDigest,
      video: {
        file: videoFile,
        sha256: receipt.artifactSha256,
        frames: totalFrames(revision.spec),
        width: 1920,
        height: 1080,
        fps: '24/1',
        audio: true,
      },
      graphScreenshot,
      completedScreenshot,
      contact,
      projectFile,
      planFile,
      receiptFile,
      audioSamples: pcm.length / 2,
      audioEnergy,
    });
    // Duplicated ambiguous POST must reuse the same SHA-bound result, not render again.
    const again = await fetch(server.url + '/api/director/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, approved: true }),
    });
    assert.equal(again.status, 201);
    assert.equal((await again.json() as DirectorReceipt).artifactId, receipt.artifactId);
    assert.equal((await app.store.list('projects')).length, manifest.programs.length);
    console.log('M5_REAL_FILM_PASS ' + JSON.stringify({
      id: story.id, videoFile, frames: totalFrames(revision.spec),
      sha256: receipt.artifactSha256, planSha256: plan.planSha256, audioEnergy,
    }));
  }
  // Failure demonstration: user-requested unsupported capability must be clearly rejected in UI.
  await page.goto(server.url + '/director', { waitUntil: 'networkidle0' });
  await fill('script', '[title=Unsupported; action=fly; seconds=6]\nFly over the scene.');
  await page.click('#director-plan');
  await page.waitForFunction(
    () => document.querySelector('#director-phase')?.textContent?.includes('Rejected'),
    { timeout: 20000 },
  );
  const failure = await page.$eval('#director-notice', (n) => n.textContent ?? '');
  assert.match(failure, /INVALID_PROJECT/);
  assert.equal(await page.$eval('#director-run', (el) => (el as HTMLButtonElement).disabled), true);
  const failedFile = 'm5-unsupported-skill-rejected.png';
  await page.screenshot({ path: path.join(folder, failedFile), fullPage: true });
  manifest.failureScreenshot = {
    file: failedFile, sha256: sha(await readFile(path.join(folder, failedFile))),
    code: 'INVALID_PROJECT',
  };
  const badRun = await fetch(server.url + '/api/director/run', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: planDirector(cases[0]), approved: false }),
  });
  assert.equal(badRun.status, 400);
  assert.equal((await badRun.json()).error.code, 'INVALID_REQUEST');
  assert.equal((await app.store.list('projects')).length, 2);
  assert.equal(pageErrors.length, 0, 'Chromium JavaScript errors: ' + pageErrors.join(', '));
  await writeFile(path.join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('M5_PRODUCT_PROOF_PASS ' + JSON.stringify({
    sourceCommit: head, programs: manifest.programs.map((x) => ({
      id: x.id, video: x.video, planSha256: x.planSha256, receiptSha256: x.receiptSha256,
    })), negativeUi: manifest.failureScreenshot,
  }));
} finally {
  await browser.close();
  await server.close();
  await app.close();
  await rm(tmp, { recursive: true, force: true });
}
