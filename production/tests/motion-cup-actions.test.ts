import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sampleCupActions } from '../src/motion/cup-actions.js';
import { anchorPoint } from '../src/scene/geometry.js';
import type { ArtPack } from '../src/scene/types.js';
const pack=JSON.parse(await readFile(new URL('../assets/lantern-polish-1/manifest.json',import.meta.url),'utf8')) as ArtPack;
test('authored lift and place move the cup and keep the actual grip anchors aligned',()=>{
 const frames=Array.from({length:240},(_,f)=>sampleCupActions(pack,f));
 const cupY=(i:number)=>frames[i]!.sprites.find(s=>s.id==='cup')!.y;
 assert.ok(cupY(107)<cupY(60)-80);assert.ok(cupY(179)>cupY(144)+80);
 for(let f=60;f<180;f++){
  const scene=frames[f]!, hand=scene.sprites.find(s=>s.id==='mai.right-hand')!, cup=scene.sprites.find(s=>s.id==='cup')!;
  const a=anchorPoint(pack,hand,'grip'),b=anchorPoint(pack,cup,'grip');
  assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-8,`frame ${f}`);
 }
 for(const f of [239,0,107,60,179,107])assert.deepEqual(sampleCupActions(pack,f),frames[f]);
});
test('cup clip rejects out-of-range and fractional frames',()=>{
 for(const f of [-1,240,.5,NaN])assert.throws(()=>sampleCupActions(pack,f),/CUP_ACTION_FRAME_INVALID/);
});
