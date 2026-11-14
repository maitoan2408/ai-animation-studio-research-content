import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { benchmarkFrame, shotFrames } from '../src/scene/benchmark.js';
import { inspectSceneSeam } from '../src/continuity/scene-seam.js';
import type { ArtPack } from '../src/scene/types.js';
const read = async (p: string) => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'));
const pack = await read('../assets/lantern-polish-1/manifest.json') as ArtPack;
const order = await read('../brief/edit-R2-order.json') as string[];
const edit = await read('../brief/edit-R3.json');
const before = benchmarkFrame(pack, 'S06', shotFrames.S06 - 1, edit);
const after = benchmarkFrame(pack, 'S05', 0, edit);
test('real R2 editorial boundary is S06 to S05; a missing lamp is explicit', () => {
  assert.equal(order.indexOf('S05'), order.indexOf('S06') + 1);
  const [torso, lamp] = inspectSceneSeam(before, after, ['mai.torso', 'lamp']);
  assert.equal(torso!.status, 'OBSERVED');
  assert.deepEqual(lamp, {id: 'lamp', status: 'MISSING_AT_BOUNDARY', beforePresent: false, afterPresent: true});
});
test('seam inventory refuses ambiguous selection and duplicate sprite identity', () => {
  assert.throws(() => inspectSceneSeam(before, after, ['lamp', 'lamp']), /SEAM_OBJECT_SELECTION/);
  assert.throws(() => inspectSceneSeam({...before, sprites: [...before.sprites, before.sprites[0]!]}, after, ['lamp']), /SEAM_DUPLICATE_SPRITE/);
});
