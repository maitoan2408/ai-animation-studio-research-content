import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sampleFallFixture} from '../src/motion/fall-fixture.js';
import {actorSprites} from '../src/scene/rig.js';
import {anchorPoint} from '../src/scene/geometry.js';
import type {ArtPack} from '../src/scene/types.js';
const pack=JSON.parse(await readFile(new URL('../assets/lantern-polish-1/manifest.json',import.meta.url),'utf8')) as ArtPack;
test('fall spike lowers and returns with fixed sole anchors and random access',()=>{
 const poses=Array.from({length:73},(_,f)=>sampleFallFixture(f));
 assert.deepEqual(poses[0],poses[72]); assert.ok(poses[36]!.hipOffset![1]>100);assert.ok(poses[36]!.torsoAngle!>60);
 const first=actorSprites(pack,poses[0]!);
 for(const pose of poses){const frame=actorSprites(pack,pose);for(const id of ['mai.left-boot','mai.right-boot']){
  assert.deepEqual(anchorPoint(pack,frame.sprites.find(s=>s.id===id)!,'sole'),anchorPoint(pack,first.sprites.find(s=>s.id===id)!,'sole'));
 }}
 for(const f of [72,0,36,10,36])assert.deepEqual(sampleFallFixture(f),poses[f]);
});
test('fall spike rejects invalid frames',()=>{for(const f of [-1,73,.5,NaN])assert.throws(()=>sampleFallFixture(f),/FALL_FRAME_INVALID/)});
