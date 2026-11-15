/** M2 actual studio v0.2 product gate.
 * Creates a NEW 3-shot editable story through real HTTP/UI, revises storyboard,
 * regenerates voice, checks persistence/export/import, renders 1080p MP4 with
 * scene/audio QC, captures screenshots and binds output to source/head SHA.
 * No artificial scene-specific renderer, fake review, or synthesized screenshots.
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
import { pcmFromWav } from '../src/audio.js';
import {
  hash,
  totalFrames,
  StudioError,
  type Artifact,
  type Project,
  type Revision,
} from '../src/domain.js';
import { planScript } from '../src/planner.js';
import { frameSvg } from '../src/rig.js';
import { checkM2Media } from './m2-media-parity.js';

const root = await mkdtemp(path.join(os.tmpdir(), 'studio-m2-product-'));
const evidence = path.resolve('artifacts/product-first/m2');
await mkdir(evidence, { recursive: true });
const source = 'examples/m2-new-story.txt';
const input = await readFile(source, 'utf8');
const check = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const run = (cmd: string, args: string[]) => {
  const p = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 24 * 1024 * 1024 });
  if (p.status !== 0 || p.error)
    throw Error(cmd + ' FAILED (' + p.status + ') ' + String(p.stderr || p.error).slice(-3500));
  return p.stdout;
};
const artifacts: Record<string, string> = {};
async function witness(name: string, file: string) {
  const bytes = await readFile(file);
  assert.ok(bytes.length > 100, 'empty evidence: ' + name);
  artifacts[name] = check(bytes);
  return bytes;
}
const planned = planScript(input, 'Ngày mới trên giấy', 'paper-cut', 'vi');
assert.equal(planned.spec.scenes.length, 3);
assert.deepEqual(
  planned.spec.scenes.map((s) => s.action),
  ['wave', 'walk', 'pick-up'],
);
assert.deepEqual(
  planned.spec.scenes.map((s) => s.camera),
  ['static', 'pan', 'static'],
);
assert.equal(totalFrames(planned.spec), 576);
assert.throws(
  () => planScript('[action=fly; seconds=8]\nUnsupported.', 'Bad'),
  (e: unknown) => e instanceof StudioError && e.code === 'INVALID_PROJECT',
);
assert.throws(
  () => planScript('[action=wave; seconds=0]\nBad duration.', 'Bad'),
  (e: unknown) => e instanceof StudioError && e.code === 'INVALID_PROJECT',
);

let app: Studio | undefined, server: Awaited<ReturnType<typeof serve>> | undefined;
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
let projectId = '',
  finalRevisionId = '',
  renderedArtifactId = '';
let finalSpec: Revision['spec'] | undefined;
const checks: string[] = [];
try {
  const runtime = await doctor();
  app = await Studio.open(path.join(root, 'studio'));
  server = await serve(app, 0);
  browser = await puppeteer.launch({
    executablePath: runtime.browser,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1050, deviceScaleFactor: 1 });
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  await page.goto(server.url, { waitUntil: 'networkidle0' });
  const fill = async (selector: string, value: string) => {
    await page.$eval(
      selector,
      (el, v) => {
        (el as HTMLInputElement).value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      },
      value,
    );
  };
  const screenshotStage = async (name: string, expectedRevision: string) => {
    await page.waitForFunction(
      (revision) =>
        (document.querySelector('#story-preview') as HTMLImageElement)?.src.includes(revision) &&
        (document.querySelector('#story-preview') as HTMLImageElement)?.naturalWidth > 0,
      {},
      expectedRevision,
    );
    const element = await page.$('#story-preview');
    assert.ok(element);
    const file = path.join(evidence, name);
    await element.screenshot({ path: file });
    await witness(name, file);
  };
  await fill('#create-form [name="title"]', 'Ngày mới trên giấy');
  await fill('#create-form [name="script"]', input);
  await page.select('#create-form [name="language"]', 'vi');
  await page.select('#create-form [name="style"]', 'paper-cut');
  await page.click('#create-form button[type=submit]');
  await page.waitForSelector('#workspace:not([hidden])', { timeout: 15000 });
  assert.equal(await page.$$eval('[data-scene]', (items) => items.length), 3);
  const projects = await app.store.list<Project>('projects');
  assert.equal(projects.length, 1);
  projectId = projects[0]!.id;
  const first = await app.store.current(projectId);
  assert.deepEqual(
    first.revision.spec,
    planned.spec,
    'GUI script compilation differs from documented planner',
  );
  const originalSpec = first.revision.spec;
  // Scene two starts at precisely frame 192. Capture true BEFORE editor revision.
  await page.$eval('#scrubber', (node) => {
    (node as HTMLInputElement).value = '192';
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await screenshotStage('storyboard-before.png', first.revision.id);
  checks.push('Browser created a new original three-shot storyboard from external script.');
  // Actual editable UI changes, no source-code or per-shot hardcoding.
  await fill('[data-scene="s002"] [name="title"]', 'Qua khu vườn nhỏ');
  await fill('[data-scene="s002"] [name="color"]', '#bb6848');
  await page.click('#save-scenes');
  await page.waitForFunction(
    () => document.querySelector('#revision-badge')?.textContent?.includes('Phiên bản 2'),
    { timeout: 30000 },
  );
  const edited = await app.store.current(projectId);
  assert.equal(edited.project.revisionIds.length, 2);
  assert.equal(edited.revision.spec.scenes[1]?.title, 'Qua khu vườn nhỏ');
  assert.equal(edited.revision.spec.scenes[1]?.color, '#bb6848');
  assert.equal(
    first.revision.spec.scenes[1]?.color,
    '#527e88',
    'original immutable revision changed',
  );
  assert.notEqual(
    frameSvg(originalSpec, 192),
    frameSvg(edited.revision.spec, 192),
    'revision must actually change drawn pixels',
  );
  await page.$eval('#scrubber', (node) => {
    (node as HTMLInputElement).value = '192';
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await screenshotStage('storyboard-after.png', edited.revision.id);
  assert.notEqual(artifacts['storyboard-before.png'], artifacts['storyboard-after.png']);
  await page.screenshot({
    path: path.join(evidence, 'studio-storyboard-desktop.png'),
    fullPage: true,
  });
  await witness(
    'studio-storyboard-desktop.png',
    path.join(evidence, 'studio-storyboard-desktop.png'),
  );
  checks.push(
    'UI created immutable edited revision with visible changed scene and two actual BEFORE/AFTER screenshots.',
  );
  // Real server operation invoked by UI: offline voice, bound to each narration.
  await page.click('#generate-voice');
  await page.waitForFunction(
    () => document.querySelector('#revision-badge')?.textContent?.includes('Phiên bản 3'),
    { timeout: 120000 },
  );
  const voiced = await app.store.current(projectId);
  finalSpec = voiced.revision.spec;
  finalRevisionId = voiced.revision.id;
  const frames = totalFrames(finalSpec);
  assert.ok(frames >= 480 && frames <= 720, 'voice enlarged film outside 20–30s: ' + frames);
  assert.equal(finalSpec.scenes.length, 3);
  for (const scene of finalSpec.scenes) {
    assert.ok(scene.audio, 'scene missing voice: ' + scene.id);
    const asset = await app.store.verifyAsset(scene.audio.assetId);
    const pcm = pcmFromWav(await readFile(app.store.assetFile(asset.id)));
    const max = Math.max(
      0,
      ...Array.from({ length: Math.ceil(pcm.length / 4800) }, (_, i) => {
        let energy = 0;
        for (let k = i * 4800; k < Math.min(pcm.length, (i + 1) * 4800); k += 2) {
          const n = pcm.readInt16LE(k);
          energy += n * n;
        }
        return energy;
      }),
    );
    assert.ok(max > 100000, 'voice is silent for ' + scene.id);
    assert.equal(scene.audio.textHash, hash(scene.narration));
    assert.ok(asset.duration <= scene.durationFrames / 24);
  }
  checks.push(
    'All three original Vietnamese narration texts produced non-silent, SHA-bound offline WAV audio.',
  );
  // Save portable file, then import to demonstrate immutable project reuse.
  const portable = await app.export(projectId);
  const portableFile = path.join(evidence, 'm2-edited-project.studio.json');
  await writeFile(portableFile, JSON.stringify(portable, null, 2) + '\n');
  await witness('m2-edited-project.studio.json', portableFile);
  const imported = await app.import(portable);
  assert.deepEqual((await app.store.current(imported.id)).revision.spec, finalSpec);
  const snapshot = await app.snapshot(imported.id);
  assert.equal(snapshot.reviews.length, 0, 'review must not be inherited on import');
  checks.push(
    'Export/import round trip retains revised three-shot content and audio hashes, without fabricated approval.',
  );
  // Final render is triggered using UI and processed by real worker and native producer.
  await page.select('#profile', 'final');
  await page.click('#render');
  await page.waitForFunction(
    () => document.querySelector('#notice')?.textContent?.includes('hàng đợi'),
    { timeout: 30000 },
  );
  const jobs = (await app.snapshot(projectId)).jobs;
  assert.equal(jobs.length, 1, 'render click must enqueue exactly one job');
  // The UI has already completed the real POST. Release its Chromium before
  // HyperFrames starts capturing hundreds of native-resolution frames; only
  // the producer browser should occupy GPU/texture memory during a long render.
  await browser.close();
  browser = undefined;
  const completed = await app.wait(jobs[0]!.id, 900000);
  assert.equal(completed.status, 'succeeded', JSON.stringify(completed.error));
  const art = await app.store.get<Artifact>('artifacts', completed.artifactId!);
  assert.equal(art.revisionId, finalRevisionId);
  assert.equal(art.profile, 'final');
  assert.equal(art.qc.frames, frames);
  assert.equal(art.qc.width, 1920);
  assert.equal(art.qc.height, 1080);
  assert.equal(art.qc.fps, '24/1');
  assert.ok(art.qc.hasAudio && art.qc.audioSampleRate === 48000);
  renderedArtifactId = art.id;
  const output = path.join(evidence, 'm2-edited-film-final-1080p.mp4');
  await copyFile(app.store.artifactFile(art.id), output);
  // witness returns bytes for image-signature checks. Compare digest to digest:
  // asserting a string against a whole MP4 makes Node build a multi-GB diff.
  await witness('m2-edited-film-final-1080p.mp4', output);
  assert.equal(art.sha256, artifacts['m2-edited-film-final-1080p.mp4']);
  const probed = JSON.parse(
    run('ffprobe', [
      '-v',
      'error',
      '-threads',
      '1',
      '-count_frames',
      '-show_streams',
      '-show_format',
      '-of',
      'json',
      output,
    ]),
  );
  const video = probed.streams.find((s: { codec_type: string }) => s.codec_type === 'video');
  const audio = probed.streams.find((s: { codec_type: string }) => s.codec_type === 'audio');
  assert.equal(video?.nb_read_frames, String(frames));
  assert.equal(video?.avg_frame_rate, '24/1');
  assert.equal(video?.width, 1920);
  assert.equal(video?.height, 1080);
  assert.equal(audio?.sample_rate, '48000');
  // Verify decoded sound energy rather than trusting the presence of an audio track.
  // Decode the entire mono PCM stream and check each shot independently.
  const sample = spawnSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-nostdin',
      '-threads',
      '1',
      '-filter_threads',
      '1',
      '-i',
      output,
      '-vn',
      '-ar',
      '8000',
      '-ac',
      '1',
      '-f',
      's16le',
      '-',
    ],
    { maxBuffer: 4 * 1024 * 1024 },
  );
  assert.equal(sample.status, 0, String(sample.stderr));
  const pcm = sample.stdout;
  let energy = 0;
  for (let i = 0; i < pcm.length; i += 2) {
    const n = pcm.readInt16LE(i);
    energy += n * n;
  }
  const rms = Math.sqrt(energy / (pcm.length / 2));
  assert.ok(rms > 50, 'final encoded film appears silent: ' + rms);
  let audioSampleOffset = 0;
  const voiceRmsByScene: Record<string, number> = {};
  for (const scene of finalSpec.scenes) {
    const sceneSampleCount = Math.round((scene.durationFrames / 24) * 8000);
    let sceneEnergy = 0;
    for (
      let i = audioSampleOffset;
      i < Math.min(pcm.length / 2, audioSampleOffset + sceneSampleCount);
      i++
    ) {
      const sampleValue = pcm.readInt16LE(i * 2);
      sceneEnergy += sampleValue * sampleValue;
    }
    const sceneRms = Math.sqrt(sceneEnergy / sceneSampleCount);
    assert.ok(sceneRms > 50, scene.id + ' was silent or shifted after concatenation: ' + sceneRms);
    voiceRmsByScene[scene.id] = sceneRms;
    audioSampleOffset += sceneSampleCount;
  }
  checks.push(
    'Final native 1920×1080, ' +
      frames +
      ' frames, 24fps encoded MP4 fully decodes with audible 48kHz audio.',
  );
  const sel = [0, Math.floor(frames / 3), Math.floor((2 * frames) / 3), frames - 1];
  for (const [k, f] of sel.entries()) {
    const still = path.join(evidence, 'film-shot-' + (k + 1) + '.png');
    run('ffmpeg', [
      '-v',
      'error',
      '-xerror',
      '-y',
      '-threads',
      '1',
      '-filter_threads',
      '1',
      '-i',
      output,
      '-vf',
      'select=eq(n\\,' + f + ')',
      '-frames:v',
      '1',
      still,
    ]);
    const bytes = await witness('film-shot-' + (k + 1) + '.png', still);
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
  const sheet = path.join(evidence, 'm2-contact-sheet.png');
  run('ffmpeg', [
    '-v',
    'error',
    '-xerror',
    '-y',
    '-threads',
    '1',
    '-filter_threads',
    '1',
    '-i',
    output,
    '-vf',
    'select=eq(n\\,' + sel.join(')+eq(n\\,') + '),scale=640:360,tile=2x2',
    '-frames:v',
    '1',
    sheet,
  ]);
  await witness('m2-contact-sheet.png', sheet);
  browser = await puppeteer.launch({
    executablePath: runtime.browser,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
  });
  const parity = await checkM2Media(
    browser,
    app.store,
    finalSpec,
    server.url + '/api/projects/' + projectId + '/preview?revision=' + finalRevisionId,
    output,
    evidence,
  );
  for (const picture of parity.pictures)
    await witness(
      'preview-native-' + picture.frame + '.png',
      path.join(evidence, 'preview-native-' + picture.frame + '.png'),
    );
  await witness('preview-final-parity.json', path.join(evidence, 'preview-final-parity.json'));
  checks.push(
    'Actual served native preview matches decoded final frames at all cuts and speaking peaks; encoded voice matches original PCM at zero lag in each shot.',
  );
  const pageAgain = await browser.newPage();
  pageAgain.on('pageerror', (error) => pageErrors.push(String(error)));
  await pageAgain.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 1 });
  await pageAgain.goto(server.url, { waitUntil: 'domcontentloaded' });
  await pageAgain.waitForSelector('[data-project]', { timeout: 20000 });
  await pageAgain.click('[data-project="' + projectId + '"]');
  await pageAgain.waitForSelector('#workspace:not([hidden])');
  await pageAgain.waitForFunction(
    (artifactId) => {
      const select = document.querySelector('#artifact-select') as HTMLSelectElement | null;
      const video = document.querySelector('#video') as HTMLVideoElement | null;
      return select?.value === artifactId && video && !video.hidden && video.readyState >= 2;
    },
    { timeout: 30000 },
    renderedArtifactId,
  );
  const browserMedia = await pageAgain.$eval('#video', (element) => {
    const video = element as HTMLVideoElement;
    return { width: video.videoWidth, height: video.videoHeight, duration: video.duration };
  });
  assert.deepEqual(browserMedia, { width: 1920, height: 1080, duration: frames / 24 });
  await pageAgain.$eval('#video', async (element) => {
    const video = element as HTMLVideoElement;
    video.muted = true; // Audio content is checked separately against original PCM.
    video.currentTime = 8.5;
    await video.play();
  });
  await pageAgain.waitForFunction(
    () => (document.querySelector('#video') as HTMLVideoElement).currentTime >= 9,
    { timeout: 15000 },
  );
  await pageAgain.$eval('#video', (element) => (element as HTMLVideoElement).pause());
  checks.push(
    'The exact published artifact loads, seeks and plays in the real Studio HTML video player at native 1080p.',
  );
  await pageAgain.screenshot({
    path: path.join(evidence, 'studio-rendered-film-desktop.png'),
    fullPage: true,
  });
  await witness(
    'studio-rendered-film-desktop.png',
    path.join(evidence, 'studio-rendered-film-desktop.png'),
  );
  await pageAgain.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  assert.equal(
    await pageAgain.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
    'mobile UI overflow',
  );
  await pageAgain.screenshot({
    path: path.join(evidence, 'studio-rendered-film-mobile.png'),
    fullPage: true,
  });
  await witness(
    'studio-rendered-film-mobile.png',
    path.join(evidence, 'studio-rendered-film-mobile.png'),
  );
  await pageAgain.close();
  assert.deepEqual(pageErrors, [], 'browser JS errors');
  checks.push(
    'Real browser Studio desktop/mobile screenshots show the new edited 3-shot project and exported QC artifact.',
  );
  // A real process restart is the final persistence test, not just app.import.
  await browser.close();
  browser = undefined;
  await server.close();
  server = undefined;
  await app.close();
  app = undefined;
  const expectedFile = path.join(root, 'reopen-expected.json');
  await writeFile(
    expectedFile,
    JSON.stringify({
      projectId,
      revisionId: finalRevisionId,
      artifactId: renderedArtifactId,
      sha256: art.sha256,
      spec: finalSpec,
    }),
  );
  const reopened = JSON.parse(
    run(process.execPath, [
      '--import',
      'tsx',
      'scripts/m2-reopen-proof.ts',
      path.join(root, 'studio'),
      expectedFile,
    ]),
  );
  assert.equal(reopened.status, 'PASS');
  assert.notEqual(reopened.processId, process.pid);
  await writeFile(
    path.join(evidence, 'reopen-proof.json'),
    JSON.stringify(reopened, null, 2) + '\n',
  );
  await witness('reopen-proof.json', path.join(evidence, 'reopen-proof.json'));
  checks.push(
    'A separate OS process reloaded exact edited+voiced project and hash-verified final 1080p artifact (automated test, not independent human handoff).',
  );
  const manifest = {
    milestone: 'M2',
    status: 'TECHNICAL_PASS_PENDING_OWNER_ART_REVIEW',
    sourceCommit:
      process.env.SOURCE_HEAD_SHA ||
      process.env.GITHUB_SHA ||
      run('git', ['rev-parse', 'HEAD']).trim(),
    checkoutCommit: process.env.GITHUB_SHA || run('git', ['rev-parse', 'HEAD']).trim(),
    trackedDiffSha256: hash(run('git', ['diff', 'HEAD', '--', 'src', 'scripts', 'web', 'tests'])),
    runtime,
    parity,
    originalScript: source,
    originalScriptSha256: hash(input),
    newProjectTitle: 'Ngày mới trên giấy',
    sourceRevisionCount: 3,
    editedSceneId: 's002',
    editedTitle: 'Qua khu vườn nhỏ',
    editedColor: '#bb6848',
    shots: finalSpec.scenes.map((s) => ({
      id: s.id,
      title: s.title,
      action: s.action,
      frames: s.durationFrames,
      voice: s.audio?.assetId,
    })),
    film: {
      file: 'artifacts/product-first/m2/m2-edited-film-final-1080p.mp4',
      sha256: art.sha256,
      frames,
      fps: 24,
      width: 1920,
      height: 1080,
      durationSeconds: frames / 24,
      audioSampleRate: 48000,
      decodedAudioRms: rms,
      voiceRmsByScene,
      bytes: art.bytes,
    },
    artifactHashes: artifacts,
    checks,
    limits: [
      'Bounded v0.2 procedural art and actions only; high-quality natural motion is M3/M6',
      'Local eSpeak Vietnamese voice is a timing draft, not premium natural narration',
      'Automated technical pass is not owner creative acceptance',
    ],
  };
  await writeFile(path.join(evidence, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(
    'M2_PRODUCT_FULL_GATE_PASS ' +
      JSON.stringify({
        commit: manifest.sourceCommit,
        frames,
        seconds: frames / 24,
        videoSha256: art.sha256,
        checks: checks.length,
        voiceRms: rms,
      }),
  );
} catch (error) {
  await writeFile(
    path.join(evidence, 'failure.json'),
    JSON.stringify({ source, errors: String(error), checks }, null, 2) + '\n',
  );
  throw error;
} finally {
  if (browser) await browser.close();
  if (server) await server.close();
  if (app) await app.close();
  if (process.env.KEEP_M2_TEST_DATA !== '1') await rm(root, { recursive: true, force: true });
}
