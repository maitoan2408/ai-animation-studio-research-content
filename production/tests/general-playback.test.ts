import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sampleGeneralFilm,generalFilmFrameContract,type GeneralFilm} from '../src/motion/general-timeline.js';
import {centerOfSprite,sampleGeneralPlayback,type GeneralPlayback} from '../src/motion/general-playback.js';
import {validateGeneralPlayback} from '../src/motion/general-playback-validate.js';
import {bakeGeneralDrop,type GeneralDrop} from '../src/physics/general-drop.js';
import {auditFrame} from '../src/qa/general-scene-quality.js';
import type {ArtPack} from '../src/scene/types.js';
const pack=JSON.parse(readFileSync(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
const asset=(id:string)=>pack.assets.find(a=>a.id===id)!;
async function create(hand:'left'|'right'='right',obj:'props/cup'|'props/lantern-dark'='props/cup',frames=96,release=47){
 const actorX=hand==='right'?800:1280,propX=hand==='right'?900:1180;
 const table=asset('props/workbench'),benchX=hand==='right'?1060:1120;
 const film:GeneralFilm={schemaVersion:'general-film/1',frames,
   tracks:[{contact:{schemaVersion:'general-contact/1',
     actor:{id:'actor-one',model:hand==='right'?'an':'mai',rigId:'production-cutout-1',
       x:actorX,floor:860,facing:1,scale:1},
     object:{id:'item-one',asset:obj,sha256:asset(obj).sha256,
       x:propX,y:631,scale:obj==='props/cup'?.7:.65,anchor:'grip'},
     hand,camera:{x:960,y:540,zoom:1}},
     keys:[{frame:0,dx:0,dy:0,headAngle:0},
       {frame:30,dx:0,dy:-18,headAngle:5},
       {frame:frames-1,dx:0,dy:-18,headAngle:5}]}],
   stage:[{id:'table',asset:table.id,sha256:table.sha256,
      x:benchX,y:860,z:-1,scale:1.2}],
   camera:[{frame:0,x:960,y:540,zoom:1},{frame:frames-1,x:955,y:539,zoom:1.05}],
 };
 const held=sampleGeneralFilm(film,release-1,pack);
 const s=held.frame.sprites.find(s=>s.id==='item-one')!,[x,y]=centerOfSprite(s,pack);
 const physics:GeneralDrop={
   schemaVersion:'general-physics/1',asset:obj,assetSha256:asset(obj).sha256,
   initial:{centerX:x,centerY:y,angleDeg:s.rotation},
   collider:{kind:'box',halfWidthPx:obj==='props/cup'?22:32,
     halfHeightPx:obj==='props/cup'?26:55},
   platform:{left:benchX-table.pivot[0]*1.2,
     right:benchX+(table.width-table.pivot[0])*1.2,
     top:860+(table.anchors.support![1]-table.pivot[1])*1.2},
   initialVelocity:{xPxPerSecond:0,yPxPerSecond:0,angularDegPerSecond:0},
   physics:{massKg:.5,restitution:.04,friction:.8,gravityMps2:9.81},
   frames:frames-release,pixelsPerMeter:200,
 };
 const bake=await bakeGeneralDrop(physics,pack);
 const movie:GeneralPlayback={schemaVersion:'general-playback/1',film,
   releases:[{actorId:'actor-one',frame:release,project:physics,bake}]};
 return {movie,release};
}
test('G3 real right-hand cup release: physical ownership and independent random seek without teleport',async()=>{
 const {movie,release}=await create();
 assert.equal(validateGeneralPlayback(movie,pack),movie);
 const all=Array.from({length:movie.film.frames},(_,i)=>sampleGeneralPlayback(movie,i,pack));
 assert.deepEqual(sampleGeneralPlayback(movie,83,pack),all[83]);
 const before=all[release-1]!,at=all[release]!;
 assert.equal(before.contacts.length,1);
 assert.equal(at.contacts.length,0);
 assert.ok(before.frame.sprites.some(s=>s.id==='actor-one.right-grip-front'));
 assert.ok(!at.frame.sprites.some(s=>s.id==='actor-one.right-grip-front'));
 assert.equal(at.frame.sprites.find(s=>s.id==='actor-one.right-hand')?.asset,'an/hand-open');
 const after=all[Math.min(release+24,all.length-1)]!;
 const atWrist=at.frame.markers.find(m=>m.id==='actor-one.right-wrist')!.point;
 const afterWrist=after.frame.markers.find(m=>m.id==='actor-one.right-wrist')!.point;
 assert.ok(Math.hypot(afterWrist[0]-atWrist[0],afterWrist[1]-atWrist[1])>20,
   'hand must naturally withdraw after prop release, not hover above the cup');
 for(let f=release+1;f<=release+24;f++){
   const a=all[f-1]!.frame.markers.find(m=>m.id==='actor-one.right-wrist')!.point;
   const b=all[f]!.frame.markers.find(m=>m.id==='actor-one.right-wrist')!.point;
   assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<10,'follow-through jumped at '+f);
 }
 const old=before.frame.sprites.find(s=>s.id==='item-one')!;
 const now=at.frame.sprites.find(s=>s.id==='item-one')!;
 assert.ok(Math.hypot(...((): [number,number]=>{
   const a=centerOfSprite(old,pack),b=centerOfSprite(now,pack);return [a[0]-b[0],a[1]-b[1]];
 })())<.001,'release must start exactly at last actual authored prop center');
 for(const [i,s]of all.entries()){
   const issues=auditFrame(s.frame,pack,{frame:i,contacts:s.contacts});
   assert.deepEqual(issues,[],'G3 incorrect actual frame '+i);
 }
 assert.ok(movie.releases[0]!.bake.contacts.length>=1,'Rapier never contacted visible table');
});
test('G3 real left-hand lantern release has correct layer order and no floating fingers',async()=>{
 const {movie,release}=await create('left','props/lantern-dark');
 validateGeneralPlayback(movie,pack);
 const before=sampleGeneralPlayback(movie,release-1,pack),after=sampleGeneralPlayback(movie,release,pack);
 assert.equal(before.contacts[0]?.holderId,'actor-one.left-hand');
 assert.ok(before.frame.sprites.some(s=>s.id==='actor-one.left-grip-front'));
 assert.ok(!after.frame.sprites.some(s=>s.id==='actor-one.left-grip-front'));
 assert.ok(movie.releases[0]!.bake.contacts.length>=1);
 const atWrist=after.frame.markers.find(m=>m.id==='actor-one.left-wrist')!.point;
 const later=sampleGeneralPlayback(movie,release+30,pack);
 const laterWrist=later.frame.markers.find(m=>m.id==='actor-one.left-wrist')!.point;
 assert.ok(Math.hypot(atWrist[0]-laterWrist[0],atWrist[1]-laterWrist[1])>20,
   'left hand must follow through to rest instead of levitating the lamp');
});
test('G3 fail-closed: forged physics receipt, wrong handoff and invisible collision platform',async()=>{
 const {movie}=await create();
 const wrong=structuredClone(movie);
 wrong.releases[0]!.bake.frames[9]!.centerX+=1;
 assert.throws(()=>validateGeneralPlayback(wrong,pack),/GENERAL_PHYSICS_BAKE_HASH/);
 const moved=structuredClone(movie);
 moved.releases[0]!.project.initial.centerX+=5;
 assert.throws(()=>validateGeneralPlayback(moved,pack),/GENERAL_PHYSICS_BAKE_SCHEMA|G3_RELEASE_TELEPORT/);
 const unrealistic=structuredClone(movie);
 unrealistic.releases[0]!.project.collider={kind:'box',halfWidthPx:12,halfHeightPx:5};
 // Re-bake the modified physics project: the receipt must be internally
 // valid, so the dedicated art-vs-collider visual gate is truly exercised.
 unrealistic.releases[0]!.bake=await bakeGeneralDrop(unrealistic.releases[0]!.project,pack);
 assert.throws(()=>validateGeneralPlayback(unrealistic,pack),/G3_COLLIDER_VISUAL_CONTACT_MISMATCH/);
 const hidden=structuredClone(movie);
 hidden.film.stage=[];
 assert.throws(()=>validateGeneralPlayback(hidden,pack),/G3_RELEASE_INVISIBLE_PLATFORM/);
});

test('G1 actual G3 render contracts reject forged sole, shifted fingers and wrong prop identity',async()=>{
 const {movie,release}=await create();
 const held=sampleGeneralPlayback(movie,release-1,pack);
 const heldContract=generalFilmFrameContract(movie.film,pack,release-1);
 assert.deepEqual(auditFrame(held.frame,pack,heldContract),[]);
 const fingers=structuredClone(held.frame);
 fingers.sprites.find(s=>s.id==='actor-one.right-grip-front')!.x+=8;
 assert.ok(auditFrame(fingers,pack,heldContract).some(x=>x.code==='QA_FRONT_CONTACT_MISALIGNED'));
 const after=sampleGeneralPlayback(movie,release+10,pack);
 const releaseContract=generalFilmFrameContract(movie.film,pack,release+10,['actor-one']);
 assert.deepEqual(auditFrame(after.frame,pack,releaseContract),[]);
 const sole=structuredClone(after.frame);
 sole.sprites.find(s=>s.id==='actor-one.left-boot')!.y+=5;
 assert.ok(auditFrame(sole,pack,releaseContract).some(x=>x.code==='QA_GROUND_CONTACT'));
 const wrong=structuredClone(after.frame);
 wrong.sprites.find(s=>s.id==='item-one')!.asset='props/lantern-dark';
 assert.ok(auditFrame(wrong,pack,releaseContract).some(x=>x.code==='QA_ASSET_BINDING_MISMATCH'));
});

test('G3 release source and deterministic physics retime for 120 and 144 native frames',async()=>{
 for(const [hand,object,frames,release] of [
   ['right','props/cup',120,55],
   ['left','props/lantern-dark',144,70],
 ] as const){
   const {movie}=await create(hand,object,frames,release);
   validateGeneralPlayback(movie,pack);
   assert.equal(movie.releases[0]!.bake.frames.length,frames-release);
   const framesInOrder=Array.from({length:frames},(_,i)=>sampleGeneralPlayback(movie,i,pack));
   for(const k of [frames-1,0,release-1,release,release+1,Math.min(release+20,frames-1),frames-1]){
     assert.deepEqual(sampleGeneralPlayback(movie,k,pack),framesInOrder[k],hand+' non-deterministic frame '+k);
   }
   assert.equal(framesInOrder[release-1]!.contacts.length,1);
   assert.equal(framesInOrder[release]!.contacts.length,0);
   for(let i=0;i<frames;i++){
     const contacts=i<release?1:0;
     assert.equal(framesInOrder[i]!.contacts.length,contacts,'retimed grip ownership '+i);
   }
   const bad=structuredClone(movie);bad.releases[0]!.frame=frames-24;
   assert.throws(()=>validateGeneralPlayback(bad,pack),/G3_RELEASE_SCHEMA/);
 }
});

test('G3 native silhouette resting hand stays visibly clear of the actual prop art on both sides and retimes',async()=>{
 const {spriteBounds,spriteBoundsGap}=await import('../src/scene/geometry.js');
 for(const [hand,obj,frames,release] of [
   ['right','props/cup',120,55],
   ['left','props/lantern-dark',144,70],
 ] as const){
   const {movie}=await create(hand,obj,frames,release);
   validateGeneralPlayback(movie,pack);
   const settled=Math.min(frames-1,release+30);
   const rendered=sampleGeneralPlayback(movie,settled,pack,'native-silhouette');
   const handSprite=rendered.frame.sprites.find(s=>s.id==='actor-one.'+hand+'-hand');
   const propSprite=rendered.frame.sprites.find(s=>s.id==='item-one');
   assert.ok(handSprite&&propSprite,'visible hand and native prop must exist');
   assert.ok(spriteBoundsGap(spriteBounds(pack,handSprite),spriteBounds(pack,propSprite))>=6-1e-6,
     'G3 released hand still appears to grip resting '+obj+' at frame '+settled);
   assert.equal(rendered.contacts.length,0,'released prop must not retain ownership');
   assert.deepEqual(sampleGeneralPlayback(movie,settled,pack,'native-silhouette'),rendered,
     'enhanced native resting pose must be deterministic under random seek');
 }
});
