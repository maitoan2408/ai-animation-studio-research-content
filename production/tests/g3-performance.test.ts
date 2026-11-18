import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import type {ArtPack} from '../src/scene/types.js';
import {anchorPoint,spriteBounds} from '../src/scene/geometry.js';
import {sampleGeneralFilm,type GeneralFilm} from '../src/motion/general-timeline.js';
import {sampleGeneralPlayback,type GeneralPlayback} from '../src/motion/general-playback.js';
import {sampleG3Performance,validateG3Performance,type G3PerformancePlan} from '../src/motion/g3-performance.js';
import {auditFrame} from '../src/qa/general-scene-quality.js';
const pack=JSON.parse(readFileSync(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
const sha=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const asset=(id:string)=>pack.assets.find(x=>x.id===id)!;
function project(hand:'left'|'right'='right',model='an',frames=128):GeneralPlayback{
 const actorX=hand==='right'?800:1280;
 const propX=hand==='right'?900:1180;
 const prop=hand==='right'?'props/cup':'props/lantern-dark';
 const film:GeneralFilm={schemaVersion:'general-film/1',frames,
  tracks:[{contact:{schemaVersion:'general-contact/1',
   actor:{id:'hero-actor',model,rigId:'production-cutout-1',x:actorX,floor:860,facing:1,scale:1},
   object:{id:'hero-prop',asset:prop,sha256:asset(prop).sha256,x:propX,y:631,scale:hand==='right'?.7:.65,anchor:'grip'},
   hand,camera:{x:960,y:540,zoom:1}},
   keys:[{frame:0,dx:0,dy:0,headAngle:0},{frame:23,dx:0,dy:-8,headAngle:-3},
     {frame:48,dx:0,dy:-24,headAngle:7},{frame:frames-1,dx:0,dy:-24,headAngle:7}]}],
  camera:[{frame:0,x:960,y:540,zoom:1},{frame:frames-1,x:953,y:538,zoom:1.05}]};
 return {schemaVersion:'general-playback/1',film,releases:[]};
}
function makePlan(movie:GeneralPlayback,withRelease=false):G3PerformancePlan{
 const release=64;
 return {schemaVersion:'g3-performance/1',playbackSha256:sha(movie),artSha256:sha(pack),
 tracks:[{actorId:'hero-actor',beats:[
  {kind:'prepare',start:0,peak:10,end:23,torsoDeg:-2,hipX:-2,hipY:2,
    headDeg:3,freeHandDx:-7,freeHandDy:-2},
  {kind:'act',start:23,peak:42,end:63,torsoDeg:2.5,hipX:2,hipY:-2,
    headDeg:-3,freeHandDx:8,freeHandDy:2},
  {kind:'recover',start:64,peak:78,end:111,torsoDeg:-2,hipX:-2,hipY:2,
    headDeg:3,freeHandDx:-8,freeHandDy:3}
 ]}]};
}
function fixture(hand:'left'|'right',model:string){
 const p=project(hand,model); // A deterministic constant-world dummy bake for sampler tests only.
 const prop=sampleGeneralFilm(p.film,63,pack).frame.sprites.find(x=>x.id==='hero-prop')!;
 p.releases=[{actorId:'hero-actor',frame:64,settleFrames:24,
  project:{} as never,bake:{frames:Array.from({length:64},(_,i)=>({frame:i,centerX:prop.x,centerY:prop.y,angleDeg:0}))} as never}];
 return p;
}
for(const [hand,model] of [['right','an'],['left','mai']] as const){
 test('G3 performance pure acting preserves hand/prop and soles on '+hand+' '+model,()=>{
  const movie=fixture(hand,model);const plan=makePlan(movie);
  validateG3Performance(plan,movie,pack,{playbackSha256:sha(movie),artSha256:sha(pack)});
  let changed=0;
  const scenes=Array.from({length:128},(_,i)=>{
   const a=sampleGeneralPlayback(movie,i,pack);
   const b=sampleG3Performance(movie,plan,i,pack);
   assert.deepEqual(b.contacts,a.contacts);
   const prop=(x:typeof a)=>x.frame.sprites.find(s=>s.id==='hero-prop')!;
   assert.deepEqual(prop(b),prop(a));
   for(const sole of ['left','right']){
     const id='hero-actor.'+sole+'-sole';
     assert.deepEqual(b.frame.markers.find(m=>m.id===id)?.point,a.frame.markers.find(m=>m.id===id)?.point);
   }
   if(i<64){
     const side=hand;
     const palm=b.frame.sprites.find(s=>s.id==='hero-actor.'+side+'-hand')!;
     assert.ok(Math.hypot(...(()=>{
       const a=anchorPoint(pack,palm,'grip');
       const target=anchorPoint(pack,prop(b),'grip');
       return [a[0]-target[0],a[1]-target[1]] as [number,number];
     })())<.001);
   }
   assert.deepEqual(auditFrame(b.frame,pack,{frame:i,contacts:b.contacts}),[]);
   if(JSON.stringify(b.frame.sprites)!==JSON.stringify(a.frame.sprites))changed++;
   return b;
  });
  assert.ok(changed>36,'no meaningful movement in new enhanced output '+changed);
  const rest=95;
  const base=sampleGeneralPlayback(movie,rest,pack).frame;
  // Isolate the opt-in rest solver from the independent torso/hip acting
  // channels. Comparing an active acting beat to an unanimated baseline would
  // conflate different geometric causes and falsely fail a correct rest solver.
  const improved=sampleGeneralPlayback(movie,rest,pack,'native-silhouette').frame;
  const crowding=(f:typeof base)=>{
    const b=(part:string)=>spriteBounds(pack,
      f.sprites.find(s=>s.id==='hero-actor.'+part)!);
    const handBox=b(hand+'-hand'),area=(handBox.right-handBox.left)*
      (handBox.bottom-handBox.top);
    return ['left-thigh','right-thigh'].reduce((sum,part)=>{
      const thigh=b(part);
      return sum+Math.max(0,Math.min(handBox.right,thigh.right)-
        Math.max(handBox.left,thigh.left))*Math.max(0,Math.min(handBox.bottom,thigh.bottom)-
        Math.max(handBox.top,thigh.top));
    },0)/area;
  };
  assert.ok(crowding(improved)<=crowding(base)+1e-5,
    'silhouette-aware resting cannot increase hand/thigh crowding');
  for(const f of [63,64,65,95,127]){
    const s=scenes[f]!.frame;
    const upper=s.sprites.find(x=>x.id==='hero-actor.'+hand+'-upper')!;
    const torso=s.sprites.find(x=>x.id==='hero-actor.torso')!;
    assert.ok(upper.z>torso.z,'release must not invert the active arm/torso order');
  }
  // A near-limit planted-body IK cannot erase valid independent gaze/free-hand.
  const peak=sampleG3Performance(movie,plan,42,pack);
  const original=sampleGeneralPlayback(movie,42,pack);
  const free=hand==='right'?'left':'right';
  const wristId='hero-actor.'+free+'-wrist';
  const wrist=(s:typeof original)=>s.frame.markers.find(m=>m.id===wristId)!.point;
  const a=wrist(peak),b=wrist(original);
  assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])>3,
    'an unreachable body pose must not erase independently safe free-hand acting');
  for(const i of [127,0,79,40,64,127])assert.deepEqual(sampleG3Performance(movie,plan,i,pack),scenes[i]);
  const empty=sampleG3Performance(movie,plan,0,pack).frame;
  const original0=sampleGeneralPlayback(movie,0,pack).frame;
  // The G3 ergonomic pass intentionally retargets its active arm at frame 0,
  // without changing any historical baseline or other character component.
  const active=hand;
  for(const s of empty.sprites){
   if(s.id==='hero-actor.'+active+'-upper'||
      s.id==='hero-actor.'+active+'-forearm')continue;
   assert.deepEqual(s,original0.sprites.find(x=>x.id===s.id));
  }
  assert.deepEqual(empty.markers,original0.markers);
  assert.deepEqual(empty.camera,original0.camera);
  assert.equal(empty.jointCaps?.length,4,'joint seam caps are G3-enhanced-only polish');
 });
}
test('G3 performance fail-closed on forged source, stale assets, invalid phase and excess movement',()=>{
 const movie=fixture('right','an'),plan=makePlan(movie);
 const expected={playbackSha256:sha(movie),artSha256:sha(pack)};
 const bad=structuredClone(plan);bad.playbackSha256='0'.repeat(64);
 assert.throws(()=>validateG3Performance(bad,movie,pack,expected),/G3_PERFORMANCE_SOURCE_OR_SCHEMA/);
 const art=structuredClone(plan);art.artSha256='0'.repeat(64);
 assert.throws(()=>validateG3Performance(art,movie,pack,expected),/G3_PERFORMANCE_SOURCE_OR_SCHEMA/);
 const early=structuredClone(plan);early.tracks[0]!.beats[2]!.start=63;
 assert.throws(()=>validateG3Performance(early,movie,pack,expected),/G3_PERFORMANCE_RELEASE_BOUNDARY|G3_PERFORMANCE_BEAT_INVALID/);
 const surge=structuredClone(plan);surge.tracks[0]!.beats[0]!.hipY=500;
 assert.throws(()=>validateG3Performance(surge,movie,pack,expected),/G3_PERFORMANCE_BEAT_INVALID/);
 const unknown=structuredClone(plan);unknown.tracks[0]!.actorId='not-registered';
 assert.throws(()=>validateG3Performance(unknown,movie,pack,expected),/G3_PERFORMANCE_ACTOR_UNKNOWN/);
});
