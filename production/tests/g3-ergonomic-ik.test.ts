import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {actorSprites} from '../src/scene/rig.js';
import {anchorPoint} from '../src/scene/geometry.js';
import {applyG3ArmProjection} from '../src/scene/g3-ergonomic-ik.js';
import type {ArtPack,SceneFrame,Point} from '../src/scene/types.js';
const pack=JSON.parse(readFileSync(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
const p=(f:SceneFrame,id:string)=>f.sprites.find(s=>s.id===id)!;
const d=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function make(model:string,side:'left'|'right',facing:1|-1,scale:number):SceneFrame{
 const w:Point=side==='left'?[-114,-333]:[110,-246];
 const rig=actorSprites(pack,{id:'actor',character:model,x:940,floor:860,facing,scale,
  view:'quarter',layeredGripSide:side,
  ...(side==='left'?{leftWrist:w,leftHand:'grip' as const}:
    {rightWrist:w,rightHand:'grip' as const})});
 return {sprites:rig.sprites,markers:rig.markers,camera:{x:960,y:540,zoom:1}};
}
for(const model of ['mai','an'])for(const side of ['left','right'] as const)
for(const facing of [-1,1] as const)for(const scale of [.8,1,1.25]){
 test('G3 projection source-preserving/outside elbow '+model+side+facing+scale,()=>{
  const old=make(model,side,facing,scale),src=structuredClone(old);
  const next=applyG3ArmProjection(old,pack,'actor',side,facing);
  const u=p(next,'actor.'+side+'-upper'),v=p(next,'actor.'+side+'-forearm');
  const elbow=anchorPoint(pack,u,'end');
  const wrist=next.markers.find(m=>m.id==='actor.'+side+'-wrist')!.point;
  assert.ok(d(elbow,[v.x,v.y])<.001&&d(anchorPoint(pack,v,'end'),wrist)<.001);
  assert.ok(v.scaleY/u.scaleY>=.56-1e-6&&v.scaleY/u.scaleY<=1+1e-6);
  assert.ok((elbow[0]-u.x)*facing*(side==='left'?1:-1)<0,
    'R4 rejected cross-chest arm must not recur');
  assert.deepEqual(old,src);assert.deepEqual(next.markers,old.markers);
  for(const s of next.sprites)if(!['actor.'+side+'-upper','actor.'+side+'-forearm'].includes(s.id))
   assert.deepEqual(s,p(old,s.id));
  assert.deepEqual(applyG3ArmProjection(next,pack,'actor',side,facing),next);
 });
}
test('G3 actual winged left-shoulder scenario corrected without chest-crossing',()=>{
 const old=make('mai','left',1,1),upper=p(old,'actor.left-upper');
 assert.ok(anchorPoint(pack,upper,'end')[1]<upper.y);
 const result=applyG3ArmProjection(old,pack,'actor','left',1);
 const u=p(result,'actor.left-upper'),v=p(result,'actor.left-forearm'),joint=anchorPoint(pack,u,'end');
 assert.ok(joint[1]>u.y+5&&joint[0]<u.x-45);
 assert.ok(v.scaleY/u.scaleY<.9&&v.scaleY/u.scaleY>=.56);
});
test('G3 lost native wrist or anchor fails closed',()=>{
 const a=make('an','right',1,1);a.markers=a.markers.filter(m=>m.id!=='actor.right-wrist');
 assert.throws(()=>applyG3ArmProjection(a,pack,'actor','right',1),/G3_PROJECTION_WRIST_MISSING/);
 const b=make('an','right',1,1);p(b,'actor.right-forearm').asset='broken/art';
 assert.throws(()=>applyG3ArmProjection(b,pack,'actor','right',1),/G3_PROJECTION_ART_MISSING/);
});