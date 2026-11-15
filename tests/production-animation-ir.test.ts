import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseAnimationIR, toLegacyProjectSpec } from '../src/animation-ir.js';

test('new production IR fixture is strictly validated but cannot be silently downgraded', async () => {
  const input = JSON.parse(
    await readFile(
      new URL('../production/fixtures/m1-production-ir.json', import.meta.url),
      'utf8',
    ),
  );
  const ir = parseAnimationIR(input);
  assert.equal(ir.timeline.totalFrames, 72);
  assert.equal(ir.artPack?.id, 'lantern-art-1');
  assert.equal(ir.shots[0]?.production?.props[0]?.anchor, 'grip');
  assert.throws(() => toLegacyProjectSpec(ir), /IR_UNSUPPORTED_PRODUCTION_SCENE/);
  const missing = structuredClone(ir);
  delete missing.artPack;
  assert.throws(() => parseAnimationIR(missing), /production art pack missing/);
  const missingRig = structuredClone(ir);
  missingRig.shots[0]!.production!.actors[0]!.id = 'rogue';
  assert.throws(() => parseAnimationIR(missingRig), /production actor rig or art pack missing/);
  const movingStatic = structuredClone(ir);
  movingStatic.shots[0]!.camera.kind = 'static';
  assert.throws(() => parseAnimationIR(movingStatic), /static camera cannot move/);
  const ownership = structuredClone(ir);
  ownership.shots[0]!.production!.props[0]!.ownerId = 'ghost';
  assert.throws(() => parseAnimationIR(ownership), /prop owner missing/);
});
