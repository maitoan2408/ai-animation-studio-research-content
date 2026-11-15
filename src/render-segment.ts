/** M2 isolated per-shot native renderer.
 * Captures exactly one frame at a time through Chromium and feeds FFmpeg pipe.
 * Unlike HyperFrames long native capture, this never accumulates 1080p frames
 * or retains earlier browser sessions. The parent owns state and publishing.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { Store } from './store.js';
import { parseSpec, profileSchema, profiles } from './domain.js';
import { compile, qcVideo } from './render.js';
import { doctor } from './process.js';

const [root, specFile, profileArg, dir] = process.argv.slice(2);
if (!root || !specFile || !profileArg || !dir) throw Error('SEGMENT_WORKER_ARGS');
const profile = profileSchema.parse(profileArg);
const store = new Store(root);
await store.init();
const spec = parseSpec(JSON.parse(await readFile(specFile, 'utf8')));
if (spec.scenes.length !== 1 || spec.scenes[0]!.durationFrames > 360)
  throw Error('SEGMENT_WORKER_UNSUPPORTED_SHOT');
const frames = spec.scenes[0]!.durationFrames;
const { width, height } = profiles[profile];
await mkdir(dir, { recursive: true });
const composition = path.join(dir, 'composition');
await compile(store, spec, profile, composition);
const server = createServer(async (req, res) => {
  const name = req.url === '/' ? 'index.html' : req.url?.slice(1);
  if (!name || !['index.html', 'gsap.min.js', 'audio.wav'].includes(name)) {
    res.writeHead(404).end();
    return;
  }
  try {
    res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' :
      name.endsWith('.wav') ? 'audio/wav' : 'text/html');
    res.end(await readFile(path.join(composition, name)));
  } catch (error) {
    res.writeHead(500).end(String(error));
  }
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw Error('SEGMENT_SERVER_PORT');
const runtime = await doctor();
const browser = await puppeteer.launch({
  executablePath: runtime.browser,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
});
const silent = path.join(dir, 'silent.mp4');
const delivery = path.join(dir, 'output.mp4');
let encoder: ReturnType<typeof spawn> | undefined;
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://127.0.0.1:' + address.port, { waitUntil: 'load' });
  await page.waitForFunction(
    () => !!(window as unknown as { __timelines?: { shot?: unknown } }).__timelines?.shot,
    { timeout: 30000 },
  );
  await page.evaluate(async () => { await document.fonts.ready; });
  encoder = spawn('ffmpeg', [
    '-v', 'error', '-xerror', '-nostdin', '-y',
    '-f', 'image2pipe', '-framerate', '24', '-c:v', 'png',
    '-i', 'pipe:0', '-an',
    '-c:v', 'libx264', '-threads', '2', '-preset', 'fast',
    '-crf', '18', '-pix_fmt', 'yuv420p',
    '-r', '24', '-fps_mode', 'cfr',
    '-movflags', '+faststart', silent,
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  let diagnostic = '';
  encoder.stderr!.on('data', (bytes:Buffer) => { diagnostic += bytes.toString().slice(-3000); });
  let pipeError: Error | undefined;
  encoder.stdin!.on('error', (error: Error) => { pipeError = error; });
  const finished = once(encoder, 'close');
  for (let frame = 0; frame < frames; frame++) {
    await page.evaluate((index) => {
      const timeline = (window as unknown as {
        __timelines: { shot: { seek: (time: number, suppressEvents: boolean) => void } };
      }).__timelines.shot;
      timeline.seek(index / 24, false);
    }, frame);
    const png = await page.screenshot({ type: 'png', captureBeyondViewport: false });
    if (pipeError) throw pipeError;
    if (!encoder.stdin!.write(png)) {
      await Promise.race([
        once(encoder.stdin!, 'drain'),
        finished.then(() => { throw Error('SEGMENT_ENCODER_EARLY_EXIT ' + diagnostic); }),
      ]);
    }
    if (frame % 48 === 0) console.log('SEGMENT_FRAME ' + frame + '/' + frames);
  }
  if (errors.length) throw Error('SEGMENT_BROWSER_ERROR ' + errors.join(';'));
  encoder.stdin!.end();
  const [exitCode] = await finished;
  if (exitCode !== 0) throw Error('SEGMENT_ENCODER_FAILED ' + diagnostic);
} finally {
  if (encoder && encoder.exitCode === null) encoder.kill('SIGTERM');
  await browser.close();
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
const inputAudio = path.join(composition, 'audio.wav');
const ffmpeg = async (args: string[]) => {
  const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  child.stderr!.on('data', (buf: Buffer) => { logs += buf.toString().slice(-2000); });
  const [exitCode] = await once(child, 'close');
  if (exitCode !== 0) throw Error('SEGMENT_MUX_ERROR ' + logs);
};
if (spec.scenes[0]!.audio) {
  await ffmpeg([
    '-v', 'error', '-xerror', '-nostdin', '-y',
    '-i', silent, '-i', inputAudio, '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'copy', '-c:a', 'aac', '-ar', '48000', '-ac', '2',
    '-t', String(frames / 24), '-movflags', '+faststart', delivery,
  ]);
} else {
  await writeFile(delivery, await readFile(silent));
}
const qc = await qcVideo(delivery, spec, profile);
if (qc.frames !== frames) throw Error('SEGMENT_FRAME_COUNT');
await writeFile(path.join(dir, 'segment-qc.json'), JSON.stringify(qc, null, 2) + '\n');
console.log('SEGMENT_DONE ' + JSON.stringify({ frames: qc.frames, profile }));
