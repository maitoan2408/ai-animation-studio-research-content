import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { heroFrame } from '../src/motion/hero.js';
import { heroPhysics } from '../src/physics/recipe.js';
import { validateBake } from '../src/physics/bake.js';
import type { ArtPack } from '../src/scene/types.js';
import type { HeroInput } from '../src/physics/hero.js';
const read = async (p: string) => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'));
const pack = await read('../assets/lantern-polish-1/manifest.json') as ArtPack;
const input = await read('../artifacts/quality/contracts-20261114/input.json') as HeroInput;
const bake = validateBake(await read('../artifacts/quality/contracts-20261114/bake.json'));
const allowed = new Set(['mai.head', 'mai.head.paper-shadow', 'mai.mouth']);
test('bounded head emphasis changes real rig while preserving every other sprite, marker and camera', () => {
  let changed = 0;
  for (let frame = 0; frame < 192; frame++) {
    const base = heroFrame(pack, input, bake, frame);
    const zero = heroFrame(pack, input, bake, frame, heroPhysics, 0);
    const variant = heroFrame(pack, input, bake, frame, heroPhysics, 1);
    assert.deepEqual(zero, base);
    assert.deepEqual(variant.markers, base.markers);
    assert.deepEqual(variant.camera, base.camera);
    assert.deepEqual(variant.sprites.filter(s => !allowed.has(s.id)), base.sprites.filter(s => !allowed.has(s.id)));
    const a = base.sprites.find(s => s.id === 'mai.head')!;
    const b = variant.sprites.find(s => s.id === 'mai.head')!;
    if (Math.abs(a.rotation - b.rotation) > 1e-10) changed++;
    if (frame === 0 || frame === 191) assert.ok(Math.abs(a.rotation - b.rotation) < 1e-10);
  }
  assert.ok(changed > 180);
});
test('hero variation seeks deterministically and rejects unsupported intensity', async () => {
  const expected = heroFrame(pack, input, bake, 75, heroPhysics, .5);
  for (const frame of [191, 108, 0, 130, 75]) heroFrame(pack, input, bake, frame, heroPhysics, .5);
  assert.deepEqual(heroFrame(pack, input, bake, 75, heroPhysics, .5), expected);
  const parallel = await Promise.all([75, 12, 191, 75].map(async f => heroFrame(pack, input, bake, f, heroPhysics, .5)));
  assert.deepEqual(parallel[0], parallel[3]);
  for (const value of [-1, 2, NaN, Infinity]) assert.throws(() => heroFrame(pack, input, bake, 75, heroPhysics, value), /HERO_HEAD_EMPHASIS_RANGE/);
});
