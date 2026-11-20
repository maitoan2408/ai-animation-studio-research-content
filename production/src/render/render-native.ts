/**
 * Deterministic native 1920x1080/24fps encoder for one validated film playback
 * (optionally with a performance layer). Called by render-films.ts. Every frame
 * is QA-checked before capture; output is source-bound and fully decoded.
 * Inputs: FILM_ART_PACK, FILM_PLAYBACK_FILE, FILM_OUTPUT_DIR, [FILM_PERFORMANCE_FILE].
 */
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createCaptureSession,initializeSession,captureFrameToBuffer,closeCaptureSession,drainBrowserPool} from '@hyperframes/engine';
import {serveFilm,root} from './server.js';
import {loadArtPack} from '../art/pack.js';
import {browserPath} from '../art/textures.js';
import {generalFilmFrameContract} from '../motion/general-timeline.js';
import {sampleGeneralPlayback} from '../motion/general-playback.js';
import {sampleG3Performance,validateG3Performance} from '../motion/g3-performance.js';
import {validateGeneralPlaybackAgainstSolver} from '../motion/general-playback-validate.js';
import {auditFrame} from '../qa/general-scene-quality.js';
import {auditG3VisualIntent} from '../qa/g3-visual-intent.js';
import {auditG3JointCaps} from '../scene/g3-joint-caps.js';

const hash=(a:Uint8Array|string)=>createHash('sha256').update(a).digest('hex');
const run=(cmd:string,args:string[])=>{
 const x=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:8*1024*1024});
 if(x.error||x.status!==0)throw Error('GENERAL_ENCODER_COMMAND '+cmd+' '+String(x.stderr||x.error));
 return x.stdout;
};
function equalState(actual:unknown,expected:unknown,name:string):void{
 if(typeof expected==='number'){
   assert.ok(typeof actual==='number'&&Number.isFinite(actual)&&
     Math.abs(actual-expected)<1e-5,'GENERAL_NATIVE_STAGE_NUMBER '+name);
 }else if(Array.isArray(expected)){
   assert.ok(Array.isArray(actual)&&actual.length===expected.length,'GENERAL_NATIVE_ARRAY '+name);
   for(let i=0;i<expected.length;i++)equalState(actual[i],expected[i],name+'['+i+']');
 }else if(expected!==null&&typeof expected==='object'){
   assert.ok(actual&&typeof actual==='object'&&!Array.isArray(actual),'GENERAL_NATIVE_OBJECT '+name);
   const x=actual as Record<string,unknown>,y=expected as Record<string,unknown>;
   assert.deepEqual(Object.keys(x).sort(),Object.keys(y).sort(),'GENERAL_NATIVE_KEYS '+name);
   for(const k of Object.keys(y))equalState(x[k],y[k],name+'.'+k);
 }else assert.equal(actual,expected,'GENERAL_NATIVE_VALUE '+name);
}
const source=process.env.FILM_PLAYBACK_FILE,artPackDir=process.env.FILM_ART_PACK;
if(!source||!artPackDir)throw Error('FILM_PLAYBACK_FILE_AND_FILM_ART_PACK_REQUIRED');
const raw=await readFile(path.resolve(source));
const pack=await loadArtPack(path.resolve(root,artPackDir));
const playback=await validateGeneralPlaybackAgainstSolver(JSON.parse(raw.toString()),pack);
const film=playback.film;
const performanceRaw=process.env.FILM_PERFORMANCE_FILE
 ?await readFile(path.resolve(process.env.FILM_PERFORMANCE_FILE)):undefined;
const performance=performanceRaw?validateG3Performance(JSON.parse(performanceRaw.toString()),
 playback,pack,{playbackSha256:hash(JSON.stringify(playback)),artSha256:hash(JSON.stringify(pack))}):undefined;
