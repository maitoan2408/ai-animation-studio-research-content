import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {actorSprites} from '../src/scene/rig.js';
import {resolveG3ArmDepth,auditG3ArmDepth} from '../src/scene/arm-depth.js';
import type {ArtPack,SceneFrame} from '../src/scene/types.js';

const pack=JSON.parse(readFileSync(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
const scene=(actor:string,hand:'left'|'right',held:boolean,scale=1,facing:1|-1=1):SceneFrame=>{
 const rig=actorSprites(pack,{
  id:'generic',character:actor,x:950,floor:860,scale,facing,
  ...(held?{layeredGripSide:hand,[hand+'Hand']:'grip'}:{})
 });
 return {sprites:rig.sprites,markers:rig.markers,camera:{x:960,y:540,zoom:1}};
};
const z=(s:SceneFrame,suffix:string)=>s.sprites.find(x=>x.id==='generic.'+suffix)!.z;

for(const actor of ['an','mai'])for(const side of ['left','right'] as const)
 for(const facing of [1,-1] as const)for(const scale of [.75,1.15]){
 test('G3 compositing survives held->released without z-pop '+actor+' '+side+' '+facing+' '+scale,()=>{
  const held=scene(actor,side,true,scale,facing);
  const released=scene(actor,side,false,scale,facing);
  // Failing-first negative fixture: original generic cutout can abruptly
  // invert arm/torso layering at handoff when the active hand is left.
  if(side==='left'){
   assert.notEqual(z(held,'left-upper')>z(held,'torso'),
     z(released,'left-upper')>z(released,'torso'));
   assert.ok(auditG3ArmDepth(released,'generic',side).length>0,
     'reproduce painter-order inversion from old default pose');
  }
  const result=resolveG3ArmDepth(released,'generic',side);
  assert.deepEqual(auditG3ArmDepth(result,'generic',side),[]);
  assert.equal(z(result,side+'-upper')>z(result,'torso'),true);
  assert.equal(z(result,side+'-upper')>z(result,'torso'),
    z(held,side+'-upper')>z(held,'torso'));
  assert.equal(z(result,(side==='left'?'right':'left')+'-upper')<z(result,'torso'),true);
  for(const current of result.sprites){
   const original=released.sprites.find(s=>s.id===current.id)!;
   assert.equal(current.asset,original.asset);
   assert.equal(current.x,original.x);
   assert.equal(current.y,original.y);
   assert.equal(current.rotation,original.rotation);
   assert.equal(current.scaleX,original.scaleX);
   assert.equal(current.scaleY,original.scaleY);
   assert.equal(current.opacity,original.opacity);
   if(!current.id.startsWith('generic.left-')&&!current.id.startsWith('generic.right-'))
    assert.equal(current.z,original.z);
  }
  assert.deepEqual(result.markers,released.markers);
  assert.deepEqual(resolveG3ArmDepth(result,'generic',side),result,
    'random seeking or repeated application must be idempotent');
  assert.deepEqual(released,scene(actor,side,false,scale,facing),
    'legacy source remains unchanged');
  const inverted=structuredClone(result);
  inverted.sprites.find(s=>s.id==='generic.'+side+'-upper')!.z=z(result,'torso')-1;
  assert.ok(auditG3ArmDepth(inverted,'generic',side)
    .some(i=>i.code==='G3_ARM_TORSO_OCCLUSION'));
 });
}
test('G3 occlusion fails closed on absent arm/torso and ambiguous depth',()=>{
 const s=scene('mai','left',false);
 const bad=structuredClone(s);
 bad.sprites=bad.sprites.filter(p=>p.id!=='generic.left-forearm');
 assert.throws(()=>resolveG3ArmDepth(bad,'generic','left'),/G3_ARM_DEPTH_INVALID/);
 const ambiguous=structuredClone(s);
 ambiguous.sprites.find(p=>p.id==='generic.left-upper')!.z=z(ambiguous,'torso');
 assert.throws(()=>resolveG3ArmDepth(ambiguous,'generic','left'),/G3_ARM_DEPTH_CAPABILITY_UNSUPPORTED/);
});
