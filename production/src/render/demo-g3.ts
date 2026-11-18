/**
 * Native G3 acceptance fixtures are generated from different declarative
 * actors/hands/props. Both stages use explicit actual workbench art geometry.
 * First 64 authored frames preserve grip; after release the Rapier bake owns
 * the prop until the final frame. No output is hand-painted or staged offline.
 */
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {root} from './server.js';
import {sampleGeneralFilm,validateGeneralFilm,type GeneralFilm} from '../motion/general-timeline.js';
import {centerOfSprite,type GeneralPlayback} from '../motion/general-playback.js';
import {validateG3Performance,type G3PerformancePlan} from '../motion/g3-performance.js';
import {validateGeneralPlayback} from '../motion/general-playback-validate.js';
import {bakeGeneralDrop,type GeneralDrop} from '../physics/general-drop.js';
import type {ArtPack} from '../scene/types.js';

const pack=JSON.parse(await readFile(path.join(root,'assets/lantern-v1/manifest.json'),'utf8')) as ArtPack;
const art=(id:string)=>{const item=pack.assets.find(a=>a.id===id);if(!item)throw Error('G3_DEMO_ART_MISSING '+id);return item;};
const out=path.resolve(process.env.G3_REVIEW_DIR??path.join(root,'out/product-first/g3-general-reviews'));
await mkdir(out,{recursive:true});
type Scenario={id:string;model:string;hand:'left'|'right';rootX:number;objectX:number;
 prop:'props/cup'|'props/lantern-dark';scale:number;objectLift:number;benchX:number};
