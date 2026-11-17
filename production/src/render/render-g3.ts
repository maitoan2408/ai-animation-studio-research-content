/**
 * G3 deterministic native 1920x1080/24fps motion-to-physics playback encoder.
 * Uses the SAME real Three/Chromium texture/cache/capture path as M3–M6.
 * All output/PNG/manifest evidence is source-bound and independently decoded.
 */
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createCaptureSession,initializeSession,captureFrameToBuffer,closeCaptureSession,drainBrowserPool} from '@hyperframes/engine';
import {serveG3,root} from './server.js';
import {ensureM3Textures} from './prepare-m3.js';
import {sampleGeneralPlayback} from '../motion/general-playback.js';
import {validateGeneralPlayback} from '../motion/general-playback-validate.js';
import {auditFrame} from '../qa/general-scene-quality.js';
import type {ArtPack} from '../scene/types.js';

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
const source=process.env.G3_PLAYBACK_FILE;
if(!source)throw Error('G3_PLAYBACK_FILE_REQUIRED');
const raw=await readFile(path.resolve(source));
const pack=JSON.parse(await readFile(path.join(root,'assets/lantern-v1/manifest.json'),'utf8')) as ArtPack;
const playback=validateGeneralPlayback(JSON.parse(raw.toString()),pack);
const film=playback.film;
const out=path.resolve(process.env.G3_OUTPUT_DIR??path.join(root,'out/product-first/g3-general'));
await mkdir(out,{recursive:true});
const video=path.join(out,'g3-motion-physics-1080p.mp4');
const frameHashes:string[]=[],stateHashes:string[]=[];
const stills:Record<string,string>={};
let server:Awaited<ReturnType<typeof serveG3>>|undefined;
let session:Awaited<ReturnType<typeof createCaptureSession>>|undefined;
let ff:ReturnType<typeof spawn>|undefined;
let stderr='';
const count=film.frames;
const selected=[...new Set(Array.from({length:9},(_,i)=>Math.round((count-1)*i/8)))];
try{
 await ensureM3Textures();
 server=await serveG3(playback,{width:1920,height:1080});
 session=await createCaptureSession(server.url,out,{
   width:1920,height:1080,fps:{num:24,den:1},format:'png'
 },null,{chromePath:'/usr/bin/chromium',forceScreenshot:true,
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
   const expected=sampleGeneralPlayback(playback,i,pack);
   const qc=auditFrame(expected.frame,pack,{frame:i,contacts:expected.contacts},
     last?.frame,{maxSpriteJumpPx:35,maxRotationDeltaDegrees:28,
       maxCameraDeltaPx:10,maxCameraZoomRatio:1.12});
   if(qc.length)throw Error('GENERAL_FILM_VISUAL_QA '+i+' '+qc.map(q=>q.code+':'+q.subject).join(','));
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
 const manifest={schemaVersion:'g3-native-motion-physics/1',
  status:'TECHNICAL_PASS_PENDING_HUMAN_VISUAL_REVIEW',sourceSha256:hash(raw),
  releases:playback.releases.map(r=>({actorId:r.actorId,frame:r.frame,
   bakeSha256:r.bake.sha256,physicalContactFrames:r.bake.contacts})),
  sourceCommit:process.env.SOURCE_HEAD_SHA??process.env.GITHUB_SHA??'LOCAL',
  video:{file:path.basename(video),sha256:hash(await readFile(video)),
    frames:count,width:1920,height:1080,fps:24,audio:false},
  stills,frameHashes,stateHashes,contactSheet:{file:'contact-sheet.png',sha256:hash(contactBytes)},
  checks:['same Three renderer and art as legacy M3–M6',
   'authored hand contact -> physics-owned real Rapier bake','actual per-frame browser state parity',
   'actual G1 contact and camera continuity checks','true native MP4 full decode',
   'source-bound SHA and pixel random seek parity'],
  limits:['Limited planted-foot grasp/release scenarios; not arbitrary walking',
   'No final voice or human aesthetic pass'],
 };
 await writeFile(path.join(out,'playback.json'),raw);
 await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('G3_NATIVE_MOTION_PHYSICS_PASS '+JSON.stringify({file:video,sha256:manifest.video.sha256,
   frames:count,contactSheet:contact}));
}finally{
 if(ff&&ff.exitCode===null)ff.kill('SIGTERM');
 if(session)await closeCaptureSession(session);
 if(server)server.close();
 await drainBrowserPool();
}
