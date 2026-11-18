import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeM3Showcase,validateM3,sampleM3,m3TotalFrames,type M3Project}
 from '../src/motion/character-library.js';
import {sampleM6} from '../src/motion/m6-quality.js';
import {evaluateM6} from '../src/motion/m6-critic.js';
import {planGrip} from '../src/motion/grip-planner.js';
import {anchorPoint} from '../src/scene/geometry.js';
import {evaluateNativeVisuals,requireNativeVisualPass} from '../src/qa/native-visual-gate.js';
import type {ArtPack} from '../src/scene/types.js';

const pack=JSON.parse(readFileSync(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
const get=(id:string)=>{
 const asset=pack.assets.find(a=>a.id===id);
 assert.ok(asset,'missing verified art '+id);return asset;
};
function scenario(name:'legacy'|'left-cup'|'right-lantern'|'wave-no-prop'|'walking-mai'){
 const p=structuredClone(makeM3Showcase(pack,'fixture-01','an'));
 if(name==='legacy')return p;
 if(name==='left-cup'){
  p.character.model='mai';p.character.xStart=840;
  p.character.capabilities=['turn-head','pick-place'];
  p.clips=[{action:'turn-head',frames:49},{action:'pick-place',frames:73}];
  p.prop={id:'object-01',asset:'props/cup',sha256:get('props/cup').sha256,
    x:720,y:631,scale:.7,hand:'left'};
 }else if(name==='right-lantern'){
  p.character.model='an';p.character.xStart=840;
  p.character.capabilities=['turn-head','pick-place'];
  p.clips=[{action:'turn-head',frames:49},{action:'pick-place',frames:73}];
  p.prop={id:'object-01',asset:'props/lantern-dark',
    sha256:get('props/lantern-dark').sha256,x:940,y:700,scale:.65,hand:'right'};
 }else if(name==='wave-no-prop'){
  p.character.model='mai';p.character.xStart=880;
  p.character.capabilities=['wave','turn-head'];
  p.clips=[{action:'wave',frames:49},{action:'turn-head',frames:49}];
  delete p.prop;
 }else{
  p.character.model='mai';p.character.xStart=720;
  p.character.capabilities=['walk-stop','pick-place'];
  p.clips=[{action:'walk-stop',frames:49},{action:'pick-place',frames:73}];
  p.prop={id:'object-01',asset:'props/cup',sha256:get('props/cup').sha256,
    x:960,y:631,scale:.7,hand:'right'};
 }
 return p;
}
test('four independent video designs + legacy all satisfy data-only reusable visual gate',()=>{
 for(const name of ['legacy','left-cup','right-lantern','wave-no-prop','walking-mai'] as const){
  const project=scenario(name);
  assert.equal(validateM3(project,pack),project);
  const report=requireNativeVisualPass(project,pack,'enhanced');
  assert.equal(report.frames,m3TotalFrames(project));
  assert.equal(report.metrics.errorCount,0,'visual gate '+name);
  const baseline=requireNativeVisualPass(project,pack,'baseline');
  assert.equal(baseline.metrics.errorCount,0);
  assert.equal(report.metrics.held,baseline.metrics.held);
  assert.equal(report.metrics.planted,baseline.metrics.planted);
  const critic=evaluateM6(project,pack,'enhanced');
  assert.deepEqual(critic.issues,[],'quality critic '+name);
  assert.equal(critic.projectFrames,report.frames);
 }
});
test('left grip and two distinct prop art assets preserve real visible hand/handle contact',()=>{
 for(const name of ['left-cup','right-lantern'] as const){
  const project=scenario(name),side=project.prop!.hand!;
  let seen=0;
  for(let f=0;f<m3TotalFrames(project);f++){
   const state=sampleM6(project,f,pack);
   if(!state.contact.grip)continue;
   const prefix=project.character.id+'.',sprites=state.frame.sprites;
   const hand=sprites.find(s=>s.id===prefix+side+'-hand')!;
   const fingers=sprites.find(s=>s.id===prefix+side+'-grip-front')!;
   const arm=sprites.find(s=>s.id===prefix+side+'-forearm')!;
   const prop=sprites.find(s=>s.id===project.prop!.id)!;
   assert.ok(hand&&fingers&&arm&&prop);
   assert.ok(arm.z<hand.z&&hand.z<prop.z&&prop.z<fingers.z);
   if(side==='left'){
    assert.equal(hand.scaleX,-1,'left hand mirrored for a natural left-side grip');
    assert.equal(fingers.scaleX,-1);
   }
   const target=anchorPoint(pack,prop,'grip');
   for(const art of [hand,fingers])
     assert.ok(Math.hypot(...([anchorPoint(pack,art,'grip')[0]-target[0],
       anchorPoint(pack,art,'grip')[1]-target[1]] as [number,number]))<.001);
   seen++;
  }
  assert.ok(seen>=35,'no long held action for '+name);
 }
});
test('the planner is based on real rig/art anchors, not video names or a magic prop x threshold',()=>{
 const base=scenario('left-cup'),prop=base.prop!;
 const v=planGrip(pack,{actorModel:'mai',actorX:840,actorFloor:860,actorFacing:1,
   propAsset:prop.asset,propX:prop.x,propY:prop.y,propScale:prop.scale,side:'left',lift:66});
 assert.ok(v.distance>7&&v.distance<203);
 assert.ok(v.layers.forearm<v.layers.palm&&v.layers.palm<v.layers.prop&&v.layers.prop<v.layers.fingers);
 const wrong=structuredClone(base);wrong.prop!.x=1030;
 assert.throws(()=>validateM3(wrong,pack),/M3_LEFT_HAND_PROP_STAGING/);
 const wrongRight=structuredClone(scenario('right-lantern'));wrongRight.prop!.x=720;
 assert.throws(()=>validateM3(wrongRight,pack),/M3_RIGHT_HAND_PROP_STAGING/);
 const noAnchor=structuredClone(base);noAnchor.prop!.asset='props/workbench';
 noAnchor.prop!.sha256=get('props/workbench').sha256;
 assert.throws(()=>validateM3(noAnchor,pack),/M3_PROP_HASH_OR_ANCHOR/);
 const stale=structuredClone(base);stale.prop!.sha256='0'.repeat(64);
 assert.throws(()=>validateM3(stale,pack),/M3_PROP_HASH_OR_ANCHOR/);
 const malformed=structuredClone(base);(malformed.prop as any).side='left';
 assert.throws(()=>validateM3(malformed,pack),/M3_PROP_INVALID/);
 const bogus=structuredClone(base);(bogus.prop as any).hand='both';
 assert.throws(()=>validateM3(bogus,pack),/M3_PROP_INVALID/);
});
test('visual preflight reliably catches an actual occlusion error without changing quality thresholds',()=>{
 const p=scenario('left-cup'),copy=structuredClone(pack);
 const a=copy.assets.find(a=>a.id==='mai/hand-grip-front')!;
 a.anchors.grip=[0,0];
 assert.throws(()=>requireNativeVisualPass(p,copy,'baseline'),
   /VISUAL_PREFLIGHT_REJECTED|M3_/);
 const clean=evaluateNativeVisuals(p,pack,'enhanced');
 assert.ok(clean.limits.some(x=>x.includes('aesthetics')));
});
test('random-seek and contact reliability across three unrelated project timelines',()=>{
 for(const n of ['left-cup','right-lantern','wave-no-prop'] as const){
  const p=scenario(n),max=m3TotalFrames(p)-1;
  const sequence=[max,0,Math.floor(max/2),3,max,0,Math.floor(max/2)];
  const ref=new Map<number,string>();
  for(const f of sequence){
   const serialized=JSON.stringify(sampleM6(p,f,pack));
   if(ref.has(f))assert.equal(serialized,ref.get(f));
   else ref.set(f,serialized);
  }
 }
});
