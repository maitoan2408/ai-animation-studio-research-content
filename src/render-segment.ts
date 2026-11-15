/** M2 isolated native SVG vector rasterization.
 * Deterministic per-frame paper-cut SVG from the same pure frame evaluator
 * used by the Studio preview, rendered directly to native 1080p pixels by
 * librsvg. No multi-GB Chromium/HyperFrames memory accumulation; FFmpeg
 * consumes one PNG frame at a time through a backpressure-aware pipe.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { Store } from './store.js';
import { parseSpec, profileSchema, profiles, totalFrames } from './domain.js';
import { qcVideo } from './render.js';
import { mixAudio } from './audio.js';
import { frameSvg } from './rig.js';

const [root, specFile, profileArg, dir] = process.argv.slice(2);
if (!root || !specFile || !profileArg || !dir) throw Error('SEGMENT_WORKER_ARGS');
const profile = profileSchema.parse(profileArg);
const store = new Store(root);
await store.init();
const spec = parseSpec(JSON.parse(await readFile(specFile, 'utf8')));
if (spec.scenes.length !== 1 || spec.scenes[0]!.durationFrames > 360)
  throw Error('SEGMENT_WORKER_UNSUPPORTED_SHOT');
const frames = totalFrames(spec);
const { width, height } = profiles[profile];
await mkdir(dir, { recursive: true });
const mixed = await mixAudio(store, spec);
const silent = path.join(dir, 'silent.mp4');
const delivery = path.join(dir, 'output.mp4');
const encoder = spawn(
  'ffmpeg',
  [
    '-v',
    'error',
    '-xerror',
    '-nostdin',
    '-y',
    '-f',
    'image2pipe',
    '-framerate',
    '24',
    '-c:v',
    'png',
    '-i',
    'pipe:0',
    '-an',
    '-c:v',
    'libx264',
    '-threads',
    '2',
    '-preset',
    'fast',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p',
    '-r',
    '24',
    '-fps_mode',
    'cfr',
    '-movflags',
    '+faststart',
    silent,
  ],
  { stdio: ['pipe', 'ignore', 'pipe'] },
);
let diagnostic = '';
encoder.stderr!.on('data', (bytes: Buffer) => {
  diagnostic += bytes.toString().slice(-2000);
});
let pipeError: Error | undefined;
encoder.stdin!.on('error', (error: Error) => {
  pipeError = error;
});
const finished = once(encoder, 'close');
try {
  for (let frame = 0; frame < frames; frame++) {
    const svg = frameSvg(spec, frame, mixed.envelopes);
    // Every frame is vector-rasterized at the *requested final dimensions*.
    // We never upscale a 640x360 screenshot. The standalone rasterizer exits
    // per frame, reclaiming every native image buffer deterministically.
    const png = spawnSync(
      'rsvg-convert',
      ['--format', 'png', '--width', String(width), '--height', String(height)],
      {
        input: Buffer.from(svg),
        encoding: 'buffer',
        maxBuffer: 32 * 1024 * 1024,
      },
    );
    if (png.status !== 0 || !png.stdout?.length)
      throw Error(
        'SEGMENT_VECTOR_RASTER_ERROR ' + frame + ' ' + String(png.stderr || png.error).slice(-1200),
      );
    if (pipeError) throw pipeError;
    if (!encoder.stdin!.write(png.stdout)) {
      await Promise.race([
        once(encoder.stdin!, 'drain'),
        finished.then(() => {
          throw Error('SEGMENT_ENCODER_EARLY_EXIT ' + diagnostic);
        }),
      ]);
    }
    if (frame % 24 === 0) console.log('SEGMENT_FRAME ' + frame + '/' + frames);
  }
  encoder.stdin!.end();
  const [exitCode] = await finished;
  if (exitCode !== 0) throw Error('SEGMENT_ENCODER_FAILED ' + diagnostic);
} finally {
  if (encoder.exitCode === null) encoder.kill('SIGTERM');
}
if (mixed.audio) {
  const wav = path.join(dir, 'voice.wav');
  await writeFile(wav, mixed.audio);
  const mux = spawnSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-xerror',
      '-nostdin',
      '-y',
      '-i',
      silent,
      '-i',
      wav,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-ar',
      '48000',
      '-ac',
      '2',
      '-t',
      String(frames / 24),
      '-movflags',
      '+faststart',
      delivery,
    ],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
  );
  if (mux.status !== 0) throw Error('SEGMENT_MUX_ERROR ' + mux.stderr);
} else {
  await writeFile(delivery, await readFile(silent));
}
const qc = await qcVideo(delivery, spec, profile);
if (qc.frames !== frames) throw Error('SEGMENT_FRAME_COUNT');
await writeFile(path.join(dir, 'segment-qc.json'), JSON.stringify(qc, null, 2) + '\n');
console.log(
  'SEGMENT_DONE ' + JSON.stringify({ frames: qc.frames, profile, renderer: 'native-vector-rsvg' }),
);
