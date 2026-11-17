import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {nativeArt,planNativeDirector,verifyNativePlan,saveNativePlan,
 reopenNativePlan,validateNativeDirector,type NativeDirectorInput} from '../src/director/native-director.js';
import {makeM3Showcase,validateM3} from '../src/motion/character-library.js';
import type {ArtPack} from '../src/scene/types.js';
import type {GeneralFilm} from '../src/motion/general-timeline.js';

function m3(pack:ArtPack):NativeDirectorInput{
 const p=structuredClone(makeM3Showcase(pack,'actor-test','mai'));
 p.clips=[{action:'turn-head',frames:49},{action:'wave',frames:49}];
 delete p.prop;
 return {schemaVersion:'native-director/1',title:'Motion-only story',
  script:'Mai looks into the distance and waves.',
  style:'paper-cut',storyboard:{engine:'m3',project:p}};
}
function g3(pack:ArtPack):NativeDirectorInput{
 const art=(id:string)=>pack.assets.find(a=>a.id===id)!;
 const film:GeneralFilm={schemaVersion:'general-film/1',frames:128,
  tracks:[{contact:{schemaVersion:'general-contact/1',
    actor:{id:'actor-hero',model:'an',rigId:'production-cutout-1',
      x:800,floor:860,facing:1,scale:1},
    object:{id:'hero-prop',asset:'props/cup',
      sha256:art('props/cup').sha256,x:900,y:631,scale:.7,anchor:'grip'},
    hand:'right',camera:{x:960,y:540,zoom:1}},
   keys:[{frame:0,dx:0,dy:0,headAngle:0},
     {frame:23,dx:0,dy:-8,headAngle:-3},
     {frame:48,dx:0,dy:-40,headAngle:7},
     {frame:127,dx:0,dy:-40,headAngle:7}]}],
  camera:[{frame:0,x:960,y:540,zoom:1},{frame:127,x:953,y:538,zoom:1.05}],
  stage:[{id:'bench-stage',asset:'props/workbench',
    sha256:art('props/workbench').sha256,
    x:1060,y:860,z:-1,scale:1.2}]};
 return {schemaVersion:'native-director/1',title:'Cup release',
   script:'An lifts a cup and gently releases it onto the actual workbench.',
   style:'multiplane',storyboard:{engine:'g3',film,
    releases:[{actorId:'actor-hero',frame:64,stageId:'bench-stage',settleFrames:24,
      collider:{kind:'box',halfWidthPx:22},
      physics:{massKg:.45,restitution:.04,friction:.8,gravityMps2:9.81}}]}};
}
test('native Director plans an actual M3 no-prop motion executor',async()=>{
 const {pack,sha256}=await nativeArt(),input=m3(pack);
 const plan=planNativeDirector(input,pack,sha256);
 assert.equal(plan.graph[1]!.skill,'native-m3-chromium');
 assert.equal(verifyNativePlan(plan,pack,sha256).planSha256,plan.planSha256);
 assert.match(plan.planSha256,/^[0-9a-f]{64}$/);
});
test('native Director plans real Rapier before G3 Chromium execution',async()=>{
 const {pack,sha256}=await nativeArt(),input=g3(pack);
 const plan=planNativeDirector(input,pack,sha256);
 assert.deepEqual(plan.graph.map(n=>n.id),['validate','physics','render','verify']);
 assert.equal(plan.graph[1]!.skill,'rapier-bake');
 assert.equal(plan.graph[2]!.skill,'native-g3-chromium');
});
test('reject unknown engine, action, payload injection, camera and stale art',async()=>{
 const {pack,sha256}=await nativeArt();
 const invalid=structuredClone(m3(pack)) as any;
 invalid.storyboard.engine='m2';
 assert.throws(()=>planNativeDirector(invalid,pack,sha256),/CAPABILITY_UNAVAILABLE/);
 const wrong=structuredClone(m3(pack)) as any;
 wrong.storyboard.project.clips[0].action='fly';
 assert.throws(()=>planNativeDirector(wrong,pack,sha256),/M3_ACTION_UNSUPPORTED/);
 const injected=structuredClone(m3(pack)) as any;
 injected.userCode='process.exit(0)';
 assert.throws(()=>planNativeDirector(injected,pack,sha256),/INPUT_INVALID/);
 const tampered=structuredClone(g3(pack)) as any;
 tampered.storyboard.film.camera[1].zoom=Number.NaN;
 assert.throws(()=>planNativeDirector(tampered,pack,sha256),/GENERAL_FILM_KEY_INVALID/);
 const stale=structuredClone(g3(pack)) as any;
 stale.storyboard.film.tracks[0].contact.object.sha256='0'.repeat(64);
 assert.throws(()=>planNativeDirector(stale,pack,sha256),/GENERAL_PROP_ANCHOR_OR_HASH/);
});
test('reject stale plan digest, duplicate release, unsupported stage, invalid physics',async()=>{
 const {pack,sha256}=await nativeArt();
 const plan=planNativeDirector(m3(pack),pack,sha256);
 const forged=structuredClone(plan);
 forged.graph[1]!.skill='fabricate-video';
 assert.throws(()=>verifyNativePlan(forged,pack,sha256),/STALE_PLAN/);
 const mutated=structuredClone(g3(pack)) as any;
 mutated.storyboard.releases.push(structuredClone(mutated.storyboard.releases[0]));
 assert.throws(()=>planNativeDirector(mutated,pack,sha256),/DUPLICATE_RELEASE/);
 const stage=structuredClone(g3(pack)) as any;
 stage.storyboard.releases[0].stageId='invisible';
 assert.throws(()=>planNativeDirector(stage,pack,sha256),/RELEASE_UNSUPPORTED/);
 const bad=structuredClone(g3(pack)) as any;
 bad.storyboard.releases[0].physics.gravityMps2=-1;
 assert.throws(()=>planNativeDirector(bad,pack,sha256),/RELEASE_UNSUPPORTED/);
});
test('immutable save/reopen supports editor changes as distinct revisions and rejects tampering',async()=>{
 const {pack,sha256}=await nativeArt(),dir=await mkdtemp(path.join(os.tmpdir(),'native-dir-'));
 try{
   const plan=planNativeDirector(m3(pack),pack,sha256);
   const file=await saveNativePlan(plan,dir,pack,sha256);
   const again=await saveNativePlan(plan,dir,pack,sha256);
   assert.equal(file,again);
   assert.equal((await reopenNativePlan(file,pack,sha256)).planSha256,plan.planSha256);
   const next=structuredClone(m3(pack));
   next.script+=' She pauses.';
   const nextPlan=planNativeDirector(next,pack,sha256);
   const nextFile=await saveNativePlan(nextPlan,dir,pack,sha256);
   assert.notEqual(nextFile,file);
   assert.equal((await reopenNativePlan(file,pack,sha256)).planSha256,plan.planSha256);
   await writeFile(file,(await readFile(file,'utf8')).replace('Motion-only story','Wrong story'));
   await assert.rejects(reopenNativePlan(file,pack,sha256),/STALE_PLAN/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('native storyboard explicitly stages supported props on real SHA-bound table art',async()=>{
 const {pack,sha256}=await nativeArt(),cup=pack.assets.find(a=>a.id==='props/cup')!,
  table=pack.assets.find(a=>a.id==='props/workbench')!;
 const input=m3(pack);
 if(input.storyboard.engine!=='m3')throw Error('M3 expected');
 const project=input.storyboard.project;
 project.character.xStart=840;
 project.character.capabilities=['turn-head','pick-place'];
 project.clips=[{action:'turn-head',frames:49},{action:'pick-place',frames:73}];
 project.prop={id:'desk-cup',asset:'props/cup',sha256:cup.sha256,
  x:720,y:631,scale:.7,hand:'left'};
 project.stage={id:'workbench-left',asset:'props/workbench',
  sha256:table.sha256,x:620,y:860,z:-1,scale:1.2};
 const plan=planNativeDirector(input,pack,sha256);
 assert.equal(plan.input.storyboard.engine,'m3');
 const moved=structuredClone(input);
 if(moved.storyboard.engine!=='m3')throw Error('M3 expected');
 moved.storyboard.project.stage!.x=1050;
 assert.throws(()=>planNativeDirector(moved,pack,sha256),/M3_STAGE_VISIBLE_SUPPORT_MISMATCH/);
 const underground=structuredClone(input);
 if(underground.storyboard.engine!=='m3')throw Error('M3 expected');
 underground.storyboard.project.prop!.y+=40;
 assert.throws(()=>planNativeDirector(underground,pack,sha256),/M3_STAGE_VISIBLE_SUPPORT_MISMATCH/);
 const spoof=structuredClone(input);
 if(spoof.storyboard.engine!=='m3')throw Error('M3 expected');
 spoof.storyboard.project.stage!.sha256='0'.repeat(64);
 assert.throws(()=>planNativeDirector(spoof,pack,sha256),/M3_STAGE_ART_STALE/);
 const legacy=structuredClone(input);
 if(legacy.storyboard.engine!=='m3')throw Error('M3 expected');
 delete legacy.storyboard.project.stage;
 assert.equal(validateM3(legacy.storyboard.project,pack).schemaVersion,'character-motion/1');
 assert.throws(()=>planNativeDirector(legacy,pack,sha256),/NATIVE_DIRECTOR_VISIBLE_STAGE_REQUIRED/);
});
