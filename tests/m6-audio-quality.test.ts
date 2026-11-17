import test from 'node:test';
import assert from 'node:assert/strict';
import { wav } from '../src/audio.js';
import { analyzeAudioWav } from '../src/audio-quality.js';
test('M6 audio critic reports PCM peak without changing any voice samples', () => {
  const raw = Buffer.alloc(2000 * 2 * 4);
  raw.writeInt16LE(15000, 0);
  raw.writeInt16LE(-15000, 2);
  const source = wav(raw),
    original = Buffer.from(source),
    q = analyzeAudioWav(source);
  assert.equal(q.frames, 4);
  assert.ok(q.peakDbFS !== null && q.peakDbFS < 0);
  assert.equal(q.clippedSamples, 0);
  assert.deepEqual(source, original);
});
test('M6 audio critic detects both clipped PCM and silence in frame units', () => {
  const raw = Buffer.alloc(2000 * 2 * 30);
  raw.writeInt16LE(32767, 0);
  const q = analyzeAudioWav(wav(raw));
  assert.equal(q.frames, 30);
  assert.equal(q.clippedSamples, 1);
  assert.ok(q.issues.some((x) => x.code === 'AUDIO_DIGITAL_CLIP'));
  assert.ok(q.issues.some((x) => x.code === 'AUDIO_LONG_SILENCE'));
  assert.ok(q.maxConsecutiveSilentFrames >= 24);
});
test('M6 audio critic rejects unaligned sample buffers and corrupt WAV', () => {
  const short = Buffer.alloc(2002);
  assert.throws(() => analyzeAudioWav(wav(short)), /AUDIO_QUALITY_FRAME_ALIGNMENT/);
  assert.throws(
    () => analyzeAudioWav(Buffer.from('not-wave')),
    (error: unknown) => (error as { code?: string }).code === 'INVALID_WAV',
  );
});
