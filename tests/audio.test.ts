import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.js';
import { planScript } from '../src/planner.js';
import { wav, mixAudio, pcmFromWav, bindAudio } from '../src/audio.js';
import { hash, now, type Asset } from '../src/domain.js';

test('mixer places audio at scene frame boundary and rejects overflow instead of trimming', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'studio-audio-')),
    store = new Store(root);
  await store.init();
  t.after(() => rm(root, { recursive: true, force: true }));
  const samples = Buffer.alloc(48000 * 2 * 2);
  for (let i = 0; i < samples.length; i += 2) samples.writeInt16LE(9000, i);
  const bytes = wav(samples),
    id = hash(bytes),
    asset: Asset = {
      id,
      kind: 'audio',
      extension: 'wav',
      bytes: bytes.length,
      duration: 2,
      sampleRate: 48000,
      source: 'upload',
      createdAt: now(),
    };
  await writeFile(store.assetFile(id), bytes);
  await store.put('assets', id, asset);
  const draft = planScript(
    '[action=idle; seconds=1]\nSilent.\n\n[action=talk; seconds=1]\nVoice.',
    'Timing',
  ).spec;
  const bound = bindAudio(draft, 's002', asset);
  assert.equal(bound.scenes[1]!.durationFrames, 54);
  const mix = await mixAudio(store, bound),
    pcm = pcmFromWav(mix.audio!);
  assert.equal(pcm.readInt16LE(95998), 0);
  assert.equal(pcm.readInt16LE(96000), 9000);
  assert.equal(pcm.readInt16LE(287998), 9000);
  assert.equal(pcm.readInt16LE(288000), 0);
  bound.scenes[1]!.durationFrames = 24;
  await assert.rejects(() => mixAudio(store, bound), /dài hơn cảnh/);
});
test('planner rejects malformed and duplicate directives', () => {
  assert.throws(() => planScript('[action] Hello.'), /key=value/);
  assert.throws(() => planScript('[action=wave; action=walk] Hello.'), /lặp/);
});