const scenarios:Scenario[]=[
 {id:'g3-an-right-cup',model:'an',hand:'right',rootX:800,objectX:900,
  prop:'props/cup',scale:.7,objectLift:40,benchX:1060},
 {id:'g3-mai-left-lantern',model:'mai',hand:'left',rootX:1280,objectX:1180,
  prop:'props/lantern-dark',scale:.65,objectLift:26,benchX:1120},
];
const receipt=[];
const pairs=[];
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
for(const scenario of scenarios){
 const duration=128,releaseFrame=64,table=art('props/workbench');
 const top=860+(table.anchors.support![1]-table.pivot[1])*1.2;
 const stage={id:'bench-stage',asset:table.id,sha256:table.sha256,
   x:scenario.benchX,y:860,z:-1,scale:1.2};
 const film:GeneralFilm={
  schemaVersion:'general-film/1',frames:duration,
  tracks:[{contact:{
    schemaVersion:'general-contact/1',
    actor:{id:'actor-hero',model:scenario.model,rigId:'production-cutout-1',
      x:scenario.rootX,floor:860,facing:1,scale:1},
    object:{id:'hero-prop',asset:scenario.prop,sha256:art(scenario.prop).sha256,
      x:scenario.objectX,y:631,scale:scenario.scale,anchor:'grip'},
    hand:scenario.hand,camera:{x:960,y:540,zoom:1}},
    keys:[{frame:0,dx:0,dy:0,headAngle:0},
      {frame:23,dx:0,dy:-8,headAngle:-3},
      {frame:48,dx:0,dy:-scenario.objectLift,headAngle:7},
      {frame:duration-1,dx:0,dy:-scenario.objectLift,headAngle:7}]}],
  stage:[stage],
  camera:[{frame:0,x:960,y:540,zoom:1},
    {frame:duration-1,x:953,y:538,zoom:1.05}],
 };
 validateGeneralFilm(film,pack);
 const held=sampleGeneralFilm(film,releaseFrame-1,pack);
 const prop=held.frame.sprites.find(s=>s.id==='hero-prop')!;
 const [cx,cy]=centerOfSprite(prop,pack);
 const p:GeneralDrop={
  schemaVersion:'general-physics/1',asset:scenario.prop,
  assetSha256:art(scenario.prop).sha256,
  initial:{centerX:cx,centerY:cy,angleDeg:prop.rotation},
  collider:{kind:'box',halfWidthPx:scenario.prop==='props/cup'?22:32,
    halfHeightPx:scenario.prop==='props/cup'?26:55},
  platform:{left:stage.x-table.pivot[0]*stage.scale,
    right:stage.x+(table.width-table.pivot[0])*stage.scale,top},
  initialVelocity:{xPxPerSecond:0,yPxPerSecond:0,angularDegPerSecond:0},
  physics:{massKg:scenario.prop==='props/cup'?.45:.8,restitution:.04,
    friction:.8,gravityMps2:9.81},
  frames:duration-releaseFrame,pixelsPerMeter:200,
 };
 const bake=await bakeGeneralDrop(p,pack);
 if(!bake.contacts.length)throw Error('G3_NO_REAL_PLATFORM_CONTACT '+scenario.id);
 const playback:GeneralPlayback={schemaVersion:'general-playback/1',film,
   releases:[{actorId:'actor-hero',frame:releaseFrame,settleFrames:24,project:p,bake}]};
 validateGeneralPlayback(playback,pack);
 const dir=path.join(out,scenario.id);
 await mkdir(dir,{recursive:true});
 const source=path.join(dir,'source-g3-playback.json'),data=JSON.stringify(playback,null,2)+'\n';
 await writeFile(source,data);
 const child=spawn(process.execPath,['--import','tsx',path.join(root,'src/render/render-g3.ts')],{
  cwd:root,env:{...process.env,G3_PLAYBACK_FILE:source,G3_OUTPUT_DIR:dir,
    HYPERFRAMES_NO_TELEMETRY:'1'},stdio:'inherit',
 });
 const [exit]=await once(child,'close');
 if(exit!==0)throw Error('G3_ACTUAL_NATIVE_RENDER_FAILED '+scenario.id+' '+exit);
 const manifest=JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8'));
 receipt.push({id:scenario.id,actor:scenario.model,hand:scenario.hand,
  prop:scenario.prop,releaseFrame,frames:duration,contacts:bake.contacts,
  sourceSha256:createHash('sha256').update(data).digest('hex'),
  video:manifest.video});
 // Same editable playback, actor, prop, release, locked art, camera and Rapier
 // recipe in both A/B films. Only this separately versioned performance data changes.
 const performance:G3PerformancePlan={schemaVersion:'g3-performance/1',
   playbackSha256:hash(JSON.stringify(playback)),artSha256:hash(JSON.stringify(pack)),
   tracks:[{actorId:'actor-hero',beats:[
     {kind:'prepare',start:0,peak:11,end:23,torsoDeg:-2.7,hipX:-3.5,hipY:3,
       headDeg:4,freeHandDx:-9,freeHandDy:-3},
     {kind:'act',start:23,peak:43,end:63,torsoDeg:3.5,hipX:4,hipY:-3.5,
       headDeg:-4,freeHandDx:11,freeHandDy:3},
     {kind:'recover',start:64,peak:79,end:112,torsoDeg:-3,hipX:-3.5,hipY:2.5,
       headDeg:4.5,freeHandDx:-10,freeHandDy:-4}
   ]}]};
 validateG3Performance(performance,playback,pack,{
   playbackSha256:performance.playbackSha256,artSha256:performance.artSha256});
 const enhancedId=scenario.id+'-enhanced',enhancedDir=path.join(out,enhancedId);
 await mkdir(enhancedDir,{recursive:true});
 const enhancedSource=path.join(enhancedDir,'source-g3-playback.json');
 const performanceSource=path.join(enhancedDir,'source-g3-performance.json');
 const performanceBytes=JSON.stringify(performance,null,2)+'\n';
 await writeFile(enhancedSource,data);
 await writeFile(performanceSource,performanceBytes);
 const enhanced=spawn(process.execPath,['--import','tsx',path.join(root,'src/render/render-g3.ts')],{
   cwd:root,env:{...process.env,G3_PLAYBACK_FILE:enhancedSource,
     G3_PERFORMANCE_FILE:performanceSource,G3_OUTPUT_DIR:enhancedDir,
     HYPERFRAMES_NO_TELEMETRY:'1'},stdio:'inherit',
 });
 const [enhancedExit]=await once(enhanced,'close');
 if(enhancedExit!==0)throw Error('G3_ENHANCED_NATIVE_RENDER_FAILED '+scenario.id+' '+enhancedExit);
 const enhancedManifest=JSON.parse(await readFile(path.join(enhancedDir,'manifest.json'),'utf8'));
 if(enhancedManifest.sourceSha256!==manifest.sourceSha256)
   throw Error('G3_AB_PLAYBACK_SOURCE_DIVERGENCE');
 if(!enhancedManifest.performance||
    enhancedManifest.performance.sha256!==hash(performanceBytes))
   throw Error('G3_AB_PERFORMANCE_SOURCE_MISSING');
 pairs.push({baseline:scenario.id,enhanced:enhancedId,
   actor:scenario.model,hand:scenario.hand,prop:scenario.prop,
   playbackSha256:hash(data),performanceSha256:hash(performanceBytes),
   baselineVideoSha256:manifest.video.sha256,
   enhancedVideoSha256:enhancedManifest.video.sha256,
   changedActingFrames:enhancedManifest.performance.changedActingFrames,
   backoffCount:enhancedManifest.performance.backoffFrames.length});
}
await writeFile(path.join(out,'g3-performance-overview.json'),JSON.stringify({
 schemaVersion:'g3-performance-ab/1',status:'AWAITING_INDEPENDENT_AFTER_RENDER_AUDIT',
 sourceCommit:process.env.SOURCE_HEAD_SHA??process.env.GITHUB_SHA??'LOCAL',
 pairs,limitations:['Technical performance changes do not equal artistic approval',
  'Every physical bake and authored held prop is the same in paired films',
  'Actual 1x/0.5x film playback and owner aesthetic judgment remain required']
},null,2)+'\n');
await writeFile(path.join(out,'g3-overview.json'),JSON.stringify({
 schemaVersion:'g3-native-review/1',status:'READY_FOR_OWNER_VISUAL_REVIEW',
 frames:receipt.reduce((a,c)=>a+c.frames,0),clips:receipt,
 limitations:['2 supported planted-foot grasp/release interactions, not all actions',
  'Collision boxes are bounded proxies, not deformable cloth, hair or accurate fingers',
  'Technical evidence is not owner artistic acceptance']},null,2)+'\n');
console.log('G3_BOTH_DIFFERENT_NATIVE_FILMS_PASS '+JSON.stringify({cases:receipt.map(r=>r.id),out}));
