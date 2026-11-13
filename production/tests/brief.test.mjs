import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('locked six-shot benchmark has continuous, nonoverlapping beats and exactly 48 seconds', async () => {
  const brief = JSON.parse(await readFile(new URL('../brief/shots.json', import.meta.url), 'utf8'));
  assert.equal(brief.fps, 24);
  assert.deepEqual([brief.width, brief.height], [1920, 1080]);
  assert.deepEqual(brief.shots.map(s => s.id), ['S01', 'S02', 'S03', 'S04', 'S05', 'S06']);
  assert.deepEqual(brief.shots.map(s => s.frames), [192, 192, 240, 192, 192, 144]);
  assert.equal(brief.shots.reduce((sum, s) => sum + s.frames, 0), 1152);
  assert.equal(brief.contactTolerancePixels, 2);
  for (const shot of brief.shots) {
    let next = 0;
    for (const [start, end] of Object.values(shot.beats)) {
      assert.equal(start, next, `${shot.id} gap/overlap at ${start}`);
      assert.ok(end >= start && end < shot.frames);
      next = end + 1;
    }
    assert.equal(next, shot.frames);
  }
  assert.equal(brief.editRounds.length, 2);
});
