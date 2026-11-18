/**
 * Independent post-result G3 native media and handoff provenance auditor.
 * Fails closed on missing/stale media, missing source, malformed stills,
 * forged contact bakes or an edited physics/platform without new render.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root} from '../render/server.js';
import {validateGeneralPlaybackAgainstSolver} from '../motion/general-playback-validate.js';
import {generalFilmFrameContract} from '../motion/general-timeline.js';
import {sampleGeneralPlayback} from '../motion/general-playback.js';
import {sampleG3Performance,validateG3Performance} from '../motion/g3-performance.js';
import {auditFrame} from './general-scene-quality.js';
import {auditG3VisualIntent} from './g3-visual-intent.js';
import {auditG3JointCaps} from '../scene/g3-joint-caps.js';
import {auditG3ArmDepth} from '../scene/g3-occlusion.js';
import type {ArtPack} from '../scene/types.js';
const sha=(x:Uint8Array|string)=>createHash('sha256').update(x).digest('hex');
const check=(cmd:string,args:string[])=>{
 const q=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:8*1024*1024});
 if(q.error||q.status!==0)throw Error('G3_INDEPENDENT_DECODE '+cmd+' '+String(q.stderr||q.error));
 return q.stdout;
};
const pack=JSON.parse(await readFile(path.join(root,'assets/lantern-v1/manifest.json'),'utf8')) as ArtPack;
const dir=path.resolve(process.env.G3_REVIEW_DIR??path.join(root,'out/product-first/g3-general-reviews'));
const expected=['g3-an-right-cup','g3-mai-left-lantern'];
const overview=JSON.parse(await readFile(path.join(dir,'g3-overview.json'),'utf8'));
assert.deepEqual(overview.clips.map((x:{id:string})=>x.id),expected);
const verified=[];
for(const id of expected){
 const folder=path.join(dir,id);
 const source=await readFile(path.join(folder,'source-g3-playback.json'));
 const playback=await validateGeneralPlaybackAgainstSolver(JSON.parse(source.toString()),pack);
 const manifest=JSON.parse(await readFile(path.join(folder,'manifest.json'),'utf8'));
 assert.equal(manifest.schemaVersion,'g3-native-motion-physics/1');
 assert.equal(manifest.sourceSha256,sha(source));
 assert.equal(sha(await readFile(path.join(folder,'playback.json'))),sha(source));
 const expectedSource=process.env.SOURCE_HEAD_SHA??process.env.GITHUB_SHA;
 if(expectedSource)assert.equal(manifest.sourceCommit,expectedSource,'G3_MEDIA_SOURCE_STALE');
 assert.equal(manifest.video.file,'g3-motion-physics-1080p.mp4');
 assert.equal(manifest.video.width,1920);
 assert.equal(manifest.video.height,1080);
 assert.equal(manifest.video.fps,24);
 assert.equal(manifest.video.frames,playback.film.frames);
 assert.equal(manifest.video.audio,false);
 assert.equal(manifest.frameHashes.length,playback.film.frames);
 assert.equal(manifest.stateHashes.length,playback.film.frames);
 assert.equal(manifest.releases.length,playback.releases.length);
 for(const [i,r]of playback.releases.entries()){
   assert.equal(manifest.releases[i].frame,r.frame);
   assert.equal(manifest.releases[i].actorId,r.actorId);
   assert.equal(manifest.releases[i].bakeSha256,r.bake.sha256);
   assert.deepEqual(manifest.releases[i].physicalContactFrames,r.bake.contacts);
   assert.ok(r.bake.contacts.length>0);
 }
 const video=await readFile(path.join(folder,manifest.video.file));
 assert.equal(sha(video),manifest.video.sha256);
 const parsed=JSON.parse(check('ffprobe',['-v','error','-count_frames',
   '-show_streams','-show_format','-of','json',path.join(folder,manifest.video.file)])) as {
  streams:Array<{codec_type:string;width:number;height:number;avg_frame_rate:string;nb_read_frames:string}>;
  format:{duration:string};
 };
 assert.equal(parsed.streams.filter(s=>s.codec_type==='video').length,1);
 assert.equal(parsed.streams.filter(s=>s.codec_type==='audio').length,0);
 const stream=parsed.streams.find(s=>s.codec_type==='video');
 assert.equal(stream?.width,1920);assert.equal(stream?.height,1080);
 assert.equal(stream?.avg_frame_rate,'24/1');
 assert.equal(stream?.nb_read_frames,String(playback.film.frames));
 assert.ok(Math.abs(Number(parsed.format.duration)-playback.film.frames/24)<.08);
 check('ffmpeg',['-v','error','-xerror','-nostdin','-threads','1','-i',
   path.join(folder,manifest.video.file),'-f','null','-']);
 const sheet=await readFile(path.join(folder,'contact-sheet.png'));
 assert.equal(sha(sheet),manifest.contactSheet.sha256);
 const keys=Object.keys(manifest.stills as Record<string,string>);
 assert.ok(keys.length>=7);
 for(const file of keys){
   assert.match(file,/^frame-[0-9]{3}\.png$/);
   const n=Number(file.slice(6,9));
   assert.ok(n>=0&&n<playback.film.frames);
   const bytes=await readFile(path.join(folder,file));
   assert.equal(sha(bytes),manifest.stills[file]);
   assert.equal(sha(bytes),manifest.frameHashes[n]);
 }
 for(let f=0;f<playback.film.frames;f++){
   const sample=sampleGeneralPlayback(playback,f,pack);
   const issues=auditFrame(sample.frame,pack,generalFilmFrameContract(playback.film,pack,f,
     playback.releases.filter(r=>f>=r.frame).map(r=>r.actorId)));
   assert.equal(issues.length,0,id+':'+f+':'+JSON.stringify(issues));
   assert.deepEqual(auditG3VisualIntent(playback,f,sample.frame,pack).issues,[],
     id+':'+f+':support state');
 }
 assert.equal(overview.clips.find((x:{id:string})=>x.id===id)?.video.sha256,manifest.video.sha256);
 assert.equal(overview.clips.find((x:{id:string})=>x.id===id)?.sourceSha256,sha(source));
 verified.push({id,frames:playback.film.frames,releaseFrame:playback.releases[0]?.frame,
   contactCount:playback.releases[0]?.bake.contacts.length,sha256:sha(video)});
}
// Separate independent enhanced A/B audit: never inherit baseline PASS just because two new
// MP4s exist. Validate real source bytes, plan, per-frame physics/contact and native output.
const pairs=JSON.parse(await readFile(path.join(dir,'g3-performance-overview.json'),'utf8'));
assert.equal(pairs.schemaVersion,'g3-performance-ab/1');
assert.deepEqual(pairs.pairs.map((x:{baseline:string})=>x.baseline),expected);
for(const pair of pairs.pairs){
 const enhancedDir=path.join(dir,pair.enhanced);
 const baselineDir=path.join(dir,pair.baseline);
 const source=await readFile(path.join(enhancedDir,'source-g3-playback.json'));
 const baselineSource=await readFile(path.join(baselineDir,'source-g3-playback.json'));
 assert.equal(sha(source),sha(baselineSource),'G3_AB_EDITABLE_PLAYBACK_CHANGED');
 const playback=await validateGeneralPlaybackAgainstSolver(JSON.parse(source.toString()),pack);
 const planSource=await readFile(path.join(enhancedDir,'source-g3-performance.json'));
 const plan=validateG3Performance(JSON.parse(planSource.toString()),playback,pack,{
   playbackSha256:sha(JSON.stringify(playback)),artSha256:sha(JSON.stringify(pack))
 });
 const manifest=JSON.parse(await readFile(path.join(enhancedDir,'manifest.json'),'utf8'));
 const original=JSON.parse(await readFile(path.join(baselineDir,'manifest.json'),'utf8'));
 assert.equal(manifest.schemaVersion,'g3-native-motion-physics/1');
 assert.equal(manifest.sourceSha256,sha(source));
 assert.equal(manifest.sourceSha256,original.sourceSha256);
 assert.equal(manifest.video.sha256,pair.enhancedVideoSha256);
 assert.equal(original.video.sha256,pair.baselineVideoSha256);
 assert.equal(pair.playbackSha256,sha(source));
 assert.equal(manifest.performance?.schemaVersion,'g3-performance/1');
 assert.equal(manifest.performance?.sha256,sha(planSource));
 assert.equal(manifest.performance?.sha256,pair.performanceSha256);
 assert.equal(manifest.performance?.playbackSha256,plan.playbackSha256);
 assert.equal(manifest.performance?.artSha256,plan.artSha256);
 assert.equal(sha(await readFile(path.join(enhancedDir,'performance-plan.json'))),sha(planSource));
 const expectedSource=process.env.SOURCE_HEAD_SHA??process.env.GITHUB_SHA;
 if(expectedSource)assert.equal(manifest.sourceCommit,expectedSource,'G3_PERFORMANCE_SOURCE_STALE');
 assert.equal(manifest.video.audio,false);
 assert.equal(manifest.video.frames,playback.film.frames);
 assert.equal(manifest.video.width,1920);
 assert.equal(manifest.video.height,1080);
 assert.equal(manifest.video.fps,24);
 assert.equal(manifest.frameHashes.length,playback.film.frames);
 assert.equal(manifest.stateHashes.length,playback.film.frames);
 const videoPath=path.join(enhancedDir,manifest.video.file);
 assert.equal(sha(await readFile(videoPath)),manifest.video.sha256);
 const profile=JSON.parse(check('ffprobe',['-v','error','-count_frames',
   '-show_streams','-show_format','-of','json',videoPath]));
 const v=profile.streams.find((s:{codec_type:string})=>s.codec_type==='video');
 assert.equal(v?.width,1920);assert.equal(v?.height,1080);
 assert.equal(v?.avg_frame_rate,'24/1');
 assert.equal(v?.nb_read_frames,String(playback.film.frames));
 assert.equal(profile.streams.filter((s:{codec_type:string})=>s.codec_type==='audio').length,0);
 check('ffmpeg',['-v','error','-xerror','-nostdin','-threads','1','-i',videoPath,'-f','null','-']);
 const sheet=await readFile(path.join(enhancedDir,'contact-sheet.png'));
 assert.equal(sha(sheet),manifest.contactSheet.sha256);
 for(const [file,digest] of Object.entries(manifest.stills as Record<string,string>)){
   assert.match(file,/^frame-[0-9]{3}\.png$/);
   const index=Number(file.slice(6,9));
   const data=await readFile(path.join(enhancedDir,file));
   assert.equal(sha(data),digest);
   assert.equal(sha(data),manifest.frameHashes[index]);
 }
 let changed=0,acting=0,compositingOnly=0,backoffs=0;
 for(let frame=0;frame<playback.film.frames;frame++){
   const base=sampleGeneralPlayback(playback,frame,pack);
   const next=sampleG3Performance(playback,plan,frame,pack);
   const artFrame=next.frame;
   const issues=auditFrame(artFrame,pack,generalFilmFrameContract(playback.film,pack,
     frame,playback.releases.filter(r=>frame>=r.frame).map(r=>r.actorId)),
     frame>0?sampleG3Performance(playback,plan,frame-1,pack).frame:undefined,
     {maxSpriteJumpPx:35,maxRotationDeltaDegrees:28,
       maxCameraDeltaPx:10,maxCameraZoomRatio:1.12});
   assert.equal(issues.length,0,pair.enhanced+':'+frame+':'+JSON.stringify(issues));
   assert.deepEqual(auditG3VisualIntent(playback,frame,artFrame,pack).issues,[],
     pair.enhanced+':'+frame+':state/physical support');
   assert.deepEqual(auditG3JointCaps(artFrame,pack,plan.tracks.map(t=>t.actorId)),[],
     pair.enhanced+':'+frame+':joint visual geometry');
   for(const track of playback.film.tracks)
     assert.deepEqual(auditG3ArmDepth(artFrame,track.contact.actor.id,track.contact.hand),[],
       pair.enhanced+':'+frame+':arm depth');
   assert.deepEqual(artFrame.camera,base.frame.camera);
   assert.deepEqual(next.contacts,base.contacts);
   for(const t of playback.film.tracks){
     const propId=t.contact.object.id;
     assert.deepEqual(artFrame.sprites.find(s=>s.id===propId),
       base.frame.sprites.find(s=>s.id===propId),'physics-owned prop changed');
     for(const hand of ['left','right']){
       const sole=t.contact.actor.id+'.'+hand+'-sole';
       assert.deepEqual(artFrame.markers.find(m=>m.id===sole)?.point,
         base.frame.markers.find(m=>m.id===sole)?.point,'sole drift');
     }
   }
   const altered=JSON.stringify(artFrame.sprites)!==JSON.stringify(base.frame.sprites);
   if(altered)changed++;
   if(next.gains.length){
     acting++;
     assert.ok(altered,'G3_ACTING_GAIN_WITHOUT_VISUAL_CHANGE '+frame);
   }else if(altered){
     compositingOnly++;
     const original=new Map(base.frame.sprites.map(s=>[s.id,s]));
     for(const sprite of artFrame.sprites){
       const previous=original.get(sprite.id);
       assert.ok(previous,'G3_UNKNOWN_VISUAL_SOURCE '+sprite.id);
       // Pure layer-only changes cannot move sprites or rewrite their pixels.
       // Native-silhouette recovery is separately allowed only after release.
       const t=playback.film.tracks.find(t=>sprite.id.startsWith(t.contact.actor.id+'.'));
       const released=t&&playback.releases.some(r=>r.actorId===t.contact.actor.id&&frame>=r.frame);
       if(!released)assert.deepEqual({...sprite,z:0},{...previous,z:0},
         'G3_UNDECLARED_GEOMETRY_CHANGE '+frame+':'+sprite.id);
     }
   }
   backoffs+=next.gains.filter(g=>g.applied+1e-4<g.requested).length;
 }
 assert.ok(changed>36,'G3_ENHANCED_VISIBLE_CHANGE_TOO_WEAK '+changed);
 assert.equal(changed,acting+compositingOnly,'G3_FRAME_CHANGE_LEDGER');
 assert.equal(manifest.performance.changedActingFrames,acting,
   'G3_ACTING_BEAT_MANIFEST_MISMATCH');
 assert.equal(manifest.performance.backoffFrames.length,backoffs);
 assert.equal(pair.changedActingFrames,acting);
 verified.push({id:pair.enhanced,frames:playback.film.frames,
   releaseFrame:playback.releases[0]?.frame,
   contactCount:playback.releases[0]?.bake.contacts.length,
   sha256:manifest.video.sha256,changedActingFrames:acting,
   totalChangedFrames:changed,compositingOnlyFrames:compositingOnly,
   backoffFrames:backoffs});
}

const report={schemaVersion:'g3-independent-review/1',status:'PASS_TECHNICAL_PENDING_OWNER_ART',
 source:'real native 1080p24 MP4 + source + per-frame scene QA',cases:verified,
 limitations:['Physical collision proxies are bounded to authored props',
   'Two grasp/lift/release cases do not certify arbitrary films',
   'Artistic review cannot be replaced by SHA, IK or contact tests']};
await writeFile(path.join(dir,'g3-independent-review.json'),JSON.stringify(report,null,2)+'\n');
console.log('G3_INDEPENDENT_NATIVE_VIDEO_PASS '+JSON.stringify(report));
