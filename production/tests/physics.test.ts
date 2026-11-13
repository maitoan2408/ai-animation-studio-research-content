import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { simulate } from '../src/physics/engines.js';
import { measure } from '../src/physics/measure.js';
import { validateBake, sampleBake, digest } from '../src/physics/bake.js';
import { bakeHero } from '../src/physics/hero.js';
import { heroInput, heroFrame, r3 } from '../src/motion/hero.js';
import { critic } from '../src/motion/critic.js';
import { benchmarkFrame } from '../src/scene/benchmark.js';
import type { ArtPack } from '../src/scene/types.js';
const pack = JSON.parse(
  await readFile(new URL('../assets/lantern-polish-1/manifest.json', import.meta.url), 'utf8'),
) as ArtPack;
const golden = JSON.parse(
  await readFile(new URL('../brief/quality/physics-golden.json', import.meta.url), 'utf8'),
);
const input = heroInput(pack),
  bake = await bakeHero(input);

test('Rapier measured pendulum/drop/bounce/damping meet locked criteria and exact reference hash', async () => {
  const p = await simulate('rapier', 'pendulum'),
    d = await simulate('rapier', 'drop'),
    damped = await simulate('rapier', 'pendulum', 0.35);
  const result = measure(p, d, damped);
  assert.equal(result.engineeringPass, true, JSON.stringify(result));
  assert.equal(result.metrics.strictZeroPenetration, true);
  assert.equal(digest({ p, d, damped }), golden.rapierFixtureSha256);
  assert.throws(
    () =>
      measure(
        p.map((s) => ({ ...s, x: 0.1 })),
        d,
        damped,
      ),
    /INSUFFICIENT_PENDULUM_CYCLES/,
  );
  assert.throws(
    () =>
      measure(
        p,
        d.map((s) => ({ ...s, vy: -1 })),
        damped,
      ),
    /NO_BOUNCE/,
  );
});
test('baked hero preserves dual hold, grips, stance and arbitrary seeks without live physics', async () => {
  assert.equal(bake.sha256, golden.heroBakeSha256);
  assert.equal((await bakeHero(input)).sha256, bake.sha256);
  const review = critic(pack, input, bake);
  assert.equal(review.status, 'PASS_GEOMETRY', JSON.stringify(review));
  assert.ok(review.maxRotationDegrees > 5, 'secondary motion must actually move');
  for (let f = 0; f < 108; f++)
    assert.deepEqual(heroFrame(pack, input, bake, f), benchmarkFrame(pack, 'S05', f, r3));
  const expected = heroFrame(pack, input, bake, 125);
  for (const f of [191, 0, 108, 72, 125, 191, 12]) heroFrame(pack, input, bake, f);
  assert.deepEqual(heroFrame(pack, input, bake, 125), expected);
  assert.throws(() => {
    bake.data.frames[120]!.centerX = 0;
  }, TypeError);
});
test('bake boundary rejects tampering, wrong revision, malformed timebase/events and nonfinite data', () => {
  const changed = structuredClone(bake);
  changed.data.frames[120]!.centerX += 0.01;
  assert.throws(() => validateBake(changed), /BAKE_HASH/);
  for (const field of ['fps', 'events', 'frames'] as const) {
    const bad = structuredClone(bake);
    (bad.data as unknown as Record<string, unknown>)[field] = null;
    assert.throws(() => validateBake(bad), /BAKE_CONTRACT/);
  }
  const bad = structuredClone(bake);
  bad.data.frames[10]!.rotation = 0.1;
  bad.sha256 = digest(bad.data);
  assert.throws(() => validateBake(bad), /BAKE_LOCKED_CONTACT/);
  const nan = structuredClone(bake);
  nan.data.frames[120]!.centerX = NaN;
  assert.throws(() => validateBake(nan), /BAKE_FRAME/);
  assert.throws(() => sampleBake(structuredClone(bake), 120, digest(input)), /BAKE_NOT_VALIDATED/);
  assert.throws(() => sampleBake(bake, 192, digest(input)), /BAKE_FRAME_RANGE/);
  assert.throws(() => sampleBake(bake, 120, '0'.repeat(64)), /BAKE_INPUT_MISMATCH/);
  const other = structuredClone(pack);
  other.version = 'changed';
  assert.throws(() => heroFrame(other, input, bake, 120), /HERO_ART_MISMATCH/);
});
test('critic rejects a detached physics joint even when IK still keeps the palm on the prop', () => {
  const detached = structuredClone(bake);
  detached.data.frames[180]!.centerX += 0.01;
  detached.sha256 = digest(detached.data);
  const report = critic(pack, input, validateBake(detached));
  assert.equal(report.status, 'FAIL');
  assert.ok(report.violations.some((v) => v.frame === 180 && v.code === 'PHYSICS_JOINT_DRIFT'));
});
test('hero input and legacy opt-in reject invalid mass, unsupported phases and stretched contacts', async () => {
  await assert.rejects(bakeHero({ ...input, massKg: NaN }), /HERO_MATERIAL/);
  const malformed = structuredClone(input);
  malformed.anchorFrames[107]![0] += 0.1;
  await assert.rejects(bakeHero(malformed), /HERO_INITIAL_CONTACT/);
  assert.throws(
    () =>
      benchmarkFrame(pack, 'S05', 80, {
        ...r3,
        handoffSecondaryTransform: { x: 900, y: 600, rotation: 3 },
      }),
    /SECONDARY_TRANSFORM_RANGE/,
  );
  assert.throws(
    () =>
      benchmarkFrame(pack, 'S05', 120, {
        ...r3,
        handoffSecondaryTransform: { x: 3000, y: 600, rotation: 3 },
      }),
    /IK_UNREACHABLE/,
  );
});
