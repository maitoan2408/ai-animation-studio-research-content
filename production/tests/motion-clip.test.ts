import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleScalarClip, type ScalarClip } from '../src/motion/clip.js';

const clip: ScalarClip = { duration: 40, start: 10, end: 30, anticipation: 0.2, actionEnd: 0.7, anticipationAmount: 0.1, overshootAmount: 0.2 };
test('clip preserves endpoints, anticipation, overshoot and settle through random-access sampling', () => {
  assert.equal(sampleScalarClip(clip, 0).value, 10);
  assert.equal(sampleScalarClip(clip, 8).value, 8);
  assert.equal(sampleScalarClip(clip, 28).value, 34);
  assert.equal(sampleScalarClip(clip, 40).value, 30);
  const ordered = Array.from({ length: 41 }, (_, i) => sampleScalarClip(clip, i));
  for (const i of [40, 4, 28, 0, 39, 8, 4]) assert.deepEqual(sampleScalarClip(clip, i), ordered[i]);
});
test('retime and amplitude affect actual samples without changing endpoints', () => {
  const slow = { ...clip, duration: 80 };
  for (let i = 0; i <= 40; i++) assert.equal(sampleScalarClip(slow, 2 * i).value, sampleScalarClip(clip, i).value);
  assert.notEqual(sampleScalarClip({ ...clip, end: 50 }, 20).value, sampleScalarClip(clip, 20).value);
  assert.notEqual(sampleScalarClip(clip, 20).value, sampleScalarClip(slow, 20).value);
});
test('invalid markers, out of range frames, extra options and overflow are refused', () => {
  for (const bad of [{ ...clip, anticipation: 0 }, { ...clip, actionEnd: 1 }, { ...clip, anticipation: 0.8 }, { ...clip, overshootAmount: NaN }, { ...clip, duration: 3.2 }, { ...clip, unsupported: true }])
    assert.throws(() => sampleScalarClip(bad, 0), /MOTION_CLIP_INVALID/);
  for (const frame of [-1, 41, 0.5, NaN]) assert.throws(() => sampleScalarClip(clip, frame), /MOTION_FRAME_INVALID/);
  assert.throws(() => sampleScalarClip({ ...clip, start: -1e308, end: 1e308 }, 1), /MOTION_CLIP_RANGE/);
});
