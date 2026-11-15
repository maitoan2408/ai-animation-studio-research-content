import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { heroFrame } from '../src/motion/hero.js';
import { validateBake } from '../src/physics/bake.js';
import { anchorPoint } from '../src/scene/geometry.js';
import { analyzeContacts, type ContactSample } from '../src/continuity/ground.js';
import type { ArtPack } from '../src/scene/types.js';
import type { HeroInput } from '../src/physics/hero.js';
const read = async (path: string) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const pack = (await read('../assets/lantern-polish-1/manifest.json')) as ArtPack;
const input = (await read('../artifacts/quality/contracts-20261114/input.json')) as HeroInput;
const bake = validateBake(await read('../artifacts/quality/contracts-20261114/bake.json'));
const fixture = await read('../brief/quality/ground-fixture.json');
const ids = ['mai.left-boot', 'mai.right-boot', 'an.left-boot', 'an.right-boot'];
const tracks = new Map(ids.map((id) => [id, [] as ContactSample[]]));
for (let frame = 0; frame < 192; frame++) {
  const scene = heroFrame(pack, input, bake, frame);
  for (const id of ids) {
    const sprite = scene.sprites.find((s) => s.id === id);
    assert.ok(sprite);
    const [x, y] = anchorPoint(pack, sprite, 'sole');
    tracks
      .get(id)!
      .push({
        frame,
        stance: true,
        foot: { x, y },
        groundY: fixture.groundY,
        camera: scene.camera,
      });
  }
}
test('S05 declared ground and stance check all four actual sole anchors in all frames', () => {
  for (const id of ids) {
    const r = analyzeContacts(tracks.get(id)!, fixture.limits);
    assert.equal(r.stanceFrames, 192);
    assert.equal(r.status, 'PASS', JSON.stringify({ id, issues: r.issues.slice(0, 4) }));
  }
});
test('independent S05 track detects injected foot slip without changing baseline evaluator', () => {
  const samples = structuredClone(tracks.get(ids[0]!)!);
  samples[80]!.foot.x += 2;
  const r = analyzeContacts(samples, fixture.limits);
  assert.equal(r.status, 'FAIL');
  assert.ok(r.issues.some((i) => i.frame === 80 && i.code === 'FOOT_SLIDE'));
});
