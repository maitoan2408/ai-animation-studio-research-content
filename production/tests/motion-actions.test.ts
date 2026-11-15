import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sampleAction, type ActionSpec } from '../src/motion/actions.js';
import { actorSprites } from '../src/scene/rig.js';
import { anchorPoint } from '../src/scene/geometry.js';
import type { ArtPack } from '../src/scene/types.js';
const pack = JSON.parse(await readFile(new URL('../assets/lantern-polish-1/manifest.json', import.meta.url), 'utf8')) as ArtPack;
for (const action of ['turn-head', 'wave'] as const) test(`${action} samples the actual rig with stable contact and exact endpoints`, () => {
 const spec: ActionSpec = { action, duration: 48, intensity: 1, onTwos: false };
 const first = actorSprites(pack, sampleAction(spec, 0));
 assert.deepEqual(actorSprites(pack, sampleAction(spec, 48)), first);
 const middle = actorSprites(pack, sampleAction(spec, 24));
 assert.notDeepEqual(middle.sprites, first.sprites);
 for (let f = 0; f <= 48; f++) {
  const pose = actorSprites(pack, sampleAction(spec, f));
  for (const id of ['mai.left-boot', 'mai.right-boot']) {
   const boot = pose.sprites.find(s => s.id === id)!;
   const initial = first.sprites.find(s => s.id === id)!;
   assert.deepEqual(anchorPoint(pack, boot, 'sole'), anchorPoint(pack, initial, 'sole'));
  }
  assert.ok(pose.sprites.every(s => [s.x,s.y,s.rotation,s.scaleX,s.scaleY].every(Number.isFinite)));
 }
 const ordered = Array.from({length: 49}, (_, f) => sampleAction(spec, f));
 for (const f of [48,0,25,12,25]) assert.deepEqual(sampleAction(spec, f), ordered[f]);
 const twos = { ...spec, onTwos: true }; assert.deepEqual(sampleAction(twos, 10), sampleAction(twos, 11));
 assert.notDeepEqual(sampleAction(spec, 12), sampleAction({ ...spec, duration: 96 }, 12));
 assert.notDeepEqual(sampleAction(spec, 24), sampleAction({ ...spec, intensity: .5 }, 24));
});
test('action boundary rejects unsupported inputs', () => {
 const spec: ActionSpec = { action:'wave', duration:48, intensity:1, onTwos:false };
 for (const invalid of [{...spec, action:'walk'}, {...spec, duration:25}, {...spec, intensity:1.1}, {...spec, onTwos:1}, {...spec, unsupported:true}])
  assert.throws(() => sampleAction(invalid as ActionSpec, 0), /ACTION_SPEC_INVALID/);
 for (const frame of [-1,49,.5]) assert.throws(() => sampleAction(spec, frame), /ACTION_FRAME_INVALID/);
});
test('wave stays reachable at bounded timings, intensities and on-twos extremes', () => {
 for (const duration of [24, 48, 96, 240]) for (const intensity of [0, .5, 1]) for (const onTwos of [false, true]) {
  const spec: ActionSpec = { action: 'wave', duration, intensity, onTwos };
  for (let frame = 0; frame <= duration; frame++) assert.doesNotThrow(() => actorSprites(pack, sampleAction(spec, frame)));
 }
});
test('elbow branch is explicit, validated, and preserves defaults', () => {
 const { rightElbowBend: _branch, ...pose } = sampleAction({action:'turn-head',duration:48,intensity:1,onTwos:false}, 24);
 assert.deepEqual(actorSprites(pack, pose), actorSprites(pack, {...pose, rightElbowBend:1}));
 assert.notDeepEqual(actorSprites(pack, pose), actorSprites(pack, {...pose, rightElbowBend:-1}));
 assert.throws(() => actorSprites(pack, {...pose, rightElbowBend:0 as 1}), /RIGHT_ELBOW_BEND_INVALID/);
});
test('turn-head and wave have a common rig boundary without an elbow snap', () => {
 const common = { duration:48, intensity:1, onTwos:false } as const;
 const turn: ActionSpec = {...common,action:'turn-head'}, wave: ActionSpec = {...common,action:'wave'};
 const turnEnd = actorSprites(pack, sampleAction(turn, 48));
 const waveStart = actorSprites(pack, sampleAction(wave, 0));
 assert.deepEqual(turnEnd, waveStart);
 for (const previous of [turn, wave]) {
  const before = actorSprites(pack, sampleAction(previous, 47));
  for(const a of before.sprites) {
   const b=waveStart.sprites.find(s=>s.id===a.id)!;
   assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1, a.id);
   assert.ok(Math.abs(a.rotation-b.rotation)<1, a.id);
  }
 }
});
