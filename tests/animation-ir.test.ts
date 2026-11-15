import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toAnimationIR,
  toLegacyProjectSpec,
  parseAnimationIR,
  shotAtFrame,
} from '../src/animation-ir.js';
import { planScript } from '../src/planner.js';
import { frameSvg } from '../src/rig.js';

const spec = planScript(
  '[title=Greeting;action=wave;seconds=4;color=#557e88]\nHello.\n\n[action=walk;camera=pan;seconds=4]\nWalk.',
  'M1 IR',
  'paper-cut',
  'en',
).spec;

test('roundtrip v1.0 spec and half-open shot boundaries', () => {
  const ir = toAnimationIR(spec);
  assert.deepEqual(toLegacyProjectSpec(ir), spec);
  assert.deepEqual(
    ir.shots.map((x) => x.interval),
    [
      { startFrame: 0, endFrame: 96 },
      { startFrame: 96, endFrame: 192 },
    ],
  );
  assert.equal(shotAtFrame(ir, 95).shot.id, 's001');
  assert.equal(shotAtFrame(ir, 96).localFrame, 0);
});
test('legacy and adapted frames produce identical SVG source', () => {
  const adapted = toLegacyProjectSpec(toAnimationIR(spec));
  for (const f of [0, 1, 12, 24, 48, 94, 95, 96, 97, 120, 160, 190, 191])
    assert.equal(frameSvg(spec, f), frameSvg(adapted, f));
});
test('strict failure on timeline, actor, injection and out of range', () => {
  const ir = toAnimationIR(spec);
  const mutate = (fn: (x: typeof ir) => void) => {
    const v = structuredClone(ir);
    fn(v);
    return v;
  };
  assert.throws(
    () =>
      parseAnimationIR(
        mutate((x) => {
          x.shots[1]!.interval.startFrame += 1;
        }),
      ),
    /non-contiguous/,
  );
  assert.throws(
    () =>
      parseAnimationIR(
        mutate((x) => {
          x.timeline.totalFrames += 1;
        }),
      ),
    /totalFrames mismatch/,
  );
  assert.throws(
    () =>
      parseAnimationIR(
        mutate((x) => {
          x.shots[0]!.action.actorId = 'ghost';
        }),
      ),
    /actor missing/,
  );
  assert.throws(() => parseAnimationIR({ ...ir, unsafeJavaScript: 'alert(1)' }));
  assert.throws(
    () =>
      toLegacyProjectSpec(
        mutate((x) => {
          x.characters[0]!.rigId = 'unverified';
        }),
      ),
    /IR_UNSUPPORTED_CHARACTER/,
  );
  assert.throws(() => shotAtFrame(ir, -1), /IR_FRAME_OUT_OF_RANGE/);
  assert.throws(() => shotAtFrame(ir, 192), /IR_FRAME_OUT_OF_RANGE/);
});
test('stale audio hash, duplicate characters rejected', () => {
  const ir = toAnimationIR(spec);
  const stale = structuredClone(ir);
  stale.shots[0]!.audio = { assetId: 'a'.repeat(64), textHash: 'b'.repeat(64), gain: 1 };
  assert.throws(() => parseAnimationIR(stale), /narration\/audio hash mismatch/);
  const dup = structuredClone(ir);
  dup.characters.push({ ...dup.characters[0]! });
  assert.throws(() => parseAnimationIR(dup), /Duplicate character ID/);
});
