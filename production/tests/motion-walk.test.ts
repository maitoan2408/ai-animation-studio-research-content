import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sampleWalk } from '../src/motion/walk.js';
import { actorSprites } from '../src/scene/rig.js';
import { anchorPoint } from '../src/scene/geometry.js';
import type { ArtPack } from '../src/scene/types.js';
const pack = JSON.parse(await readFile(new URL('../assets/lantern-polish-1/manifest.json', import.meta.url), 'utf8')) as ArtPack;
test('authored walk has real stage travel and planted sole anchors remain in world space', () => {
 const frames = Array.from({length:192}, (_, f) => sampleWalk(f));
 assert.ok(frames[191]!.x - frames[0]!.x > 250);
 for (let f=0;f<192;f++) {
  const pose=frames[f]!, scene=actorSprites(pack,pose);
  for (const side of ['left','right'] as const) {
   const ankle=side === 'left' ? pose.leftAnkle! : pose.rightAnkle!;
   const sole=anchorPoint(pack,scene.sprites.find(s=>s.id===`mai.${side}-boot`)!, 'sole');
   if (Math.abs(ankle[1]+29)<1e-8) {
    assert.ok(Math.abs(sole[1]-860)<1e-8);
    if (f>0) {
     const prev=frames[f-1]!, oldAnkle=side === 'left' ? prev.leftAnkle! : prev.rightAnkle!;
     if (Math.abs(oldAnkle[1]+29)<1e-8) {
      const prior=actorSprites(pack,prev).sprites.find(s=>s.id===`mai.${side}-boot`)!;
      assert.ok(Math.abs(sole[0]-anchorPoint(pack,prior,'sole')[0])<1e-7);
     }
    }
   }
  }
 }
 for(const f of [191,0,80,10,80]) assert.deepEqual(sampleWalk(f),frames[f]);
});
test('walk fixture rejects malformed or unsupported frames', () => {
 for (const f of [-1,192,.5,NaN]) assert.throws(()=>sampleWalk(f),/WALK_FRAME_INVALID/);
});
