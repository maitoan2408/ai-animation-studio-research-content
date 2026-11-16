/** Independent post-result audit: re-open the actual two films, saved plan,
 * editable source, receipts and screenshots. Never trust producer PASS alone.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { canonical, hash, parseSpec, totalFrames } from '../src/domain.js';
import { validateDirectorPlan, type DirectorPlan, type DirectorReceipt } from '../src/director.js';

const root = path.resolve(process.env.M5_OUTPUT_DIR ?? 'artifacts/product-first/m5');
const digest = (x: Buffer | string) => createHash('sha256').update(x).digest('hex');
const run = (program: string, args: string[], bytes = 12 * 1024 * 1024) => {
  const process = spawnSync(program, args, { maxBuffer: bytes });
  assert.equal(process.status, 0, program + ' failed: ' + String(process.stderr || process.error));
  return process.stdout;
};
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8')) as {
  milestone: string;
  sourceCommit: string;
  programs: Array<{
    id: string;
    title: string;
    planSha256: string;
    receiptSha256: string;
    revisionDigest: string;
    video: {
      file: string;
      sha256: string;
      frames: number;
      width: number;
      height: number;
      fps: string;
      audio: boolean;
    };
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
};
assert.equal(manifest.milestone, 'M5');
assert.equal(manifest.programs.length, 2);
assert.notEqual(manifest.programs[0]!.planSha256, manifest.programs[1]!.planSha256);
const sourceHashes = new Set<string>();
const report = {
  milestone: 'M5',
  status: 'TECHNICAL_PASS_PENDING_OWNER_REVIEW',
  reviewer: 'delegated-agent independent post-result audit, NOT human art approval',
  sourceCommit: manifest.sourceCommit,
  programs: [] as Array<{
    id: string;
    artifactSha256: string;
    planSha256: string;
    frames: number;
    fps: string;
    width: number;
    height: number;
    audioSampleRate: number;
    audioRms: number;
    noAutoReview: boolean;
    compiledActions: string[];
  }>,
  negativeUi: false,
  hashesChecked: 0,
  fullVideoDecodes: 0,
};
async function verifyFile(file: string, want: string): Promise<Buffer> {
  const bytes = await readFile(path.join(root, file));
  assert.equal(digest(bytes), want, 'Independent SHA mismatch: ' + file);
  report.hashesChecked++;
  return bytes;
}
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
for (const film of manifest.programs) {
  const plan = JSON.parse(
    (await verifyFile(film.planFile.file, film.planFile.sha256)).toString(),
  ) as DirectorPlan;
  const compiled = validateDirectorPlan(plan);
  assert.equal(compiled.planSha256, film.planSha256);
  assert.ok(
    compiled.graph.every((n) =>
      ['script-to-scenes', 'prepare-audio', 'render-review', 'verify-artifact'].includes(n.skill),
    ),
  );
  const packaged = JSON.parse(
    (await verifyFile(film.projectFile.file, film.projectFile.sha256)).toString(),
  ) as {
    format: string;
    version: number;
    spec: unknown;
    assets: Array<{ id: string; base64: string }>;
  };
  assert.equal(packaged.format, 'paper-studio-project');
  assert.equal(packaged.version, 1);
  const spec = parseSpec(packaged.spec);
  assert.equal(spec.title, film.title);
  assert.equal(hash(canonical(spec)), film.revisionDigest);
  assert.deepEqual(
    spec.scenes.map((s) => s.action),
    plan.spec.scenes.map((s) => s.action),
  );
  assert.ok(
    spec.scenes.every((s) => s.audio),
    'voice not actually bound to every scene',
  );
  for (const asset of packaged.assets) {
    const data = Buffer.from(asset.base64, 'base64');
    assert.equal(digest(data), asset.id, 'portable source audio hash mismatch');
  }
  const receipt = JSON.parse(
    (await verifyFile(film.receiptFile.file, film.receiptFile.sha256)).toString(),
  ) as DirectorReceipt;
  const { receiptSha256, ...payload } = receipt;
  assert.equal(hash(canonical(payload)), receiptSha256);
  assert.equal(receiptSha256, film.receiptSha256);
  assert.equal(receipt.planSha256, film.planSha256);
  assert.equal(receipt.revisionDigest, film.revisionDigest);
  assert.equal(receipt.status, 'succeeded');
  assert.equal(receipt.autoApproved, false);
  assert.deepEqual(
    receipt.tasks.map((x) => x.id),
    ['scenes', 'voice', 'render', 'verify'],
  );
  assert.equal(receipt.source, 'root-studio-v1');
  assert.equal(receipt.qc.frames, totalFrames(spec));
  for (const picture of [film.graphScreenshot, film.completedScreenshot, film.contact]) {
    const bytes = await verifyFile(picture.file, picture.sha256);
    assert.ok(bytes.length > 6000, picture.file + ' screenshot unexpectedly tiny');
    assert.deepEqual(bytes.subarray(0, 8), pngSignature);
  }
  const video = await verifyFile(film.video.file, film.video.sha256);
  assert.ok(video.length > 10000);
  assert.equal(receipt.artifactSha256, film.video.sha256);
  assert.ok(!sourceHashes.has(film.video.sha256), 'two videos are duplicates');
  sourceHashes.add(film.video.sha256);
  const filename = path.join(root, film.video.file);
  const data = JSON.parse(
    run('ffprobe', [
      '-v',
      'error',
      '-count_frames',
      '-show_streams',
      '-of',
      'json',
      filename,
    ]).toString(),
  ) as {
    streams: Array<{
      codec_type: string;
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      nb_read_frames?: string;
      sample_rate?: string;
    }>;
  };
  const visual = data.streams.find((s) => s.codec_type === 'video');
  const voice = data.streams.find((s) => s.codec_type === 'audio');
  assert.equal(visual?.width, film.video.width);
  assert.equal(visual?.height, film.video.height);
  assert.equal(visual?.nb_read_frames, String(film.video.frames));
  assert.equal(visual?.avg_frame_rate, '24/1');
  assert.equal(voice?.sample_rate, '48000');
  assert.equal(film.video.frames, totalFrames(spec));
  run('ffmpeg', [
    '-v',
    'error',
    '-xerror',
    '-nostdin',
    '-threads',
    '1',
    '-i',
    filename,
    '-f',
    'null',
    '-',
  ]);
  report.fullVideoDecodes++;
  const pcm = run(
    'ffmpeg',
    [
      '-v',
      'error',
      '-nostdin',
      '-threads',
      '1',
      '-i',
      filename,
      '-vn',
      '-ac',
      '1',
      '-ar',
      '8000',
      '-f',
      's16le',
      '-',
    ],
    8 * 1024 * 1024,
  );
  let energy = 0;
  for (let i = 0; i + 1 < pcm.length; i += 2) {
    const n = pcm.readInt16LE(i);
    energy += n * n;
  }
  assert.equal(pcm.length / 2, film.audioSamples);
  const rms = Math.sqrt(energy / Math.max(1, pcm.length / 2));
  assert.ok(rms > 1, 'film audio is silent');
  assert.ok(Math.abs(rms - film.audioEnergy) < 1e-6, 'independent sound energy mismatch');
  report.programs.push({
    id: film.id,
    artifactSha256: film.video.sha256,
    planSha256: film.planSha256,
    frames: film.video.frames,
    fps: film.video.fps,
    width: film.video.width,
    height: film.video.height,
    audioSampleRate: 48000,
    audioRms: rms,
    noAutoReview: true,
    compiledActions: spec.scenes.map((s) => s.action),
  });
}
assert.ok(manifest.failureScreenshot);
assert.equal(manifest.failureScreenshot.code, 'INVALID_PROJECT');
const proof = await verifyFile(manifest.failureScreenshot.file, manifest.failureScreenshot.sha256);
assert.deepEqual(proof.subarray(0, 8), pngSignature);
report.negativeUi = true;
await writeFile(
  path.join(root, 'm5-independent-post-result-audit.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log('M5_INDEPENDENT_POST_RESULT_PASS ' + JSON.stringify(report));
