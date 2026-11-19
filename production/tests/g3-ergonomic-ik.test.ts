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
/** Movement continuity failure injection: do NOT snap from compressed to
 * full-length forearm when a moving shoulder/wrist crosses the projection cap.
 * This is exactly the frame-36 failure from the first native R5 review.
 */
test('G3 projection remains continuous near the maximum foreshortening boundary',()=>{
 const old=make('mai','left',1,1);
 const u=p(old,'actor.left-upper');
 let previous:SceneFrame|undefined;
 // Progressive rising grip and simultaneous modest torso/hip shift exercise
 // the same driven G3 channels, without actor/prop-specific production rules.
 for(let i=0;i<=80;i++){
  const wristY=-320-i*.35;
  const shift=Math.sin(i/80*Math.PI)*3;
  const rig=actorSprites(pack,{id:'actor',character:'mai',x:940,floor:860,
   facing:1,view:'quarter',layeredGripSide:'left',
   torsoAngle:shift,hipOffset:[shift*.5,shift*.4],
   leftWrist:[-114,wristY],leftHand:'grip'});
  const current:SceneFrame={camera:old.camera,sprites:rig.sprites,markers:rig.markers};
  const projected=applyG3ArmProjection(current,pack,'actor','left',1);
  const elbow=anchorPoint(pack,p(projected,'actor.left-upper'),'end');
  const lower=p(projected,'actor.left-forearm');
  assert.ok(lower.scaleY/p(projected,'actor.left-upper').scaleY>=.56-1e-6);
  if(previous){
   const prevElbow=anchorPoint(pack,p(previous,'actor.left-upper'),'end');
   assert.ok(d(elbow,prevElbow)<14,'G3_PROJECTED_ELBOW_TELEPORT '+i);
   const prevLower=p(previous,'actor.left-forearm');
   assert.ok(Math.abs(lower.rotation-prevLower.rotation)<19,
    'G3_PROJECTED_FOREARM_ROTATION_SNAP '+i);
  }
  previous=projected;
 }
});

/** Independent visual-motivated branch fixture. A high hand target must not
 * force the upper sleeve horizontal; lowering the elbow cannot move the real
 * wrist, hand asset, prop or either planted foot. Opposite hand/facing/scales
 * prove that the branch is not a special case for one actor or lantern.
 */
for(const model of ['mai','an'])for(const side of ['left','right'] as const)
for(const facing of [-1,1] as const)for(const scale of [.8,1,1.2]){
 test('G3 lowered elbow is grounded and native-anchored '+model+side+facing+scale,()=>{
  const base=make(model,side,facing,scale);
  const out=applyG3ArmProjection(base,pack,'actor',side,facing,'lowered');
  const upper=p(out,'actor.'+side+'-upper'),lower=p(out,'actor.'+side+'-forearm');
  const joint=anchorPoint(pack,upper,'end');
  const wrist=out.markers.find(x=>x.id==='actor.'+side+'-wrist')!.point;
  const nativeSpan=Math.hypot(joint[0]-upper.x,joint[1]-upper.y);
  assert.ok(joint[1]>upper.y+.3*nativeSpan,
    'a recovery/grip sleeve must point below rather than above the shoulder');
  assert.ok(lower.scaleY/upper.scaleY>=.56-1e-6);
  assert.ok(d(joint,[lower.x,lower.y])<.001);
  assert.ok(d(anchorPoint(pack,lower,'end'),wrist)<.001);
  assert.deepEqual(out.markers,base.markers);
  for(const s of out.sprites)if(!['actor.'+side+'-upper','actor.'+side+'-forearm'].includes(s.id))
   assert.deepEqual(s,p(base,s.id));
  assert.deepEqual(applyG3ArmProjection(out,pack,'actor',side,facing,'lowered'),out);
 });
}
test('G3 lowered branch remains continuous through source-scaled rising grip',()=>{
 let previous:SceneFrame|undefined;
 for(let i=0;i<=80;i++){
  const rig=actorSprites(pack,{id:'actor',character:'mai',x:940,floor:860,
    facing:1,view:'quarter',layeredGripSide:'left',
    leftWrist:[-114,-320-i*.35],leftHand:'grip'});
  const current:SceneFrame={camera:{x:960,y:540,zoom:1},sprites:rig.sprites,markers:rig.markers};
  const next=applyG3ArmProjection(current,pack,'actor','left',1,'lowered');
  if(previous){
   const a=anchorPoint(pack,p(previous,'actor.left-upper'),'end');
   const b=anchorPoint(pack,p(next,'actor.left-upper'),'end');
   assert.ok(d(a,b)<14,'G3_LOWERED_ELBOW_FRAME_JUMP '+i);
  }
  previous=next;
 }
});
