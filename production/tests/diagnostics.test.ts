import { test } from 'node:test';
import assert from 'node:assert/strict';
import { curveSvg } from '../src/motion/diagnostic-svg.js';
test('diagnostic figures retain real frame indices, escape labels and reject invalid numeric data', () => {
  const svg = curveSvg(
    '<script>',
    'px',
    [
      { frame: 0, value: 0 },
      { frame: 191, value: 0.000823 },
    ],
    1,
  );
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('limit 1.000 px'));
  assert.ok(svg.includes('191'));
  assert.throws(() => curveSvg('x', 'x', []), /INVALID_DIAGNOSTIC_TRACE/);
  assert.throws(() => curveSvg('x', 'x', [{ frame: 1, value: NaN }]), /INVALID_DIAGNOSTIC_TRACE/);
  assert.throws(
    () =>
      curveSvg('x', 'x', [
        { frame: 2, value: 0 },
        { frame: 1, value: 0 },
      ]),
    /INVALID_DIAGNOSTIC_TRACE/,
  );
});
