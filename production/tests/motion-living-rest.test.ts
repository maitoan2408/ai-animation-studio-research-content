import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sampleLivingRest} from '../src/motion/living-rest.js';
import {actorSprites} from '../src/scene/rig.js';
import {anchorPoint} from '../src/scene/geometry.js';
import type {ArtPack} from '../src/scene/types.js';
const pack=JSON.parse(await readFile(new URL('../assets/lantern-polish-1/manifest.json',import.meta.url),'utf8')) as ArtPack;
test('standing life signals drive the real rig, preserve both soles and seek deterministically',()=>{
 const poses=Array.from({length:480},(_,frame)=>sampleLivingRest(42,frame,1));
 assert.ok(poses.some(p=>p.mood==='blink'));
 assert.ok(poses.some(p=>p.hipOffset![1] > 1));
 const first=actorSprites(pack,poses[0]!);
 for(const p of poses){
  const scene=actorSprites(pack,p);
  for(const id of ['mai.left-boot','mai.right-boot']){
   const a=scene.sprites.find(s=>s.id===id)!,b=first.sprites.find(s=>s.id===id)!;
   assert.deepEqual(anchorPoint(pack,a,'sole'),anchorPoint(pack,b,'sole'));
  }
 }
 for(const frame of [479,0,134,10,134])assert.deepEqual(sampleLivingRest(42,frame,1),poses[frame]);
 const zero=Array.from({length:480},(_,frame)=>sampleLivingRest(42,frame,0));
 assert.ok(zero.every(p=>p.mood==='neutral' && p.hipOffset![0]===0 && p.hipOffset![1]===0));
});
test('standing life rejects invalid seed, frame and intensity',()=>{
 for(const value of [-1,1.1,NaN])assert.throws(()=>sampleLivingRest(1,0,value),/LIVING_INTENSITY_INVALID/);
 assert.throws(()=>sampleLivingRest(-1,0,1),/LIFE_INPUT_INVALID/);
 assert.throws(()=>sampleLivingRest(1,-1,1),/LIFE_INPUT_INVALID/);
});
