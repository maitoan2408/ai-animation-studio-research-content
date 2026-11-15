#!/usr/bin/env node
/**
 * M0 media gate. Verifies freshly rendered baseline files, decodes full media,
 * creates contact sheets from the actual MP4s, and writes a SHA-bound manifest.
 * This is technical evidence, NOT artistic approval.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const sourceDir = path.join(root, 'artifacts');
const outDir = path.join(sourceDir, 'product-first', 'm0');
const videos = [
  { name: 'morning-final.mp4', frames: 312, width: 1920, height: 1080 },
  { name: 'smoke-preview.mp4', frames: 96, width: 640, height: 360 },
];

function command(exe, args) {
  const result = spawnSync(exe, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(exe + ' failed (exit ' + result.status + '): ' + (result.stderr || result.error || '').toString().slice(-4000));
  }
  return result.stdout;
}
async function digest(file) {
  const bytes = await readFile(file);
  if (!bytes.length) throw new Error('Empty evidence: ' + file);
  return { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
}
function probe(file) {
  const info = JSON.parse(command('ffprobe', [
    '-v', 'error', '-count_frames', '-show_entries',
    'stream=codec_type,avg_frame_rate,nb_read_frames,width,height:format=duration',
    '-of', 'json', file,
  ]));
  const video = info.streams?.find((s) => s.codec_type === 'video');
  const audio = info.streams?.find((s) => s.codec_type === 'audio');
  if (!video) throw new Error('Missing video stream: ' + file);
  return {
    frames: Number(video.nb_read_frames), fps: video.avg_frame_rate,
    width: video.width, height: video.height, hasAudio: !!audio,
    durationSeconds: Number(info.format?.duration),
  };
}
function assertVideo(label, actual, expected) {
  if (actual.frames !== expected.frames || actual.width !== expected.width ||
      actual.height !== expected.height || actual.fps !== '24/1' ||
      !actual.hasAudio || Math.abs(actual.durationSeconds - expected.frames / 24) > 0.08) {
    throw new Error(label + ' fails review evidence gate: ' + JSON.stringify({ actual, expected }));
  }
}
await mkdir(outDir, { recursive: true });
const manifest = {
  schemaVersion: 1,
  milestone: 'M0',
  status: 'TECHNICAL_EVIDENCE_ONLY_NOT_ART_APPROVAL',
  repository: 'maitoan2408/ai-animation-studio-research-content',
  sourceCommit: process.env.GITHUB_SHA || 'LOCAL_UNPINNED',
  verification: 'ffprobe-count-frames + full-ffmpeg-decode + PNG contact sheet + SHA256',
  media: [],
  screenshots: [],
};
for (const expected of videos) {
  const file = path.join(sourceDir, expected.name);
  const metadata = probe(file);
  assertVideo(expected.name, metadata, expected);
  command('ffmpeg', ['-v', 'error', '-xerror', '-nostdin', '-i', file, '-f', 'null', '-']);
  const samples = [0, Math.floor((expected.frames - 1) / 3),
    Math.floor(2 * (expected.frames - 1) / 3), expected.frames - 1];
  const selection = samples.map((n) => 'eq(n\\,' + n + ')').join('+');
  const contactName = expected.name.replace('.mp4', '-contact.png');
  const contactFile = path.join(outDir, contactName);
  command('ffmpeg', [
    '-v', 'error', '-xerror', '-y', '-i', file, '-an',
    '-vf', 'select=' + selection + ',scale=480:270,tile=4x1',
    '-frames:v', '1', contactFile,
  ]);
  const contact = await digest(contactFile);
  manifest.media.push({
    file: 'artifacts/' + expected.name,
    ...metadata, ...(await digest(file)),
    contactSheet: { file: 'artifacts/product-first/m0/' + contactName, ...contact },
    sampledFrames: samples,
  });
}
for (const name of ['ui-desktop.png', 'ui-mobile.png']) {
  const file = path.join(sourceDir, name);
  const head = (await readFile(file)).subarray(0, 8);
  if (!head.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    throw new Error('Missing/invalid PNG UI evidence: ' + name);
  manifest.screenshots.push({ file: 'artifacts/' + name, ...(await digest(file)) });
}
await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('M0_MEDIA_GATE_PASS ' + JSON.stringify({
  commit: manifest.sourceCommit, videoCount: manifest.media.length,
  screenshots: manifest.screenshots.length,
  contacts: manifest.media.map((m) => m.contactSheet.file),
}));
