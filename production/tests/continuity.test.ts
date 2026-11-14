import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBoundary, compareBoundary } from '../src/continuity/boundary.js';
const sha = 'a'.repeat(64);
const state = {
  schemaVersion: 1,
  shot: 'S05',
  revision: 'r1',
  frame: 191,
  fps: { num: 24, den: 1 },
  artSha256: sha,
  rigSha256: sha,
  recipeSha256: sha,
  objects: {
    lamp: {
      position: { x: 1060, y: 692 },
      rotation: -16.96,
      velocity: { x: 0, y: 0, angular: 0 },
      owner: 'an.rightHandGrip',
      pose: { grip: 1 },
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
test('valid continuation matches state without mutating snapshots', () => {
  const a = validateBoundary(state),
    b = validateBoundary({ ...state, shot: 'S06', frame: 0 });
  assert.equal(compareBoundary(a, b, 'continuous', limits).status, 'PASS');
  assert.ok(Object.isFrozen(a.objects.lamp!.position));
});
test('unintended rotation reset, attachment and data mismatch fail with evidence', () => {
  const a = validateBoundary(state);
  const changed = structuredClone(state);
  changed.shot = 'S06';
  changed.frame = 0;
  changed.objects.lamp.rotation = 0;
  changed.objects.lamp.owner = 'mai.rightHandGrip';
  const report = compareBoundary(a, validateBoundary(changed), 'continuous', limits);
  assert.equal(report.status, 'FAIL');
  assert.ok(report.issues.some((i) => i.code === 'ROTATION_MISMATCH'));
  assert.ok(report.issues.some((i) => i.code === 'OWNER_MISMATCH'));
  assert.equal(
    compareBoundary(a, validateBoundary(changed), { kind: 'intentional_cut', reason: 'story cut' }, limits).status,
    'INTENTIONAL_CUT',
  );
});
test('invalid provenance, nonfinite pose and missing controls cannot pass', () => {
  assert.throws(() => validateBoundary({ ...state, artSha256: 'missing' }), /BOUNDARY_SCHEMA/);
  const bad = structuredClone(state);
  bad.objects.lamp.position.x = NaN;
  assert.throws(() => validateBoundary(bad), /BOUNDARY_SCHEMA/);
  const next = structuredClone(state);
  delete (next.objects.lamp.pose as Record<string, number>).grip;
  assert.equal(
    compareBoundary(validateBoundary(state), validateBoundary(next), 'continuous', limits).status,
    'FAIL',
  );
  assert.throws(
    () =>
      compareBoundary(validateBoundary(state), validateBoundary(state), 'continuous', {
        ...limits,
        positionPx: NaN,
      }),
    /BOUNDARY_LIMITS/,
  );
  assert.throws(() => compareBoundary(validateBoundary(state), validateBoundary(state), {kind:'intentional_cut',reason:''}, limits), /BOUNDARY_TRANSITION/);
});

test('intentional cuts record an explicit reason', () => {
  const a = validateBoundary(state);
  const result = compareBoundary(a, a, { kind: 'intentional_cut', reason: 'story cut' }, limits);
  assert.equal(result.status, 'INTENTIONAL_CUT');
  assert.equal(result.reason, 'story cut');
});
