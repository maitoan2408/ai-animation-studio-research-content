/** Independent second-pass audit AFTER genuine M4 films exist.
 * Does not trust producer PASS flags, manifest hashes alone, or stale receipts.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {root} from '../render/server.js';
import {bakeM4,validateM4Bake,validateM4Project,sampleM4Bake,m4PlatformGeometry,type PhysicsBake,type PhysicsProject} from '../physics/m4.js';
import {sampleM4Scene} from '../physics/m4-adapter.js';
import {sampleM3} from '../motion/character-library.js';
import {m4ReviewFrames} from '../render/m4-review-frames.js';
import type {ArtPack} from '../scene/types.js';
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const exec=(tool:string,args:string[])=>{
 const p=spawnSync(tool,args,{encoding:'utf8',maxBuffer:16*1024*1024});
 if(p.error||p.status!==0)throw Error('M4_POST_RESULT_'+tool+' '+String(p.stderr||p.error));
 return p.stdout;
};
const dir=path.resolve(process.env.M4_OUTPUT_DIR??path.join(root,'out/product-first/m4'));
const reportPath=path.join(dir,'m4-post-result-audit.json');
const publish=async(report:unknown)=>{
 const temp=reportPath+'.'+process.pid+'.tmp';
 await writeFile(temp,JSON.stringify(report,null,2)+'\n');await rename(temp,reportPath);
};
try{
const pack=JSON.parse(await readFile(path.join(root,'assets/lantern-v1/manifest.json'),'utf8')) as ArtPack;
const manifest=JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8')) as {
 milestone:string;sourceCommit:string;
 project:{file:string;sha256:string};bake:{file:string;sha256:string;receipt:string};
 videos:Record<string,{name:string;sha256:string;frameHashes:string[];stateHashes:string[];
   nativeStills:Record<string,string>;video:{width:number;height:number;fps:number;frames:number;audio:boolean}}>;
 comparison:{file:string;sha256:string;frame:number};
 dimensions:{width:number;height:number;fps:number;count:number};
};
assert.equal(manifest.milestone,'M4');
assert.match(manifest.sourceCommit,/^[a-f0-9]{40}$/,'M4_SOURCE_COMMIT');
const expectedSource=process.env.SOURCE_HEAD_SHA||process.env.GITHUB_SHA;
if(expectedSource)assert.equal(manifest.sourceCommit,expectedSource,'M4_SOURCE_COMMIT_STALE');
const checkFile=async(file:string,want:string)=>{
 assert.equal(path.basename(file),file,'M4_DELIVERY_PATH');
 assert.match(want,/^[a-f0-9]{64}$/,'M4_DELIVERY_HASH_SCHEMA');
 assert.equal(sha(await readFile(path.join(dir,file))),want,'M4_DELIVERY_HASH '+file);
};
await checkFile(manifest.project.file,manifest.project.sha256);
await checkFile(manifest.bake.file,manifest.bake.sha256);
const project=validateM4Project(JSON.parse(await readFile(path.join(dir,manifest.project.file),'utf8')),pack) as PhysicsProject;
const bake=validateM4Bake(JSON.parse(await readFile(path.join(dir,manifest.bake.file),'utf8')),project,pack) as PhysicsBake;
assert.equal(bake.bakeSha256,manifest.bake.receipt);
// Re-run the real solver in this separate process; a rehashed invented
// trajectory or contact timestamp must not pass as physical evidence.
assert.deepEqual(bake,await bakeM4(project,pack),'M4_RECOMPUTED_BAKE_MISMATCH');
const {selected,seek,focus}=m4ReviewFrames(bake.frames.length,bake.releaseFrame);
assert.deepEqual(manifest.dimensions,{width:1920,height:1080,fps:24,count:bake.frames.length});
assert.equal(manifest.comparison.frame,focus);
assert.equal(bake.frames.length,manifest.dimensions.count);
const actualGripStart=Array.from({length:bake.releaseFrame},(_,i)=>i)
  .find(frame=>sampleM3(project.motion,frame,pack).contact.grip);
assert.ok(actualGripStart!==undefined,'M4_NO_AUTHORED_GRIP_ONSET');
assert.equal(bake.events.find(e=>e.kind==='grip')?.frame,actualGripStart,
  'M4_GRIP_EVENT_NOT_ACTUAL_ATTACHMENT_ONSET');
assert.equal(sampleM3(project.motion,bake.releaseFrame-1,pack).contact.grip,true);
assert.equal(sampleM3(project.motion,bake.releaseFrame,pack).contact.grip,false);
const platform=m4PlatformGeometry(project.motion,pack,bake.releaseFrame);
assert.ok(platform.rightStageX-platform.leftStageX<500,
 'M4_INVISIBLE_PLATFORM_OVERSIZED');
assert.ok(Math.abs(platform.supportStageY-project.prop.floorStageY)<=2,
 'M4_PLATFORM_VISUAL_SURFACE_MISMATCH');
const metrics={gripOnsetFrame:actualGripStart,releaseFrame:bake.releaseFrame,
  maxGripErrorStagePixels:0,gripSamples:0,maxHandoffJumpStagePixels:0,
  maxColliderPenetrationM:0,platformContactEvents:0,visualComparisonPixelDifference:false,
  repeatedSeekChecksum:'',replayedFrames:0};
for(let f=0;f<bake.frames.length;f++){
 const off=sampleM4Scene({project,bake,enabled:false},f,pack);
 const on=sampleM4Scene({project,bake,enabled:true},f,pack);
 assert.deepEqual(off.camera,on.camera);
 assert.deepEqual(off.sprites.filter(s=>s.id!==project.prop.id),
   on.sprites.filter(s=>s.id!==project.prop.id),'M4_AUTHORED_TRANSFORM_CHANGED f='+f);
 if(f<bake.releaseFrame)assert.deepEqual(off,on,'M4_AUTHOR_MUST_OWN_BEFORE_RELEASE '+f);
 if(f<project.motion.clips.reduce((a,c)=>a+c.frames,0)){
   const sample=sampleM3(project.motion,f,pack);
   if(sample.contact.grip){
     assert.ok(sample.contact.gripError!==null);
     metrics.maxGripErrorStagePixels=Math.max(metrics.maxGripErrorStagePixels,sample.contact.gripError!);
     metrics.gripSamples++;
   }
 }
 if(f===bake.releaseFrame){
   const propOff=off.sprites.find(s=>s.id===project.prop.id)!;
   const propOn=on.sprites.find(s=>s.id===project.prop.id)!;
   metrics.maxHandoffJumpStagePixels=Math.hypot(propOff.x-propOn.x,propOff.y-propOn.y);
 }
 if(f>=bake.releaseFrame){
   const sample=sampleM4Bake(bake,f);
   const radius=Math.hypot(...project.prop.halfExtentsM)*project.prop.pixelsPerMeter;
   assert.ok(sample.centerX-radius>=platform.leftStageX-1e-6 &&
     sample.centerX+radius<=platform.rightStageX+1e-6,
     'M4_PLATFORM_ART_EDGE_COLLISION f='+f);
   const theta=sample.rotationDeg*Math.PI/180;
   const hw=project.prop.halfExtentsM[0],hh=project.prop.halfExtentsM[1];
   const halfY=(Math.abs(Math.sin(theta))*hw+Math.abs(Math.cos(theta))*hh)*200;
   const penetration=Math.max(0,(sample.centerY+halfY-project.prop.floorStageY)/200);
   metrics.maxColliderPenetrationM=Math.max(metrics.maxColliderPenetrationM,penetration);
 }
 metrics.replayedFrames++;
}
assert.ok(metrics.gripSamples>=20);
assert.ok(metrics.maxGripErrorStagePixels<=.001);
assert.ok(metrics.maxHandoffJumpStagePixels<=.000001);
const penetrationContract=bake.recipe.contactSkinM;
assert.ok(metrics.maxColliderPenetrationM<=penetrationContract,
  'M4_COLLIDER_PENETRATION '+metrics.maxColliderPenetrationM+
  ' > declared collision skin '+penetrationContract);
metrics.platformContactEvents=bake.events.filter(e=>e.kind==='platform-contact').length;
assert.equal(metrics.platformContactEvents,1,'M4_PHYSICAL_COLLISION_NOT_OBSERVED');
const repeated=seek.map(f=>sampleM4Bake(bake,f));
assert.deepEqual(repeated[0],repeated[4]);
metrics.repeatedSeekChecksum=sha(JSON.stringify(repeated));
for(const mode of ['off','on']){
 const entry=manifest.videos[mode]!;
 assert.ok(entry&&entry.frameHashes.length===bake.frames.length);
 assert.equal(entry.stateHashes.length,bake.frames.length);
 for(const hash of [...entry.frameHashes,...entry.stateHashes])assert.match(hash,/^[a-f0-9]{64}$/);
 await checkFile(entry.name,entry.sha256);
 const expectedStills=[...selected.map(f=>'m4-'+mode+'-frame-'+String(f).padStart(3,'0')+'.png'),
   'm4-'+mode+'-contact-sheet.png'];
 assert.deepEqual(Object.keys(entry.nativeStills).sort(),expectedStills.sort(),'M4_NATIVE_STILLS_MISSING');
 for(const f of selected)assert.equal(entry.nativeStills['m4-'+mode+'-frame-'+String(f).padStart(3,'0')+'.png'],
   entry.frameHashes[f],'M4_NATIVE_FRAME_BINDING');
 for(const [file,hash] of Object.entries(entry.nativeStills))await checkFile(file,hash);
 assert.deepEqual(entry.video,{width:1920,height:1080,fps:24,frames:bake.frames.length,audio:false});
 const meta=JSON.parse(exec('ffprobe',['-v','error','-count_frames','-show_streams',
   '-of','json',path.join(dir,entry.name)])) as {
 streams:Array<{codec_type:string;width:number;height:number;avg_frame_rate:string;nb_read_frames:string}>};
 const v=meta.streams.find(s=>s.codec_type==='video');
 assert.equal(v?.width,1920);assert.equal(v?.height,1080);
 assert.equal(v?.avg_frame_rate,'24/1');assert.equal(v?.nb_read_frames,String(bake.frames.length));
 assert.equal(meta.streams.some(s=>s.codec_type==='audio'),false);
 exec('ffmpeg',['-v','error','-xerror','-nostdin','-threads','1','-i',
   path.join(dir,entry.name),'-threads','1','-f','null','-']);
}
await checkFile(manifest.comparison.file,manifest.comparison.sha256);
// Compare actual decoded pixels, not producer-declared frame hash strings.
const decodedFrame=(mode:string)=>{
 const result=spawnSync('ffmpeg',['-v','error','-nostdin','-threads','1','-i',
   path.join(dir,manifest.videos[mode]!.name),'-vf','select=eq(n\\,'+focus+')',
   '-frames:v','1','-threads','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],
   {maxBuffer:8*1024*1024});
 assert.equal(result.status,0,'M4_COMPARE_DECODE '+String(result.stderr));
 assert.equal(result.stdout.length,1920*1080*3,'M4_COMPARE_EMPTY_FRAME');
 return result.stdout;
};
assert.notEqual(sha(decodedFrame('off')),sha(decodedFrame('on')),'M4_DECODED_OFF_ON_IDENTICAL');
metrics.visualComparisonPixelDifference=true;
const comparison=spawnSync('ffmpeg',['-v','error','-nostdin','-i',path.join(dir,manifest.videos.off!.name),
 '-i',path.join(dir,manifest.videos.on!.name),'-filter_complex',
 '[0:v]select=eq(n\\,'+focus+'),scale=960:540,setpts=PTS-STARTPTS[l];'+
 '[1:v]select=eq(n\\,'+focus+'),scale=960:540,setpts=PTS-STARTPTS[r];'+
 '[l][r]hstack=inputs=2','-frames:v','1','-f','image2pipe','-c:v','png','pipe:1'],
 {maxBuffer:8*1024*1024});
assert.equal(comparison.status,0,'M4_COMPARISON_REBUILD '+String(comparison.stderr));
assert.equal(sha(comparison.stdout),manifest.comparison.sha256,'M4_COMPARISON_NOT_FROM_FILMS');
assert.notEqual(manifest.videos.off!.frameHashes[manifest.comparison.frame],
  manifest.videos.on!.frameHashes[manifest.comparison.frame]);
const changed=structuredClone(bake);
changed.frames[bake.frames.length-1]!.centerX+=1;
assert.throws(()=>validateM4Bake(changed,project,pack),/M4_BAKE_SHA_MISMATCH/);
const badInput=structuredClone(project);
badInput.prop.massKg+=.1;
assert.throws(()=>validateM4Bake(bake,badInput,pack),/M4_BAKE_INPUT_OR_ART_STALE/);
const report={milestone:'M4',reviewer:'delegated-agent second pass; NOT independent human art approval',
 status:'TECHNICAL_PASS_PENDING_OWNER_REVIEW',
 sourceCommit:manifest.sourceCommit,projectSha256:manifest.project.sha256,bakeSha256:bake.bakeSha256,
 filmHashes:{off:manifest.videos.off!.sha256,on:manifest.videos.on!.sha256},
 verifiedVideoProfile:'1920x1080/24fps; full FFmpeg decode; intentionally silent',
 acceptance:{fixedStep:true,realRapierContact:true,authoredOwnership:true,
   noHandoffTeleport:true,randomSeek:true,staleBakeRejected:true,
   realNativeOffOn:true,allHashes:true,allFrameDecodes:true},metrics,
 limitations:['No human aesthetic approval asserted','Supported cup/platform with M3 cutout rig only',
   'Collision proxy uses declared 2mm Rapier contact skin; image silhouette not rigid collider']};
await publish(report);
console.log('M4_POST_RESULT_TECHNICAL_PASS '+JSON.stringify(report));

}catch(error){
 await publish({milestone:'M4',status:'FAIL',error:String(error)});
 throw error;
}
