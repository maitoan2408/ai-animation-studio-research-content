import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePerformance } from '../src/motion/performance.js';
import { performanceIR, heroCapabilities, validateHeroPerformance } from '../src/motion/hero.js';

test('performance authoring contract is immutable, covers the shot and preserves shared grip intervals', () => {
  const parsed = parsePerformance(performanceIR, heroCapabilities);
  assert.deepEqual(parsed, performanceIR);
  assert.equal(parsed.contacts[0]!.end, 108);
  assert.equal(parsed.contacts[1]!.start, 72);
  assert.throws(() => {
    parsed.beats[0]!.emphasis = 0;
  }, TypeError);
  assert.throws(() => {
    parsed.contacts.push(parsed.contacts[0]!);
  }, TypeError);
  assert.deepEqual(validateHeroPerformance(parsed), parsed);
});
test('performance rejects gaps, overlap, unknown capabilities and invalid semantic references', () => {
  const bad = (edit: (v: typeof performanceIR) => void, message: RegExp) => {
    const v = structuredClone(performanceIR);
    edit(v);
    assert.throws(() => parsePerformance(v, heroCapabilities), message);
  };
  bad((v) => {
    v.beats[1]!.start++;
  }, /PERFORMANCE_BEAT/);
  bad((v) => {
    v.beats[1]!.start--;
  }, /PERFORMANCE_BEAT/);
  bad((v) => {
    v.beats.at(-1)!.end--;
  }, /PERFORMANCE_COVERAGE/);
  bad((v) => {
    v.beats[0]!.emphasis = NaN;
  }, /PERFORMANCE_BEAT/);
  bad((v) => {
    v.beats[0]!.actors = ['missing'];
  }, /PERFORMANCE_BEAT/);
  bad((v) => {
    v.beats[0]!.gazeTarget = 'missing';
  }, /PERFORMANCE_BEAT/);
  bad((v) => {
    v.primaryClip = 'walk-not-implemented';
  }, /UNSUPPORTED_CLIP/);
  bad((v) => {
    v.contacts[0]!.control = 'missing';
  }, /PERFORMANCE_CONTACT/);
  bad((v) => {
    v.contacts[0]!.target = 'lamp.missing';
  }, /CONTACT_TARGET/);
  bad((v) => {
    v.contacts.push({ ...v.contacts[0]! });
  }, /CONTACT_CONFLICT/);
  bad((v) => {
    v.contacts[0]!.end = 193;
  }, /PERFORMANCE_CONTACT/);
  bad((v) => {
    v.secondary = ['missing'];
  }, /PERFORMANCE_TARGET/);
  assert.throws(
    () => parsePerformance({ ...performanceIR, code: 'execute()' }, heroCapabilities),
    /PERFORMANCE_SCHEMA/,
  );
});
test('schema-valid unimplemented acting variations fail before rendering instead of being ignored', () => {
  const script = structuredClone(performanceIR);
  script.beats[0]!.emotion = 'joy';
  assert.doesNotThrow(() => parsePerformance(script, heroCapabilities));
  assert.throws(() => validateHeroPerformance(script), /PERFORMANCE_UNSUPPORTED_VARIATION/);
});
