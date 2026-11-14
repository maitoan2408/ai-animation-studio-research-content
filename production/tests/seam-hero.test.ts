import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { heroFrame } from '../src/motion/hero.js';
import { validateBake } from '../src/physics/bake.js';
import { validateBoundary, compareBoundary } from '../src/continuity/boundary.js';
import type { ArtPack } from '../src/scene/types.js';
import type { HeroInput } from '../src/physics/hero.js';
const read = async (path: string) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const pack = (await read('../assets/lantern-polish-1/manifest.json')) as ArtPack;
const input = (await read('../artifacts/quality/contracts-20261114/input.json')) as HeroInput;
const bake = validateBake(await read('../artifacts/quality/contracts-20261114/bake.json'));
const rigBytes = await readFile(new URL('../src/scene/rig.ts', import.meta.url));
const rigHash = createHash('sha256').update(rigBytes).digest('hex');
const previous = heroFrame(pack, input, bake, 190).sprites.find((s) => s.id === 'lamp')!;
const last = heroFrame(pack, input, bake, 191).sprites.find((s) => s.id === 'lamp')!;
const boundary = {
  schemaVersion: 1,
  shot: 'S05',
  revision: 'candidate',
  frame: 191,
  fps: { num: 24, den: 1 },
  artSha256: input.artSha256,
  rigSha256: rigHash,
  recipeSha256: bake.binding!.executionSha256,
  objects: {
    lamp: {
      position: { x: last.x, y: last.y },
      rotation: last.rotation,
      velocity: {
        x: (last.x - previous.x) * 24,
        y: (last.y - previous.y) * 24,
        angular: (last.rotation - previous.rotation) * 24,
      },
      owner: 'an.rightHandGrip',
      pose: {},
    },
  },
};
const limits = {
  positionPx: 1,
  rotationDeg: 0.1,
  velocityPxPerSec: 1,
  angularVelocityDegPerSec: 1,
  pose: 0.01,
};
test('actual S05 end state rejects a synthetic upright snap and permits an explicit cut', () => {
  assert.ok(Math.abs(last.rotation) > 1);
  const before = validateBoundary(boundary);
  const after = structuredClone(boundary);
  after.shot = 'S06';
  after.frame = 0;
  after.objects.lamp.rotation = 0;
  const next = validateBoundary(after);
  assert.ok(
    compareBoundary(before, next, 'continuous', limits).issues.some(
      (i) => i.code === 'ROTATION_MISMATCH',
    ),
  );
  assert.equal(compareBoundary(before, next, { kind: 'intentional_cut', reason: 'story cut' }, limits).status, 'INTENTIONAL_CUT');
});
test('declared matching continuation preserves actual end transform and velocity', () => {
  const before = validateBoundary(boundary);
  const after = validateBoundary({ ...boundary, shot: 'S06', frame: 0 });
  assert.equal(compareBoundary(before, after, 'continuous', limits).status, 'PASS');
});
