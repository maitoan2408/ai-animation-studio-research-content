import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  parseSpec,
  totalFrames,
  profiles,
  StudioError,
  type ProjectSpec,
  type Profile,
  type QC,
} from './domain.js';
import { Store } from './store.js';
import { mixAudio } from './audio.js';
import { frameSvg } from './rig.js';
import { run, doctor } from './process.js';

export type RenderProgress = (progress: number, stage: string) => Promise<void>;
export type RenderFunction = (
  store: Store,
  spec: ProjectSpec,
  profile: Profile,
  dir: string,
  signal: AbortSignal,
  progress: RenderProgress,
) => Promise<{ file: string; qc: QC }>;
const require = createRequire(import.meta.url);

export async function compile(
  store: Store,
  input: ProjectSpec,
  profile: Profile,
  dir: string,
): Promise<void> {
  const spec = parseSpec(input),
    frames = totalFrames(spec),
    duration = frames / 24,
    { width, height } = profiles[profile];
  const mix = await mixAudio(store, spec);
  await mkdir(dir, { recursive: true });
  await copyFile(require.resolve('gsap/dist/gsap.min.js'), path.join(dir, 'gsap.min.js'));
  if (mix.audio) await writeFile(path.join(dir, 'audio.wav'), mix.audio);
  // JSON values are inert; escape '<' to prevent user text closing a script tag.
  const data = JSON.stringify({ spec, envelopes: mix.envelopes }).replace(/</g, '\\u003c');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#f3e8ca}#scene{width:${width}px;height:${height}px;overflow:hidden}</style><script src="gsap.min.js"></script></head><body>
  <div id="shot" data-composition-id="shot" data-width="${width}" data-height="${height}" data-duration="${duration}" data-fps="24"><div id="visual" class="clip" data-start="0" data-duration="${duration}" data-track-index="0"><div id="scene"></div></div>${mix.audio ? `<audio id="voice" class="clip" src="audio.wav" data-start="0" data-duration="${duration}" data-track-index="1"></audio>` : ''}</div>
  <script>const input=${data};const frameSvg=${frameSvg.toString()};const clock={frame:0};const paint=()=>{document.getElementById('scene').innerHTML=frameSvg(input.spec,Math.round(clock.frame),input.envelopes);};paint();const timeline=gsap.timeline({paused:true});timeline.to(clock,{frame:${frames - 1},duration:${(frames - 1) / 24},ease:'none',onUpdate:paint},0);timeline.to({},{duration:1/24},${(frames - 1) / 24});window.__timelines={shot:timeline};</script></body></html>`;
  await writeFile(path.join(dir, 'index.html'), html);
}

export async function qcVideo(
  file: string,
  spec: ProjectSpec,
  profile: Profile,
  signal?: AbortSignal,
): Promise<QC> {
  const raw = await run(
    'ffprobe',
    ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file],
    signal,
  );
  const probe = JSON.parse(raw) as {
    streams: Array<Record<string, string | number>>;
    format: { duration: string };
  };
  const v = probe.streams.find((s) => s.codec_type === 'video'),
    a = probe.streams.find((s) => s.codec_type === 'audio');
  if (!v) throw new StudioError('QC_NO_VIDEO', 'Output không có video stream.');
  const qc: QC = {
    frames: Number(v.nb_read_frames),
    expectedFrames: totalFrames(spec),
    fps: String(v.avg_frame_rate),
    width: Number(v.width),
    height: Number(v.height),
    duration: Number(probe.format.duration),
    hasAudio: !!a,
    ...(a ? { audioDuration: Number(a.duration), audioSampleRate: Number(a.sample_rate) } : {}),
  };
  const expectedAudio = spec.scenes.some((s) => s.audio),
    dimensions = profiles[profile];
  if (
    qc.frames !== qc.expectedFrames ||
    qc.fps !== '24/1' ||
    qc.width !== dimensions.width ||
    qc.height !== dimensions.height ||
    Math.abs(qc.duration - qc.expectedFrames / 24) > 0.08 ||
    qc.hasAudio !== expectedAudio ||
    (a &&
      (qc.audioSampleRate !== 48000 || Math.abs(qc.audioDuration! - qc.expectedFrames / 24) > 0.08))
  )
    throw new StudioError('QC_FAILED', JSON.stringify(qc));
  // Decode every stream; metadata alone cannot detect a damaged payload.
  await run(
    'ffmpeg',
    ['-v', 'error', '-xerror', '-nostdin', '-i', file, '-f', 'null', '-'],
    signal,
  );
  return qc;
}

export const renderVideo: RenderFunction = async (store, spec, profile, dir, signal, progress) => {
  const runtime = await doctor();
  signal.throwIfAborted();
  process.env.HYPERFRAMES_BROWSER_PATH = runtime.browser;
  process.env.HYPERFRAMES_CACHE_DIR = path.join(store.root, 'cache');
  process.env.HYPERFRAMES_NO_TELEMETRY = '1';
  process.env.PRODUCER_BROWSER_GPU = 'false';
  await compile(store, spec, profile, path.join(dir, 'composition'));
  await progress(0.05, 'Rendering frames');
  const { createRenderJob, executeRenderJob } = await import('@hyperframes/producer');
  const { drainBrowserPool } = await import('@hyperframes/engine');
  const logs: string[] = [];
  const log = (message: string) => {
    logs.push(message);
  };
  const job = createRenderJob({
    fps: 24,
    format: 'mp4',
    quality: 'standard',
    workers: 1,
    strictness: 'strict',
    maxRenderMs: 900000,
    crf: 18,
    logger: { error: log, warn: log, info: log, debug: () => {} },
  });
  const file = path.join(dir, 'output.mp4');
  try {
    await executeRenderJob(
      job,
      path.join(dir, 'composition'),
      file,
      async (j, message) => {
        await progress(Math.min(0.9, 0.05 + j.progress * 0.0085), message);
      },
      signal,
    );
    signal.throwIfAborted();
    await progress(0.95, 'Decoding and checking video');
    return { file, qc: await qcVideo(file, spec, profile, signal) };
  } finally {
    await writeFile(
      path.join(dir, 'render-log.json'),
      JSON.stringify({ runtime, job, logs }, null, 2),
    );
    await drainBrowserPool();
  }
};
