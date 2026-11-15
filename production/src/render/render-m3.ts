/**
 * M3 actual native 1080p Three/Chromium video. No benchmark-frame shortcut.
 * Only publishes acceptance manifest after MP4 full decode, independent contact
 * checks, randomized seek parity, and actual screenshot contact sheet.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createCaptureSession,initializeSession,captureFrameToBuffer,closeCaptureSession,drainBrowserPool} from '@hyperframes/engine';
import {serveM3,root} from './server.js';
import {makeM3Showcase,m3TotalFrames,sampleM3} from '../motion/character-library.js';
import type {ArtPack} from '../scene/types.js';

const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const check=(name:string,args:string[])=>{
 const result=spawnSync(name,args,{encoding:'utf8',maxBuffer:16*1024*1024});
 if(result.error||result.status!==0)throw Error(name+' ERROR '+String(result.stderr||result.error));
 return result.stdout;
};
const pack=JSON.parse(await readFile(path.join(root,'assets/lantern-v1/manifest.json'),'utf8')) as ArtPack;
const project=makeM3Showcase(pack,'guest-01','an');
const output=path.join(root,'out/product-first/m3');
await mkdir(output,{recursive:true});
const frames=m3TotalFrames(project);
const selected=[0,12,24,36,48,72,73,97,121,122,147,170,171,195,218,239,267];
assert.equal(frames,268);
const video=path.join(output,'m3-character-motion-final-1080p.mp4');
const images:Record<string,string>={};
const frameHashes:string[]=[],stateHashes:string[]=[];
let server:Awaited<ReturnType<typeof serveM3>>|undefined;
let session:Awaited<ReturnType<typeof createCaptureSession>>|undefined;
let ff:ReturnType<typeof spawn>|undefined;
let encoderStderr='';
try{
 server=await serveM3(project,{width:1920,height:1080});
 session=await createCaptureSession(server.url,output,{
   width:1920,height:1080,fps:{num:24,den:1},format:'png'
 },null,{chromePath:'/usr/bin/chromium',forceScreenshot:true,
   browserGpuMode:'software',enableBrowserPool:false});
 await initializeSession(session);
 await session.page.waitForFunction('window.studio?.ready===true',{timeout:40000});
 assert.equal(await session.page.evaluate('window.__hf?.duration'),frames/24);
 ff=spawn('ffmpeg',['-v','error','-nostdin','-y','-f','image2pipe','-framerate','24',
   '-c:v','png','-i','pipe:0','-pix_fmt','yuv420p','-c:v','libx264',
   '-threads','2','-preset','veryfast','-crf','20','-movflags','+faststart',video],{stdio:['pipe','ignore','pipe']});
 ff.stderr!.on('data',(chunk:Buffer)=>encoderStderr+=chunk.toString());
 const ended=once(ff,'close');
 let streamError:Error|undefined;
 ff.stdin!.on('error',(e:Error)=>{streamError=e;});
 const constraints={plantedStanceFrames:0,maxPlantedFootDrift:0,heldGripFrames:0,maxGripError:0,
   liftHeight:0,actions:[] as string[]};
 const standingFeet=new Map<string,[number,number]>();
 for(let f=0;f<frames;f++){
   const sample=sampleM3(project,f,pack);
   if(!constraints.actions.includes(sample.action))constraints.actions.push(sample.action);
   for(const side of sample.contact.planted){
     const point=sample.frame.markers.find(m=>m.id===project.character.id+'.'+side+'-sole')!.point;
     const key=sample.action+':'+side+':'+(sample.action==='walk-stop'&&f<48?f<24?'stance0':'stance1':'settled');
     const anchor=standingFeet.get(key);
     if(anchor){
       const drift=Math.hypot(point[0]-anchor[0],point[1]-anchor[1]);
       constraints.maxPlantedFootDrift=Math.max(constraints.maxPlantedFootDrift,drift);
       assert.ok(drift<.001,'SOLE_SLIP f='+f+' '+key+' '+drift);
     }else standingFeet.set(key,[...point]);
     constraints.plantedStanceFrames++;
   }
   if(sample.contact.grip){
     assert.ok(sample.contact.gripError!==null&&sample.contact.gripError<.001);
     constraints.heldGripFrames++;
     constraints.maxGripError=Math.max(constraints.maxGripError,sample.contact.gripError!);
   }
   const cup=sample.frame.sprites.find(s=>s.id===project.prop.id)!;
   constraints.liftHeight=Math.max(constraints.liftHeight,project.prop.y-cup.y);
   const raw=await captureFrameToBuffer(session,f,f/24);
   assert.equal(await session.page.evaluate('window.studio.frame'),f,'browser frame mismatch');
   const state=await session.page.evaluate('JSON.stringify(window.studio.state)') as string;
   frameHashes.push(sha(raw.buffer));stateHashes.push(sha(state));
   if(selected.includes(f)){
     const filename='m3-final-frame-'+String(f).padStart(3,'0')+'.png';
     await writeFile(path.join(output,filename),raw.buffer);images[filename]=sha(raw.buffer);
   }
   if(streamError)throw streamError;
   if(!ff.stdin!.write(raw.buffer))
     await Promise.race([once(ff.stdin!,'drain'),ended.then(()=>{throw Error('ENCODER_CLOSED '+encoderStderr)})]);
 }
 assert.deepEqual(constraints.actions,['walk-stop','turn-head','wave','pick-place']);
 assert.ok(constraints.heldGripFrames>=40&&constraints.liftHeight>60);
 ff.stdin!.end();
 const [exitCode]=await ended;
 if(exitCode!==0)throw Error('ENCODER_FAILED '+exitCode+' '+encoderStderr);
 for(const f of [267,0,171,72,147,24,218,36,267]){
   const raw=await captureFrameToBuffer(session,f,f/24);
   assert.equal(sha(raw.buffer),frameHashes[f],'PIXEL_SEEK_MISMATCH '+f);
   const state=await session.page.evaluate('JSON.stringify(window.studio.state)') as string;
   assert.equal(sha(state),stateHashes[f],'STATE_SEEK_MISMATCH '+f);
 }
 await closeCaptureSession(session);session=undefined;
 server.close();server=undefined;
 const metadata=JSON.parse(check('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',video])) as {
   streams:Array<{codec_type:string;nb_read_frames:string;avg_frame_rate:string;width:number;height:number}>;
   format:{duration:string}
 };
 const videoStream=metadata.streams.find(x=>x.codec_type==='video');
 assert.equal(videoStream?.width,1920);
 assert.equal(videoStream?.height,1080);
 assert.equal(videoStream?.avg_frame_rate,'24/1');
 assert.equal(videoStream?.nb_read_frames,String(frames));
 assert.ok(Math.abs(Number(metadata.format.duration)-frames/24)<.07);
 check('ffmpeg',['-v','error','-xerror','-nostdin','-threads','1','-i',video,
   '-threads','1','-f','null','-']);
 const contact=path.join(output,'m3-chronological-contact-sheet.png');
 check('ffmpeg',['-v','error','-xerror','-y','-i',video,'-vf',
   'select=eq(n\\,0)+eq(n\\,24)+eq(n\\,48)+eq(n\\,73)+eq(n\\,97)+eq(n\\,147)+eq(n\\,195)+eq(n\\,218)+eq(n\\,267),scale=480:270,tile=3x3',
   '-frames:v','1',contact]);
 const contactBytes=await readFile(contact);
 assert.deepEqual([...contactBytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 // Explicit baseline vs four supported actions: actual corresponding native frames.
 const comparison=path.join(output,'m3-standing-vs-motion.png');
 check('ffmpeg',['-v','error','-xerror','-y','-i',video,'-vf',
   'select=eq(n\\,0)+eq(n\\,36)+eq(n\\,97)+eq(n\\,147)+eq(n\\,218),scale=480:270,tile=5x1',
   '-frames:v','1',comparison]);
 const manifest={
   milestone:'M3',status:'TECHNICAL_PASS_PENDING_OWNER_VISUAL_REVIEW',
   sourceCommit:process.env.SOURCE_HEAD_SHA||process.env.GITHUB_SHA||'LOCAL_UNPINNED',
   checkoutCommit:process.env.GITHUB_SHA||'LOCAL_UNPINNED',
   renderer:'native Three.js + audited cutout puppet, same sample at any frame',
   project:{file:'m3-project.json',sha256:sha(JSON.stringify(project)),character:project.character,clips:project.clips},
   video:{file:path.basename(video),sha256:sha(await readFile(video)),width:1920,height:1080,
     fps:24,frames,duration:frames/24,hasAudio:false},
   contacts:{file:path.basename(contact),sha256:sha(contactBytes),
     baselineVsMotion:path.basename(comparison),baselineVsMotionSha256:sha(await readFile(comparison))},
   nativeFrames:images,frameHashes,stateHashes,constraints,
   checks:['all native frames captured in real Chromium','random reverse seek PNG and stage state byte parity',
     'rig reused with new guest-01 instance','stance/sole contact drift measured from actual rig',
     'cup grip/world anchor error measured','ffprobe frame/fps/dimensions and full ffmpeg decode'],
   limitations:['M3 is character/motion, no Physics M4','No narration or final acting polish M6',
     'Before/after means standing baseline vs authored motion, not a claim about prior-stage media']
 };
 await writeFile(path.join(output,'m3-project.json'),JSON.stringify(project,null,2)+'\n');
 await writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('M3_NATIVE_VIDEO_PASS '+JSON.stringify({frames,sha256:manifest.video.sha256,constraints}));
}finally{
 if(ff&&ff.exitCode===null)ff.kill('SIGTERM');
 if(session)await closeCaptureSession(session);
 if(server)server.close();
 await drainBrowserPool();
}
