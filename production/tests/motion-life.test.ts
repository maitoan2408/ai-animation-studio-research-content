import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleLife } from '../src/motion/life.js';

test('seeded life signals have bounded values and order-independent sampling', () => {
  const ordered = Array.from({ length: 480 }, (_, i) => sampleLife(42, i));
  for (const i of [479, 0, 124, 33, 124, 298]) assert.deepEqual(sampleLife(42, i), ordered[i]);
  assert.ok(ordered.every(({ breath, blink }) => breath >= 0 && breath <= 1 && blink >= 0 && blink <= 1));
  for (let window = 0; window < 4; window++) assert.equal(ordered.slice(window * 120, (window + 1) * 120).filter((x) => x.blink === 1).length, 1);
  assert.ok(ordered.some((x, i) => x.blink !== sampleLife(43, i).blink));
});
test('life rejects invalid inputs instead of coercing them', () => {
  for (const [seed, frame] of [[-1, 0], [1.5, 0], [2 ** 32, 0], [0, -1], [0, 0.5], [0, 10000001], [NaN, 0]])
    assert.throws(() => sampleLife(seed!, frame!), /LIFE_INPUT_INVALID/);
});
