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
import { toAnimationIR, toLegacyProjectSpec } from './animation-ir.js';
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
  mode: 'ir' | 'legacy' = 'ir',
): Promise<void> {
  const validated = parseSpec(input),
    spec = mode === 'ir' ? toLegacyProjectSpec(toAnimationIR(validated)) : validated,
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

/**
 * A long, multi-scene project can exceed available Chromium memory when kept
 * in a single 1080p session. This general scene boundary renderer releases
 * the HyperFrames browser after each bounded scene, then concatenates H.264
 * video without a lossy second video encode. The original scene-correct
 * 48kHz mix is muxed once, avoiding AAC priming gaps at shot boundaries.
 */
export const renderVideo: RenderFunction = async (store, spec, profile, dir, signal, progress) => {
  const runtime = await doctor();
  signal.throwIfAborted();
  process.env.HYPERFRAMES_BROWSER_PATH = runtime.browser;
  process.env.HYPERFRAMES_CACHE_DIR = path.join(store.root, 'cache');
  process.env.HYPERFRAMES_NO_TELEMETRY = '1';
  process.env.PRODUCER_BROWSER_GPU = 'false';
  const { createRenderJob, executeRenderJob } = await import('@hyperframes/producer');
  const { drainBrowserPool } = await import('@hyperframes/engine');
  const logs: string[] = [];
  const segmentReceipts: Array<{ scene: string; frames: number; qc: QC }> = [];
  const log = (message: string) => { logs.push(message); };
  const file = path.join(dir, 'output.mp4');
  const parsed = parseSpec(spec);
  // Preserve the established continuous-render path for short projects and
  // any long unsupported single scene. No change to existing M0/M1 output.
  const split = totalFrames(parsed) > 360 &&
    parsed.scenes.length > 1 &&
    parsed.scenes.every((scene) => scene.durationFrames <= 360);
  let activeJob: unknown;
  try {
    if (!split) {
      await compile(store, parsed, profile, path.join(dir, 'composition'));
      await progress(0.05, 'Rendering frames');
      const job = createRenderJob({
        fps: 24, format: 'mp4', quality: 'standard', workers: 1,
        strictness: 'strict', maxRenderMs: 900000, crf: 18,
        logger: { error: log, warn: log, info: log, debug: () => {} },
      });
      activeJob = job;
      await executeRenderJob(job, path.join(dir, 'composition'), file, async (j, message) => {
        await progress(Math.min(0.9, 0.05 + j.progress * 0.0085), message);
      }, signal);
    } else {
      const segmentPaths: string[] = [];
      await progress(0.04, 'Preparing memory-bounded independent scenes');
      for (const [index, scene] of parsed.scenes.entries()) {
        signal.throwIfAborted();
        const single = parseSpec({ ...parsed, scenes: [scene] });
        const partDir = path.join(dir, 'part-' + String(index).padStart(3, '0'));
        const partFile = path.join(partDir, 'shot.mp4');
        await compile(store, single, profile, path.join(partDir, 'composition'));
        const job = createRenderJob({
          fps: 24, format: 'mp4', quality: 'standard', workers: 1,
          strictness: 'strict', maxRenderMs: 900000, crf: 18,
          logger: { error: log, warn: log, info: log, debug: () => {} },
        });
        activeJob = job;
        try {
          await executeRenderJob(job, path.join(partDir, 'composition'), partFile,
            async (j, message) => {
              const overall = 0.06 + 0.78 * (index + j.progress / 100) / parsed.scenes.length;
              await progress(Math.min(0.85, overall), scene.id + ': ' + message);
            }, signal);
          const qc = await qcVideo(partFile, single, profile, signal);
          assertSegmentFrames(scene.id, qc.frames, scene.durationFrames);
          segmentReceipts.push({scene:scene.id,frames:scene.durationFrames,qc});
          segmentPaths.push(partFile);
        } finally {
          // Explicitly release native browser buffers before the next long
          // full-resolution segment. This also applies to failed segments.
          await drainBrowserPool();
        }
      }
      signal.throwIfAborted();
      await progress(0.87, 'Joining video scenes and original continuous voice');
      const list = path.join(dir, 'video-segments.txt');
      await writeFile(list, segmentPaths.map((p) => "file '" + p.replace(/'/g, "'\\''") + "'").join('\n') + '\n');
      const joined = path.join(dir, 'joined-silent.mp4');
      await run('ffmpeg', [
        '-v', 'error', '-xerror', '-nostdin', '-y',
        '-f', 'concat', '-safe', '0', '-i', list,
        '-map', '0:v:0', '-an', '-c:v', 'copy', '-movflags', '+faststart', joined,
      ], signal);
      const mixed = await mixAudio(store, parsed);
      if (mixed.audio) {
        const audioPath = path.join(dir, 'full-original-timeline.wav');
        await writeFile(audioPath, mixed.audio);
        await run('ffmpeg', [
          '-v', 'error', '-xerror', '-nostdin', '-y', '-i', joined,
          '-i', audioPath, '-map', '0:v:0', '-map', '1:a:0',
          '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
          '-ar', '48000', '-ac', '2', '-t', String(totalFrames(parsed) / 24),
          '-movflags', '+faststart', file,
        ], signal);
      } else {
        await copyFile(joined, file);
      }
    }
    signal.throwIfAborted();
    await progress(0.95, 'Decoding all frames and checking audio');
    return { file, qc: await qcVideo(file, parsed, profile, signal) };
  } finally {
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, 'render-log.json'),
      JSON.stringify({ runtime, job: activeJob, split, segmentReceipts, logs }, null, 2),
    );
    await drainBrowserPool();
  }
};

/** No silent truncation or duplicate boundary frames allowed. */
function assertSegmentFrames(id: string, actual: number, expected: number) {
  if (actual !== expected) throw new StudioError('SEGMENT_FRAME_MISMATCH', id + ':' + actual + '/' + expected);
}
