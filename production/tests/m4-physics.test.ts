import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {makeM3Showcase,sampleM3,m3TotalFrames,validateM3} from '../src/motion/character-library.js';
import {bakeM4,sampleM4Bake,validateM4Bake,validateM4Project,m4Recipe,type PhysicsProject} from '../src/physics/m4.js';
import {sampleM4Scene} from '../src/physics/m4-adapter.js';
import type {ArtPack} from '../src/scene/types.js';

const pack=JSON.parse(readFileSync(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
const digest=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function example(variant:'tip'|'slide'='tip'):PhysicsProject{
 const motion=makeM3Showcase(pack,'guest-m4-'+variant,'an');
 motion.clips=[{action:'pick-place',frames:73}];
 motion.character.xStart=840;
 if(variant==='slide')motion.prop!.x=975;
 validateM3(motion,pack);
 return {
  schemaVersion:'physics-m4/1',motion,tailFrames:96,gravityMps2:9.81,
  prop:{id:motion.prop!.id,pixelsPerMeter:200,massKg:variant==='tip'?.6:.9,
    halfExtentsM:[.15,.13],linearDamping:.1,angularDamping:.65,
    friction:variant==='tip'?.02:.03,restitution:variant==='tip'?.2:.55,
    floorStageY:632,velocityStagePxPerSecond:variant==='tip'?[95,-30]:[-110,-50],
    angularVelocityDegPerSecond:variant==='tip'?40:-55},
 };
}
const project=example(),other=example('slide');
let baked:Awaited<ReturnType<typeof bakeM4>>;
test('M4 real Rapier bake: two parametrized interactions, 240Hz deterministic and arbitrary replay',async()=>{
 const a=await bakeM4(project,pack),b=await bakeM4(project,pack);
 baked=a;
 assert.equal(a.bakeSha256,b.bakeSha256);
 assert.deepEqual(a.frames,b.frames);
 assert.deepEqual(a.recipe,m4Recipe(project));
 assert.equal(a.recipe.hz,240);
 assert.equal(a.recipe.substeps,10);
 assert.ok(a.frames.every(x=>x.frame<a.releaseFrame||(x.centerX>885&&x.centerX<1235)),
   'default physics never leaves the authored finite bench platform');
 assert.equal(a.frames.length,169);
 assert.equal(a.frames[a.releaseFrame]!.owner,'physics');
 assert.ok(a.releaseFrame>20);
 assert.ok(a.events.some(e=>e.kind==='release'));
 const gripFrame=a.events.find(e=>e.kind==='grip')!.frame;
 assert.ok(gripFrame<a.releaseFrame-1,'grip event must mark attachment onset, not the final held frame');
 assert.equal(sampleM3(project.motion,gripFrame-1,pack).contact.grip,false);
 assert.equal(sampleM3(project.motion,gripFrame,pack).contact.grip,true);
 assert.equal(sampleM3(project.motion,a.releaseFrame-1,pack).contact.grip,true);
 assert.equal(sampleM3(project.motion,a.releaseFrame,pack).contact.grip,false);
 assert.ok(a.events.some(e=>e.kind==='platform-contact'),'real solver contact event required');
 const before=sampleM3(project.motion,a.releaseFrame,pack).frame.sprites.find(x=>x.id===project.prop.id)!;
 const start=sampleM4Scene({project,bake:a,enabled:true},a.releaseFrame,pack).sprites.find(x=>x.id===project.prop.id)!;
 assert.ok(Math.hypot(start.x-before.x,start.y-before.y)<1e-8,'handoff must not teleport');
 const order=[150,20,100,0,150];
 const seek=order.map(f=>sampleM4Bake(a,f));
 assert.deepEqual(seek[0],seek[4]);
 const live=new Set(a.frames.slice(a.releaseFrame+1).map(f=>f.centerX.toFixed(4)+'/'+f.centerY.toFixed(4)));
 assert.ok(live.size>30,'physics must genuinely move prop: distinct='+live.size);
 const off=sampleM4Scene({project,bake:a,enabled:false},150,pack);
 const on=sampleM4Scene({project,bake:a,enabled:true},150,pack);
 assert.deepEqual(off.camera,on.camera);
 assert.deepEqual(off.sprites.filter(s=>s.id!==project.prop.id),on.sprites.filter(s=>s.id!==project.prop.id));
 assert.notDeepEqual(off.sprites.find(s=>s.id===project.prop.id),on.sprites.find(s=>s.id===project.prop.id));
 const otherBake=await bakeM4(other,pack);
 assert.notEqual(otherBake.bakeSha256,a.bakeSha256);
 assert.ok(otherBake.events.some(e=>e.kind==='platform-contact'));
 assert.equal(sampleM4Bake(otherBake,150).frame,150);
});
test('M4 fail-closed contracts: stale input/art/toolchain, invalid ownership, frame, nonfinite, duplicate/missing contact',async()=>{
 const a=baked??await bakeM4(project,pack);
 assert.throws(()=>sampleM4Bake(structuredClone(a),30),/M4_BAKE_UNVALIDATED/);
 assert.throws(()=>sampleM4Bake(a,-1),/M4_FRAME_OUT_OF_RANGE/);
 assert.throws(()=>sampleM4Bake(a,999),/M4_FRAME_OUT_OF_RANGE/);
 const changed=structuredClone(project);changed.prop.massKg+=.1;
 assert.throws(()=>validateM4Bake(a,changed,pack),/M4_BAKE_INPUT_OR_ART_STALE/);
 const art=structuredClone(pack);art.version='changed';
 assert.throws(()=>validateM4Bake(a,project,art),/M3_CHARACTER_RIG_OR_CAPABILITIES|M4_BAKE_INPUT_OR_ART_STALE/);
 const drift=structuredClone(a);drift.recipe.implementationSha256='0'.repeat(64);
 assert.throws(()=>validateM4Bake(drift,project,pack),/M4_BAKE_RECIPE_OR_IMPLEMENTATION_STALE/);
 const tampered=structuredClone(a);tampered.frames[150]!.centerY+=1;
 assert.throws(()=>validateM4Bake(tampered,project,pack),/M4_BAKE_SHA_MISMATCH/);
 const owner=structuredClone(a);owner.frames[a.releaseFrame]!.owner='authored';
 assert.throws(()=>validateM4Bake(owner,project,pack),/M4_BAKE_FRAME_INVALID/);
 const noEvents=structuredClone(a);noEvents.events=[];
 assert.throws(()=>validateM4Bake(noEvents,project,pack),/M4_BAKE_EVENTS/);
 const wrongGrip=structuredClone(a);wrongGrip.events.find(e=>e.kind==='grip')!.frame=a.releaseFrame-1;
 assert.throws(()=>validateM4Bake(wrongGrip,project,pack),/M4_BAKE_EVENTS/);
 const bad=structuredClone(project);bad.prop.massKg=NaN;
 assert.throws(()=>validateM4Project(bad,pack),/M4_PHYSICS_PARAMETERS/);
 const tim=structuredClone(project);tim.prop.floorStageY=400;
 assert.throws(()=>validateM4Project(tim,pack),/M4_PLATFORM_INITIAL_PENETRATION/);
 const wrong=structuredClone(project);wrong.motion.clips=[{action:'wave',frames:49}];wrong.motion.prop=undefined;
 assert.throws(()=>validateM4Project(wrong,pack),/M4_PROP_CONTACT_UNSUPPORTED/);
 const fake=structuredClone(a);fake.bakeSha256='0'.repeat(64);
 assert.throws(()=>validateM4Bake(fake,project,pack),/M4_BAKE_SHA_MISMATCH/);
 const wrongEngine=structuredClone(a);
 (wrongEngine.recipe as unknown as {engine:string}).engine='unknown-engine';
 assert.throws(()=>validateM4Bake(wrongEngine,project,pack),/M4_RECIPE_INVALID/);
 const wrongStep=structuredClone(a);
 (wrongStep.recipe as unknown as {hz:number}).hz=120;
 assert.throws(()=>validateM4Bake(wrongStep,project,pack),/M4_RECIPE_INVALID/);
 const negativeCollider=structuredClone(project);negativeCollider.prop.halfExtentsM=[-.1,.13];
 assert.throws(()=>validateM4Project(negativeCollider,pack),/M4_PHYSICS_PARAMETERS/);
 const duplicate=structuredClone(project);
 duplicate.motion.prop!.id=duplicate.motion.character.id;
 duplicate.prop.id=duplicate.motion.character.id;
 assert.throws(()=>validateM4Project(duplicate,pack),/M3_PROP_INVALID/);
 const badSchema=structuredClone(project);
 (badSchema as unknown as {schemaVersion:string}).schemaVersion='physics-m4/2';
 assert.throws(()=>validateM4Project(badSchema,pack),/M4_PROJECT_SCHEMA/);
 // Regression reproduction: a supported fast release must not keep contact
 // with an invisible 8000px plane beyond the 422.4px authored bench artwork.
 const runaway=structuredClone(project);
 runaway.tailFrames=240;
 runaway.prop.velocityStagePxPerSecond=[500,0];
 runaway.prop.linearDamping=0;
 runaway.prop.friction=0;
 await assert.rejects(bakeM4(runaway,pack),/M4_PLATFORM_EDGE_UNSUPPORTED/);
 // A collision height that visually differs from the table's declared support
 // anchor (at 630.8 stage pixels) must fail even if the cup does not overlap it.
 const artMismatch=structuredClone(project);
 artMismatch.prop.floorStageY=645;
 assert.throws(()=>validateM4Project(artMismatch,pack),/M4_PLATFORM_ART_MISMATCH/);
 const recovered=await bakeM4(project,pack);
 assert.equal(recovered.bakeSha256,a.bakeSha256,
   'a rejected request must not contaminate a later valid simulation');
});
