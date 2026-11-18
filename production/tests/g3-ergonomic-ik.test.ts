import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {actorSprites} from '../src/scene/rig.js';
import {anchorPoint} from '../src/scene/geometry.js';
import {selectG3ElbowBend,applyG3ElbowBend} from '../src/scene/g3-ergonomic-ik.js';
import type {ArtPack,SceneFrame,Point} from '../src/scene/types.js';

const pack=JSON.parse(readFileSync(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
const dist=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const part=(f:SceneFrame,id:string)=>f.sprites.find(s=>s.id===id)!;
const marker=(f:SceneFrame,id:string)=>f.markers.find(m=>m.id===id)!.point;
const frame=(model:string,hand:'left'|'right',facing:1|-1,scale:number):SceneFrame=>{
 const local=hand==='left'?[-114,-333] as Point:[110,-246] as Point;
 const rig=actorSprites(pack,{id:'actor',character:model,x:960,floor:860,facing,scale,
  view:'quarter',layeredGripSide:hand,
  ...(hand==='left'?{leftWrist:local,leftHand:'grip' as const}:
    {rightWrist:local,rightHand:'grip' as const})});
 return {sprites:rig.sprites,markers:rig.markers,camera:{x:960,y:540,zoom:1}};
};
for(const model of ['mai','an'])for(const hand of ['left','right'] as const)
for(const facing of [-1,1] as const)for(const scale of [.8,1,1.25]){
 test('G3 ergonomic chain opt-in, source-pinned, invariant '+model+hand+facing+scale,()=>{
  const source=frame(model,hand,facing,scale);
  const before=structuredClone(source);
  const bend=selectG3ElbowBend(source,pack,'actor',hand,facing);
  const fixed=applyG3ElbowBend(source,pack,'actor',hand,facing,bend);
  const start=part(fixed,'actor.'+hand+'-upper');
  const lower=part(fixed,'actor.'+hand+'-forearm');
  const handTarget=marker(fixed,'actor.'+hand+'-wrist');
  const elbow=anchorPoint(pack,start,'end'),end=anchorPoint(pack,lower,'end');
  assert.ok(dist(elbow,[lower.x,lower.y])<.001);
  assert.ok(dist(end,handTarget)<.001);
  assert.deepEqual(source,before,'never mutate source frame');
  assert.deepEqual(fixed.markers,source.markers,'never move contact, wrist or soles');
  for(const s of fixed.sprites){
   const orig=source.sprites.find(x=>x.id===s.id)!;
   if(s.id==='actor.'+hand+'-upper'||s.id==='actor.'+hand+'-forearm')continue;
   assert.deepEqual(s,orig,'other body/hand sprites must remain intact');
  }
  assert.deepEqual(applyG3ElbowBend(fixed,pack,'actor',hand,facing,bend),fixed);
 });
}
test('G3 failing-first winged left elbow is corrected without changing actual grip',()=>{
 const old=frame('mai','left',1,1),first=part(old,'actor.left-upper');
 const raw=anchorPoint(pack,first,'end');
 assert.ok(raw[1]<first.y,'the existing locked IK raises the elbow above shoulder');
 const bend=selectG3ElbowBend(old,pack,'actor','left',1);
 assert.equal(bend,1,'source-derived ergonomics selects the downward alternative');
 const fixed=applyG3ElbowBend(old,pack,'actor','left',1,bend);
 const newElbow=anchorPoint(pack,part(fixed,'actor.left-upper'),'end');
 assert.ok(newElbow[1]>first.y+40,'elbow must not remain above shoulder');
 assert.ok(newElbow[1]-raw[1]>65,'a trivial angle tweak does not fix the wing');
});
test('G3 elbow branch refuses missing native art, wrist and invalid bend',()=>{
 const s=frame('an','right',1,1);
 assert.throws(()=>applyG3ElbowBend(s,pack,'actor','right',1,0 as never),/G3_ELBOW_BEND_INVALID/);
 const missing=structuredClone(s);missing.markers=missing.markers.filter(x=>x.id!=='actor.right-wrist');
 assert.throws(()=>applyG3ElbowBend(missing,pack,'actor','right',1,1),/G3_ELBOW_WRIST_MISSING/);
 const bad=structuredClone(s);part(bad,'actor.right-upper').asset='missing/upper';
 assert.throws(()=>selectG3ElbowBend(bad,pack,'actor','right',1),/G3_ELBOW_NATIVE_LINK_MISSING/);
});
