import { mkdtemp, readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { Store } from './store.js';
import { StudioError, hash, now, parseSpec, type Asset, type ProjectSpec } from './domain.js';
import { run } from './process.js';

export const SAMPLE_RATE = 48000;
export const SAMPLES_PER_FRAME = SAMPLE_RATE / 24;

export function wav(samples: Buffer, sampleRate = SAMPLE_RATE): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF');
  header.writeUInt32LE(36 + samples.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(samples.length, 40);
  return Buffer.concat([header, samples]);
}

/** Accept only the normalized PCM format owned by this application. */
export function pcmFromWav(bytes: Buffer): Buffer {
  if (
    bytes.length < 44 ||
    bytes.toString('ascii', 0, 4) !== 'RIFF' ||
    bytes.toString('ascii', 8, 12) !== 'WAVE'
  )
    throw new StudioError('INVALID_WAV', 'Không phải WAV RIFF.');
  let formatValid = false;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const kind = bytes.toString('ascii', offset, offset + 4),
      size = bytes.readUInt32LE(offset + 4),
      start = offset + 8;
    if (start + size > bytes.length)
      throw new StudioError('INVALID_WAV', 'WAV bị cắt hoặc có kích thước chunk sai.');
    if (kind === 'fmt ' && size >= 16)
      formatValid =
        bytes.readUInt16LE(start) === 1 &&
        bytes.readUInt16LE(start + 2) === 1 &&
        bytes.readUInt32LE(start + 4) === SAMPLE_RATE &&
        bytes.readUInt16LE(start + 14) === 16;
    if (kind === 'data') {
      if (!formatValid || size === 0 || size % 2 !== 0)
        throw new StudioError('INVALID_WAV', 'Cần PCM mono 16-bit, 48 kHz và có sample.');
      return bytes.subarray(start, start + size);
    }
    offset = start + size + (size % 2);
  }
  throw new StudioError('INVALID_WAV', 'WAV thiếu dữ liệu PCM.');
}

export async function importAudio(
  store: Store,
  bytes: Buffer,
  source: Asset['source'] = 'upload',
): Promise<Asset> {
  if (
    bytes.length > 24_000_000 ||
    bytes.length < 44 ||
    bytes.toString('ascii', 0, 4) !== 'RIFF' ||
    bytes.toString('ascii', 8, 12) !== 'WAVE'
  )
    throw new StudioError('INVALID_AUDIO', 'Chọn WAV RIFF tối đa 24 MB.');
  const dir = await mkdtemp(path.join(store.root, 'tmp', 'audio-'));
  try {
    await writeFile(path.join(dir, 'input.wav'), bytes);
    // The extra second detects overlong inputs instead of silently truncating them.
    await run('ffmpeg', [
      '-v',
      'error',
      '-nostdin',
      '-y',
      '-protocol_whitelist',
      'file,pipe',
      '-i',
      path.join(dir, 'input.wav'),
      '-t',
      '121',
      '-ac',
      '1',
      '-ar',
      String(SAMPLE_RATE),
      '-c:a',
      'pcm_s16le',
      path.join(dir, 'normalized.wav'),
    ]);
    const pcm = pcmFromWav(await readFile(path.join(dir, 'normalized.wav')));
    const duration = pcm.length / 2 / SAMPLE_RATE;
    if (duration > 120)
      throw new StudioError('AUDIO_TOO_LONG', 'Mỗi cảnh hỗ trợ tối đa 120 giây audio.');
    const normalized = wav(pcm),
      id = hash(normalized);
    const asset: Asset = {
      id,
      kind: 'audio',
      extension: 'wav',
      bytes: normalized.length,
      duration,
      sampleRate: SAMPLE_RATE,
      source,
      createdAt: now(),
    };
    await writeFile(path.join(dir, 'asset.wav'), normalized);
    await rename(path.join(dir, 'asset.wav'), store.assetFile(id));
    await store.put('assets', id, asset);
    return asset;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

let voiceModule:
  | Promise<Awaited<ReturnType<(typeof import('@echogarden/espeak-ng-emscripten'))['default']>>>
  | undefined;
export async function draftVoice(
  store: Store,
  text: string,
  language: 'vi' | 'en',
): Promise<Asset> {
  if (!text.trim()) throw new StudioError('EMPTY_NARRATION', 'Cảnh chưa có lời dẫn.');
  voiceModule ??= import('@echogarden/espeak-ng-emscripten').then((m) => m.default());
  const module = await voiceModule,
    worker = new module.eSpeakNGWorker();
  worker.set_voice('', language === 'en' ? 'en-us' : 'vi');
  worker.set_rate(150);
  const chunks: Buffer[] = [];
  worker.synthesize(text, (samples) => {
    const copy = Buffer.alloc(samples.length * 2);
    for (let i = 0; i < samples.length; i++) copy.writeInt16LE(samples[i]!, i * 2);
    chunks.push(copy);
    return false;
  });
  return importAudio(store, wav(Buffer.concat(chunks), worker.get_samplerate()), 'local-voice');
}

export function bindAudio(
  spec: ProjectSpec,
  sceneId: string,
  asset: Asset,
  textHash?: string,
): ProjectSpec {
  const copy = structuredClone(spec),
    scene = copy.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new StudioError('SCENE_NOT_FOUND', 'Không tìm thấy cảnh.', 404);
  scene.audio = { assetId: asset.id, gain: 1, ...(textHash ? { textHash } : {}) };
  scene.durationFrames = Math.max(scene.durationFrames, Math.ceil(asset.duration * 24) + 6);
  return parseSpec(copy);
}

export async function mixAudio(
  store: Store,
  spec: ProjectSpec,
): Promise<{ audio?: Buffer; envelopes: Record<string, number[]> }> {
  const frames = spec.scenes.reduce((n, s) => n + s.durationFrames, 0),
    mix = Buffer.alloc(frames * SAMPLES_PER_FRAME * 2);
  const envelopes: Record<string, number[]> = {};
  let start = 0,
    hasAudio = false;
  for (const scene of spec.scenes) {
    if (scene.audio) {
      hasAudio = true;
      await store.verifyAsset(scene.audio.assetId);
      const pcm = pcmFromWav(await readFile(store.assetFile(scene.audio.assetId)));
      if (pcm.length > scene.durationFrames * SAMPLES_PER_FRAME * 2)
        throw new StudioError(
          'AUDIO_OVERFLOW',
          `${scene.id}: audio dài hơn cảnh; tăng thời lượng.`,
        );
      const envelope: number[] = [];
      for (let f = 0; f < scene.durationFrames; f++) {
        let energy = 0;
        for (let n = 0; n < SAMPLES_PER_FRAME; n++) {
          const offset = (f * SAMPLES_PER_FRAME + n) * 2;
          const sample =
            offset < pcm.length
              ? Math.max(
                  -32768,
                  Math.min(32767, Math.round(pcm.readInt16LE(offset) * scene.audio.gain)),
                )
              : 0;
          mix.writeInt16LE(sample, start * 2 + offset);
          energy += sample * sample;
        }
        envelope.push(Math.min(1, Math.sqrt(energy / SAMPLES_PER_FRAME) / 6000));
      }
      envelopes[scene.id] = envelope;
    }
    start += scene.durationFrames * SAMPLES_PER_FRAME;
  }
  return { audio: hasAudio ? wav(mix) : undefined, envelopes };
}
