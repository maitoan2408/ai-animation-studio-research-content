import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeContacts } from '../src/continuity/ground.js';
const limits = { driftPx: 1, gapPx: 1, penetrationPx: 0 };
const sample = (frame: number, x = 0, y = 0, cameraX = 0) => ({
  frame,
  stance: true,
  foot: { x, y },
  groundY: 0,
  camera: { x: cameraX, y: 0, zoom: 1 },
  prop: { x: 10, y: -4, radius: 1 },
  torso: { left: 3, top: -5, right: 5, bottom: 0 },
});
test('camera pan does not create a world-space planted-foot failure', () => {
  const r = analyzeContacts([sample(0), sample(1, 0, 0, 50)], limits);
  assert.equal(r.status, 'PASS');
  assert.equal(r.maxWorldDrift, 0);
});
test('independent ground catches slip, gap, penetration and prop/body overlap', () => {
  const cases = [
    { s: sample(1, 2), code: 'FOOT_SLIDE' },
    { s: sample(1, 0, -2), code: 'FOOT_GAP' },
    { s: sample(1, 0, 1), code: 'GROUND_PENETRATION' },
    { s: { ...sample(1), prop: { x: 4, y: -3, radius: 1 } }, code: 'PROP_BODY_OVERLAP' },
  ];
  for (const { s, code } of cases) {
    const r = analyzeContacts([sample(0), s], limits);
    assert.equal(r.status, 'FAIL');
    assert.ok(
      r.issues.some((i) => i.code === code),
      code,
    );
  }
});
test('invalid frames and unpaired collision shapes fail closed', () => {
  assert.throws(() => analyzeContacts([sample(1), sample(0)], limits), /CONTACT_FRAME_ORDER/);
  assert.throws(() => analyzeContacts([sample(0), sample(2)], limits), /CONTACT_FRAME_GAP/);
  assert.throws(
    () => analyzeContacts([{ ...sample(0), torso: undefined }], limits),
    /CONTACT_COLLISION_SHAPES/,
  );
  assert.throws(() => analyzeContacts([sample(0)], { ...limits, driftPx: NaN }), /CONTACT_LIMITS/);
});
test('world-space slip cannot be hidden by camera zooming out', () => {
  const zoomed = { ...sample(1, 1.5), camera: { x: 0, y: 0, zoom: 0.5 } };
  const result = analyzeContacts([sample(0), zoomed], limits);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.issues.some((issue) => issue.code === 'FOOT_SLIDE_WORLD'));
});
test('a new stance uses a new anchor after an airborne interval', () => {
  const airborne = { ...sample(2, 5, -3), stance: false };
  const landed = sample(3, 10);
  const result = analyzeContacts([sample(0), sample(1), airborne, landed, sample(4, 10)], limits);
  assert.equal(result.status, 'PASS');
  assert.equal(result.stanceFrames, 4);
  const slipped = { ...sample(4, 12) };
  assert.ok(analyzeContacts([sample(0), sample(1), airborne, landed, slipped], limits).issues
    .some((issue) => issue.frame === 4 && issue.code === 'FOOT_SLIDE'));
});
