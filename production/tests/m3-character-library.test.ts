import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {anchorPoint} from '../src/scene/geometry.js';
import {M3CharacterRegistry,makeM3Showcase,m3TotalFrames,sampleM3,validateM3,type M3Project} from '../src/motion/character-library.js';
import type {ArtPack} from '../src/scene/types.js';

const pack=JSON.parse(await readFile(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
const project=makeM3Showcase(pack,'guest-01','an');
const sample=(f:number,p:M3Project=project)=>sampleM3(p,f,pack);
const boot=(f:number,side:'left'|'right')=>{
 const state=sample(f);
 const sprite=state.frame.sprites.find(s=>s.id==='guest-01.'+side+'-boot')!;
 return anchorPoint(pack,sprite,'sole');
};
test('M3 registry reuses the real rig with a new immutable instance identity',()=>{
 assert.equal(project.character.id,'guest-01');
 assert.equal(project.character.model,'an');
 assert.equal(m3TotalFrames(project),268);
 const another=makeM3Showcase(pack,'guest-02','mai');
 assert.equal(sample(0,another).pose.id,'guest-02');
 assert.equal(sample(0,another).pose.character,'mai');
 assert.ok(sample(0,another).frame.sprites.some(s=>s.asset==='mai/torso'));
 assert.ok(sample(0).frame.sprites.some(s=>s.asset==='an/torso'));
});
test('walk-stop contact: actual sole anchor is frozen through each stance, feet lift during swings',()=>{
 const firstRight=boot(0,'right'), secondLeft=boot(24,'left');
 for(let f=0;f<24;f++)assert.ok(Math.hypot(...([boot(f,'right')[0]-firstRight[0],boot(f,'right')[1]-firstRight[1]] as [number,number]))<1e-7,'right slip '+f);
 for(let f=24;f<48;f++)assert.deepEqual(boot(f,'left'),secondLeft,'left slip '+f);
 const settledLeft=boot(48,'left'),settledRight=boot(48,'right');
 for(let f=48;f<73;f++){
  assert.deepEqual(boot(f,'left'),settledLeft,'settled left slip '+f);
  assert.deepEqual(boot(f,'right'),settledRight,'settled right slip '+f);
 }
 assert.ok(boot(12,'left')[1]<boot(0,'left')[1]-10,'left foot swing never lifts');
 assert.ok(boot(36,'right')[1]<boot(24,'right')[1]-10,'right foot swing never lifts');
 for(let f=0;f<73;f++)assert.ok(sample(f).frame.sprites.every(s=>[s.x,s.y,s.rotation,s.scaleX,s.scaleY].every(Number.isFinite)));
});
test('all action intervals form a continuous editable timeline without start/end pose snaps',()=>{
 const boundaries=[72,121,170];
 for(const i of boundaries){
  const left=sample(i),right=sample(i+1);
  const old=new Map(left.frame.sprites.map(s=>[s.id,s]));
  for(const next of right.frame.sprites){
   const prev=old.get(next.id);
   assert.ok(prev,'lost sprite '+next.id);
   assert.ok(Math.hypot(prev!.x-next.x,prev!.y-next.y)<1e-6,'position snap '+next.id+' at '+i);
   assert.ok(Math.abs(prev!.rotation-next.rotation)<1e-6,'rotation snap '+next.id);
  }
 }
 assert.deepEqual(sample(267).pose.rightWrist,[96,-220]);
});
test('cup pick/place follows the grip anchor while held, returns to rest and fully decodes at all frames',()=>{
 let hold=0;
 for(let f=0;f<m3TotalFrames(project);f++){
  const r=sample(f);
  assert.ok(r.frame.sprites.length>20);
  if(r.contact.grip){hold++;assert.ok(r.contact.gripError!==null&&r.contact.gripError<0.00001,'grip drifts at '+f);}
 }
 assert.ok(hold>=40);
 const start=sample(171),last=sample(267);
 assert.equal(start.frame.sprites.find(s=>s.id==='cup-m3')?.y,631);
 assert.equal(last.frame.sprites.find(s=>s.id==='cup-m3')?.y,631);
 assert.ok(sample(218).frame.sprites.find(s=>s.id==='cup-m3')!.y<585,'cup never lifted');
});
test('random seek / replay returns identical full sprites and markers',()=>{
 const positions=[267,96,7,240,0,173,191,248,48,121,267,7];
 for(const f of positions)assert.deepEqual(sample(f),sample(f));
 const once=Array.from({length:268},(_,f)=>sample(f));
 for(const f of positions)assert.deepEqual(sample(f),once[f]);
});
test('unknown actions, fields, rigs, assets, durations, frames fail closed',()=>{
 const change=(mutator:(p:M3Project)=>void)=>{
  const p=structuredClone(project);mutator(p);return p;
 };
 const invalid=[
  change(p=>(p.character.rigId='production-cutout-2' as 'production-cutout-1')),
  change(p=>(p.character.id='mai/../../' )),
  change(p=>(p.character.capabilities=['walk-stop'])), // the remaining timeline needs unavailable actions
  change(p=>(p.character.capabilities=['wave','wave'])),
  change(p=>(p.character.capabilities=['wave','teleport' as 'wave'])),
  change(p=>(p.character.capabilities=[])),
  change(p=>(p.prop.sha256='0'.repeat(64))),
  change(p=>(p.clips[1]!.action='teleport' as 'wave')),
  change(p=>(p.clips[0]!.frames=64)),
  change(p=>(p.clips[3]!.frames=72)),
  change(p=>(p.prop.x=NaN)),
  {...structuredClone(project),unexpected:'execute-me'},
  {...structuredClone(project),clips:[{action:'wave',frames:49,html:'<script/>'}]},
 ];
 for(const [i,p] of invalid.entries())assert.throws(()=>validateM3(p,pack),/M3_/,'invalid fixture '+i);
 for(const f of [-1,268,1.2,NaN])assert.throws(()=>sample(f),/M3_FRAME_OUT_OF_RANGE/);
});

test('character registry is collision-safe and returns isolated project copies',()=>{
 const registry=new M3CharacterRegistry(pack);
 registry.register(project);
 assert.deepEqual(registry.list(),['guest-01']);
 assert.throws(()=>registry.register(project),/M3_CHARACTER_DUPLICATE/);
 assert.throws(()=>registry.resolve('missing'),/M3_CHARACTER_UNKNOWN/);
 const modified=registry.resolve('guest-01');
 modified.character.capabilities.length=0;
 modified.clips[0]!.frames=64;
 assert.equal(registry.resolve('guest-01').character.capabilities.length,4);
 assert.equal(registry.resolve('guest-01').clips[0]!.frames,73);
 registry.register(makeM3Showcase(pack,'guest-02','mai'));
 assert.deepEqual(registry.list(),['guest-01','guest-02']);
});
test('supported clip retiming changes frames but retains planted contacts and random seek',()=>{
 const changed=structuredClone(project);
 changed.clips[0]!.frames=97;
 changed.clips[1]!.frames=73;
 validateM3(changed,pack);
 const endWalk=sample(96,changed),next=sample(97,changed);
 assert.deepEqual(endWalk.frame.sprites,next.frame.sprites);
 let frozen:readonly number[]|undefined;
 for(let f=0;f<97;f++){
   const cur=sample(f,changed);
   assert.ok(cur.frame.sprites.every(x=>[x.x,x.y].every(Number.isFinite)));
   if(f>=72){
     const boot=cur.frame.markers.find(x=>x.id==='guest-01.left-sole')!.point;
     if(frozen)assert.deepEqual(boot,frozen);
     else frozen=boot;
   }
 }
 assert.equal(m3TotalFrames(changed),316);
});

test('capability registry accepts genuine subsets and rejects unavailable actions at validation time',()=>{
 const waveOnly=structuredClone(project);
 waveOnly.character.capabilities=['wave'];
 waveOnly.clips=[{action:'wave',frames:49}];
 assert.equal(validateM3(waveOnly,pack).character.capabilities.length,1);
 assert.equal(m3TotalFrames(waveOnly),49);
 assert.equal(sample(24,waveOnly).action,'wave');
 const registry=new M3CharacterRegistry(pack);
 assert.deepEqual(registry.register(waveOnly).character.capabilities,['wave']);
 assert.equal(registry.resolve('guest-01').clips[0]?.action,'wave');
 const invalid=structuredClone(waveOnly);
 invalid.clips.push({action:'walk-stop',frames:73});
 assert.throws(()=>validateM3(invalid,pack),/M3_ACTION_NOT_CAPABLE/);
});

test('reject unreachable pick/place geometry before renderer starts, while preserving valid authored contacts',()=>{
 assert.doesNotThrow(()=>validateM3(project,pack));
 const tooFar=structuredClone(project);
 tooFar.character.xStart=350;
 assert.throws(()=>validateM3(tooFar,pack),/M3_PICK_IK_UNREACHABLE/);
 const noWalk=structuredClone(project);
 noWalk.clips=noWalk.clips.slice(1);
 assert.throws(()=>validateM3(noWalk,pack),/M3_PICK_IK_UNREACHABLE/);
 const stillValid=structuredClone(project);
 stillValid.prop.x=950;
 assert.doesNotThrow(()=>validateM3(stillValid,pack));
});
