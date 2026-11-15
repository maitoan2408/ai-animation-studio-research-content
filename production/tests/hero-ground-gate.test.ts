import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { heroFrame } from '../src/motion/hero.js';
import { validateBake } from '../src/physics/bake.js';
import { inspectHeroGround } from '../src/continuity/hero-ground.js';
import type { ArtPack } from '../src/scene/types.js';
import type { HeroInput } from '../src/physics/hero.js';
const read = async (p: string) => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'));
const pack = await read('../assets/lantern-polish-1/manifest.json') as ArtPack;
const input = await read('../artifacts/quality/contracts-20261114/input.json') as HeroInput;
const bake = validateBake(await read('../artifacts/quality/contracts-20261114/bake.json'));
const fixture = await read('../brief/quality/ground-fixture.json');
const frame = (f: number) => heroFrame(pack, input, bake, f);
test('hero ground gate checks four soles in every declared frame', () => {
  const result = inspectHeroGround(pack, fixture, frame);
  assert.equal(result.status, 'PASS');
  assert.equal(Object.keys(result.tracks).length, 4);
  assert.equal(result.tracks['mai.left-boot']!.stanceFrames, 192);
});
test('hero ground gate fails a planted-foot drift and rejects malformed fixture', () => {
  const result = inspectHeroGround(pack, fixture, f => {
    const scene = frame(f);
    if (f === 80) scene.sprites.find(s => s.id === 'mai.left-boot')!.x += 2;
    return scene;
  });
  assert.equal(result.status, 'FAIL');
  assert.ok(result.tracks['mai.left-boot']!.issues.some(i => i.frame === 80 && i.code === 'FOOT_SLIDE_WORLD'));
  assert.throws(() => inspectHeroGround(pack, {...fixture, stance: {startFrame: 0, endFrameExclusive: 0}}, frame), /HERO_GROUND_FIXTURE/);
});