const performanceBackoffs:{frame:number;actorId:string;requested:number;applied:number}[]=[];
let changedActingFrames=0;
const out=path.resolve(process.env.FILM_OUTPUT_DIR??path.join(root,'out/film'));
await mkdir(out,{recursive:true});
const video=path.join(out,'film-1080p.mp4');
const frameHashes:string[]=[],stateHashes:string[]=[];
const stills:Record<string,string>={};
let server:Awaited<ReturnType<typeof serveFilm>>|undefined;
let session:Awaited<ReturnType<typeof createCaptureSession>>|undefined;
let ff:ReturnType<typeof spawn>|undefined;
let stderr='';
const count=film.frames;
const selected=[...new Set(Array.from({length:9},(_,i)=>Math.round((count-1)*i/8)))];
try{
 server=await serveFilm(playback,{artPackDir,width:1920,height:1080},performance);
 session=await createCaptureSession(server.url,out,{
   width:1920,height:1080,fps:{num:24,den:1},format:'png'
 },null,{chromePath:browserPath(),forceScreenshot:true,
   browserGpuMode:'software',enableBrowserPool:false});
 await initializeSession(session);
 await session.page.waitForFunction('window.studio?.ready===true',{timeout:40000});
 assert.equal(await session.page.evaluate('window.__hf?.duration'),count/24);
 ff=spawn('ffmpeg',['-v','error','-nostdin','-y','-f','image2pipe','-framerate','24',
  '-c:v','png','-i','pipe:0','-pix_fmt','yuv420p','-c:v','libx264',
  '-threads','2','-preset','veryfast','-crf','19','-movflags','+faststart',video],
  {stdio:['pipe','ignore','pipe']});
 ff.stderr!.on('data',(b:Buffer)=>stderr+=b.toString());
 const ended=once(ff,'close');
 let error:Error|undefined;
 ff.stdin!.on('error',e=>error=e);
 let last:ReturnType<typeof sampleGeneralPlayback>|undefined;
 for(let i=0;i<count;i++){
   const expected=performance?sampleG3Performance(playback,performance,i,pack):
     sampleGeneralPlayback(playback,i,pack);
   if(performance){
     // The selected branch is the enhanced sample; a structural 'in' guard
     // would narrow a generic source frame's optional field to unknown.
     const gains=(expected as ReturnType<typeof sampleG3Performance>).gains;
     if(gains.length)changedActingFrames++;
     for(const g of gains)if(g.applied+1e-4<g.requested)
       performanceBackoffs.push({frame:i,actorId:g.actorId,requested:g.requested,applied:g.applied});
   }
   const qc=auditFrame(expected.frame,pack,generalFilmFrameContract(film,pack,i,
     playback.releases.filter(r=>i>=r.frame).map(r=>r.actorId)),
     last?.frame,{maxSpriteJumpPx:35,maxRotationDeltaDegrees:28,
       maxCameraDeltaPx:10,maxCameraZoomRatio:1.12});
   if(qc.length)throw Error('GENERAL_FILM_VISUAL_QA '+i+' '+qc.map(q=>q.code+':'+q.subject).join(','));
   const intent=auditG3VisualIntent(playback,i,expected.frame,pack);
   if(intent.issues.length)throw Error('G3_VISUAL_INTENT_QA '+i+' '+JSON.stringify(intent.issues));
   if(performance){
     const jointIssues=auditG3JointCaps(expected.frame,pack,performance.tracks.map(t=>t.actorId));
     if(jointIssues.length)throw Error('G3_VISUAL_JOINT_QA '+i+' '+JSON.stringify(jointIssues));
   }
   const capture=await captureFrameToBuffer(session,i,i/24);
   const state=await session.page.evaluate('JSON.stringify(window.studio.state)') as string;
   equalState(JSON.parse(state),expected.frame,'frame'+i);
   frameHashes.push(hash(capture.buffer));stateHashes.push(hash(state));
   if(selected.includes(i)){
     const name='frame-'+String(i).padStart(3,'0')+'.png';
     await writeFile(path.join(out,name),capture.buffer);stills[name]=hash(capture.buffer);
   }
   if(error)throw error;
   if(!ff.stdin!.write(capture.buffer))
     await Promise.race([once(ff.stdin!,'drain'),ended.then(()=>{throw Error('GENERAL_ENCODER_CLOSED '+stderr)})]);
   last=expected;
 }
 ff.stdin!.end();
 const [exit]=await ended;
 if(exit!==0)throw Error('GENERAL_ENCODER_FAILED '+exit+' '+stderr);
 for(const f of [count-1,0,...selected.slice(2,7),count-1]){
   const image=await captureFrameToBuffer(session,f,f/24);
   assert.equal(hash(image.buffer),frameHashes[f],'GENERAL_RANDOM_SEEK_PIXEL '+f);
   const state=await session.page.evaluate('JSON.stringify(window.studio.state)') as string;
   assert.equal(hash(state),stateHashes[f],'GENERAL_RANDOM_SEEK_STATE '+f);
 }
 await closeCaptureSession(session);session=undefined;
 server.close();server=undefined;
 const p=JSON.parse(run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',video])) as {
  streams:Array<{codec_type:string;nb_read_frames:string;width:number;height:number;avg_frame_rate:string}>;
  format:{duration:string};
 };
 const v=p.streams.find(x=>x.codec_type==='video');
 assert.equal(v?.width,1920);assert.equal(v?.height,1080);
 assert.equal(v?.avg_frame_rate,'24/1');assert.equal(v?.nb_read_frames,String(count));
 assert.ok(Math.abs(Number(p.format.duration)-count/24)<.08);
 run('ffmpeg',['-v','error','-xerror','-nostdin','-threads','1','-i',video,'-f','null','-']);
 const contact=path.join(out,'contact-sheet.png');
 const selector=selected.map(f=>'eq(n\\,'+f+')').join('+');
 run('ffmpeg',['-v','error','-xerror','-y','-i',video,'-vf',
   'select='+selector+',scale=480:270,tile=3x3','-frames:v','1',contact]);
 const contactBytes=await readFile(contact);
 if(performanceRaw)await writeFile(path.join(out,'performance-plan.json'),performanceRaw);
 const manifest={schemaVersion:'film-native/1',
  status:'TECHNICAL_PASS_PENDING_HUMAN_VISUAL_REVIEW',sourceSha256:hash(raw),
  releases:playback.releases.map(r=>({actorId:r.actorId,frame:r.frame,
   bakeSha256:r.bake.sha256,physicalContactFrames:r.bake.contacts})),
  sourceCommit:process.env.SOURCE_HEAD_SHA??process.env.GITHUB_SHA??'LOCAL',
  video:{file:path.basename(video),sha256:hash(await readFile(video)),
    frames:count,width:1920,height:1080,fps:24,audio:false},
  stills,frameHashes,stateHashes,contactSheet:{file:'contact-sheet.png',sha256:hash(contactBytes)},
  ...(performance&&performanceRaw?{performance:{
     schemaVersion:performance.schemaVersion,file:'performance-plan.json',
     sha256:hash(performanceRaw),playbackSha256:performance.playbackSha256,
     artSha256:performance.artSha256,changedActingFrames,backoffFrames:performanceBackoffs
  }}:{}),
  checks:['trusted Three renderer over the referenced art pack',
   'authored hand contact -> physics-owned real Rapier bake','actual per-frame browser state parity',
   'actual G1 contact and camera continuity checks','true native MP4 full decode',
   'source-bound SHA and pixel random seek parity',
   'source-derived held/falling/resting state and visible support',
   ...(performance?['asset-sampled arm/knee joint caps validated against actual limb endpoints']:[])],
  limits:['Limited planted-foot grasp/release scenarios; not arbitrary walking',
   'No final voice or human aesthetic pass'],
 };
 await writeFile(path.join(out,'playback.json'),raw);
 await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('FILM_NATIVE_RENDER_PASS '+JSON.stringify({file:video,sha256:manifest.video.sha256,
   frames:count,contactSheet:contact}));
}finally{
 if(ff&&ff.exitCode===null)ff.kill('SIGTERM');
 if(session)await closeCaptureSession(session);
 if(server)server.close();
 await drainBrowserPool();
}
