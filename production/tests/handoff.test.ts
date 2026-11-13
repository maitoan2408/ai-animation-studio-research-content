import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {benchmarkFrame, shotFrames, type Edit, type ShotId} from '../src/scene/benchmark.js';
import {anchorPoint, assetPoint} from '../src/scene/geometry.js';
import {distance} from '../src/scene/math.js';
import type {ArtPack, SceneFrame} from '../src/scene/types.js';

const pack = JSON.parse(await readFile(new URL('../assets/lantern-polish-1/manifest.json', import.meta.url), 'utf8')) as ArtPack;
const previous: Edit = {polish: true, cameraAmplitude: .7, reactionDelay: 12};
const candidate: Edit & {separateHandoffGrips: boolean} = {...previous, separateHandoffGrips: true};
const part = (frame: SceneFrame, id: string) => {
  const found = frame.sprites.find(item => item.id === id);
  assert.ok(found, id);
  return found;
};

test('S05 R3 hands contact separate visible sides of the drawn lantern handle', () => {
  for (let f = 0; f < 192; f++) {
    const frame = benchmarkFrame(pack, 'S05', f, candidate);
    const lamp = part(frame, 'lamp');
    // Independent expectations from the SVG path: left vertical at (51,25),
    // right vertical at (110,27), not the old shared top-centre marker.
    for (const [owner, active, target] of [
      ['mai', f <= 107, [51,25]], ['an', f >= 72, [110,27]],
    ] as const) {
      if (!active) continue;
      const actual = anchorPoint(pack, part(frame, `${owner}.right-hand`), 'grip');
      const expected = assetPoint(pack, lamp, [...target]);
      assert.ok(distance(actual, expected) * frame.camera.zoom <= 2, `${f}:${owner}: contact misses handle side`);
    }
    if (f >= 72 && f <= 107) {
      const left = anchorPoint(pack, part(frame, 'mai.right-hand'), 'grip');
      const right = anchorPoint(pack, part(frame, 'an.right-hand'), 'grip');
      assert.ok((right[0] - left[0]) * frame.camera.zoom >= 45, `${f}: overlapping shared grip`);
    }
  }
});

test('S05 R3 keeps prop path, reaction delay, other shots and deterministic seeks', () => {
  for (const [shot, count] of Object.entries(shotFrames)) {
    for (let f = 0; f < count; f++) {
      const old = benchmarkFrame(pack, shot as ShotId, f, previous);
      const next = benchmarkFrame(pack, shot as ShotId, f, candidate);
      if (shot !== 'S05') assert.deepEqual(next, old, `${shot}:${f} changed outside scope`);
      else {
        assert.deepEqual(part(next, 'lamp'), part(old, 'lamp'), `prop path ${f}`);
        assert.deepEqual(next.camera, old.camera);
        for (const id of ['mai.head', 'an.head']) assert.deepEqual(part(next, id), part(old, id));
      }
    }
  }
  const still = benchmarkFrame(pack, 'S05', 95, candidate);
  for (const f of [191, 0, 108, 72, 107]) benchmarkFrame(pack, 'S05', f, candidate);
  assert.deepEqual(benchmarkFrame(pack, 'S05', 95, candidate), still);
  // The open drawing changes finger geometry at release; its grip marker is
  // no longer a contact constraint. Continuity concerns the actual wrist pivot.
  const release = [107, 108, 109].map(f => part(benchmarkFrame(pack, 'S05', f, candidate), 'mai.right-hand'));
  for (let i=1;i<release.length;i++) {
    const a=release[i-1]!,b=release[i]!;
    assert.ok(distance([a.x,a.y],[b.x,b.y]) < 3, 'wrist snaps at owner transfer');
  }
});
