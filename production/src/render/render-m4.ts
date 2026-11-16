/** M4 end-to-end native product proof: same M3 authored project, OFF vs ON.
 * Actual frames come from trusted Three/Chromium, never synthetic stills.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createCaptureSession,initializeSession,captureFrameToBuffer,closeCaptureSession,drainBrowserPool} from '@hyperframes/engine';
import {serveM4,root} from './server.js';
import {ensureM3Textures} from './prepare-m3.js';
import {makeM3Showcase,validateM3} from '../motion/character-library.js';
import {bakeM4,validateM4Bake,validateM4Project,m4PlatformGeometry,type PhysicsProject,type PhysicsBake} from '../physics/m4.js';
import {sampleM4Scene} from '../physics/m4-adapter.js';
import type {ArtPack} from '../scene/types.js';
const sha=(b:string|Uint8Array)=>createHash('sha256').update(b).digest('hex');
/** Cross-runtime (Node/V8 vs Chromium/WebGL browser) trigonometric evaluations
 * can differ by ~1e-14. Verify every key, array entry, string and Boolean exactly;
 * compare finite transform numbers within 1e-9 stage units, far below the
 * independent measured contact/collision limits. Browser seek checks remain
 * byte-for-byte PNG/state SHA comparisons in the same runtime.
 */
function assertSceneParity(actual:unknown,expected:unknown,location:string):void{
 if(typeof expected==='number'){
   assert.equal(typeof actual,'number',location+' type');
   assert.ok(Number.isFinite(actual as number)&&Number.isFinite(expected)&&
     Math.abs((actual as number)-expected)<=1e-9,
     'M4_NATIVE_TRANSFORM_DIVERGENCE '+location+' got='+actual+' expected='+expected);
 }else if(Array.isArray(expected)){
   assert.ok(Array.isArray(actual),'M4_NATIVE_ARRAY '+location);
   assert.equal(actual.length,expected.length,'M4_NATIVE_ARRAY_LENGTH '+location);
   expected.forEach((item,i)=>assertSceneParity(actual[i],item,location+'['+i+']'));
 }else if(expected!==null&&typeof expected==='object'){
   assert.ok(actual!==null&&typeof actual==='object'&&!Array.isArray(actual),'M4_NATIVE_OBJECT '+location);
   const a=actual as Record<string,unknown>,e=expected as Record<string,unknown>;
   assert.deepEqual(Object.keys(a).sort(),Object.keys(e).sort(),'M4_NATIVE_KEYS '+location);
   for(const key of Object.keys(e))assertSceneParity(a[key],e[key],location+'.'+key);
 }else assert.equal(actual,expected,'M4_NATIVE_VALUE '+location);
}

const run=(command:string,args:string[])=>{
 const proc=spawnSync(command,args,{encoding:'utf8',maxBuffer:16*1024*1024});
 if(proc.error||proc.status!==0)throw Error(command+' FAILED '+String(proc.stderr||proc.error));
 return proc.stdout;
};
const pack=JSON.parse(await readFile(path.join(root,'assets/lantern-v1/manifest.json'),'utf8')) as ArtPack;
function defaultProject():PhysicsProject{
 const motion=makeM3Showcase(pack,'guest-m4-01','an');
 motion.clips=[{action:'pick-place',frames:73}];
 motion.character.xStart=840;
 validateM3(motion,pack);
 return {schemaVersion:'physics-m4/1',motion,tailFrames:96,gravityMps2:9.81,
   prop:{id:motion.prop!.id,pixelsPerMeter:200,massKg:.6,
     halfExtentsM:[.15,.13],linearDamping:.1,angularDamping:.65,
     friction:.02,restitution:.2,floorStageY:632,
     velocityStagePxPerSecond:[95,-30],angularVelocityDegPerSecond:40}};
}
const configured=process.env.M4_PROJECT_FILE;
const project=validateM4Project(configured
 ?JSON.parse(await readFile(configured,'utf8')):defaultProject(),pack);
const output=path.resolve(process.env.M4_OUTPUT_DIR??path.join(root,'out/product-first/m4'));
await mkdir(output,{recursive:true});
await ensureM3Textures();
const bake=await bakeM4(project,pack);
validateM4Bake(bake,project,pack);
const projectBytes=JSON.stringify(project,null,2)+'\n';
const bakeBytes=JSON.stringify(bake,null,2)+'\n';
await writeFile(path.join(output,'m4-project.json'),projectBytes);
await writeFile(path.join(output,'m4-bake.json'),bakeBytes);
const frames=bake.frames.length;
assert.ok(frames>150);
const selected=[0,bake.releaseFrame-1,bake.releaseFrame,bake.releaseFrame+3,
 bake.releaseFrame+15,100,125,150,frames-1].filter((x,i,a)=>x<frames&&a.indexOf(x)===i);
const selector=(list:number[])=>list.map(n=>'eq(n\\,'+n+')').join('+');
const filmData:Record<string,{name:string;sha256:string;frameHashes:string[];stateHashes:string[];
  nativeStills:Record<string,string>;video:{width:number;height:number;fps:number;frames:number;audio:boolean}}>= {};
let session:Awaited<ReturnType<typeof createCaptureSession>>|undefined;
let service:Awaited<ReturnType<typeof serveM4>>|undefined;
let ff:ReturnType<typeof spawn>|undefined;
try{
 for(const mode of ['off','on'] as const){
   service=await serveM4({project,bake,enabled:mode==='on'},{width:1920,height:1080});
   session=await createCaptureSession(service.url,output,{width:1920,height:1080,
     fps:{num:24,den:1},format:'png'},null,{chromePath:'/usr/bin/chromium',forceScreenshot:true,
     browserGpuMode:'software',enableBrowserPool:false});
   await initializeSession(session);
   await session.page.waitForFunction('window.studio?.ready===true',{timeout:40000});
   assert.equal(await session.page.evaluate('window.__hf?.duration'),frames/24);
   const filename='m4-physics-'+mode+'-1080p.mp4',destination=path.join(output,filename);
   ff=spawn('ffmpeg',['-v','error','-nostdin','-y','-f','image2pipe','-framerate','24',
     '-c:v','png','-i','pipe:0','-pix_fmt','yuv420p','-c:v','libx264','-threads','2',
     '-preset','veryfast','-crf','20','-movflags','+faststart',destination],
     {stdio:['pipe','ignore','pipe']});
   let encoderError='';
   ff.stderr!.on('data',(b:Buffer)=>encoderError+=b.toString());
   const ended=once(ff,'close');
   let streamError:Error|undefined;
   ff.stdin!.on('error',(e:Error)=>{streamError=e;});
   const frameHashes:string[]=[],stateHashes:string[]=[],nativeStills:Record<string,string>={};
   for(let frame=0;frame<frames;frame++){
     const raw=await captureFrameToBuffer(session,frame,frame/24);
     assert.equal(await session.page.evaluate('window.studio.frame'),frame);
     const displayed=await session.page.evaluate('JSON.stringify(window.studio.state)') as string;
     assertSceneParity(JSON.parse(displayed),sampleM4Scene({project,bake,enabled:mode==='on'},frame,pack),
       'mode='+mode+' frame='+frame);
     frameHashes.push(sha(raw.buffer));stateHashes.push(sha(displayed));
     if(selected.includes(frame)){
       const imageName='m4-'+mode+'-frame-'+String(frame).padStart(3,'0')+'.png';
       await writeFile(path.join(output,imageName),raw.buffer);nativeStills[imageName]=sha(raw.buffer);
     }
     if(streamError)throw streamError;
     if(!ff.stdin!.write(raw.buffer))
       await Promise.race([once(ff.stdin!,'drain'),ended.then(()=>{throw Error('M4_ENCODER_CLOSED '+encoderError)})]);
   }
   ff.stdin!.end();
   const [exitCode]=await ended;
   if(exitCode!==0)throw Error('M4_ENCODE_FAILED '+mode+' '+exitCode+' '+encoderError);
   ff=undefined;
   for(const frame of [150,20,100,0,150]){
     const raw=await captureFrameToBuffer(session,frame,frame/24);
     assert.equal(sha(raw.buffer),frameHashes[frame],'M4_RANDOM_SEEK_PIXEL_MISMATCH '+mode+' '+frame);
     const state=await session.page.evaluate('JSON.stringify(window.studio.state)') as string;
     assert.equal(sha(state),stateHashes[frame],'M4_RANDOM_SEEK_STATE_MISMATCH '+mode+' '+frame);
   }
   await closeCaptureSession(session);session=undefined;
   service.close();service=undefined;
   const probe=JSON.parse(run('ffprobe',['-v','error','-count_frames','-show_streams','-of','json',destination])) as {streams:Array<{codec_type:string;width:number;height:number;nb_read_frames:string;avg_frame_rate:string}>};
   const videoStream=probe.streams.find(x=>x.codec_type==='video');
   assert.equal(videoStream?.width,1920);assert.equal(videoStream?.height,1080);
   assert.equal(videoStream?.nb_read_frames,String(frames));
   assert.equal(videoStream?.avg_frame_rate,'24/1');
   assert.equal(probe.streams.some(x=>x.codec_type==='audio'),false);
   run('ffmpeg',['-v','error','-xerror','-nostdin','-threads','1','-i',destination,'-threads','1','-f','null','-']);
   const contact=path.join(output,'m4-'+mode+'-contact-sheet.png');
   run('ffmpeg',['-v','error','-y','-i',destination,'-vf',
     'select='+selector([0,bake.releaseFrame-1,bake.releaseFrame,bake.releaseFrame+5,
       bake.releaseFrame+15,100,125,150,frames-1])+',scale=480:270,tile=3x3',
     '-frames:v','1',contact]);
   nativeStills[path.basename(contact)]=sha(await readFile(contact));
   filmData[mode]={name:filename,sha256:sha(await readFile(destination)),frameHashes,stateHashes,nativeStills,
     video:{width:1920,height:1080,fps:24,frames,audio:false}};
   console.log('M4_RENDER_PASS '+mode+' '+filename);
 }
 // A/B comparison built exclusively from actual frame bytes decoded from the two MP4s.
 const off=path.join(output,filmData.off!.name),on=path.join(output,filmData.on!.name);
 const comparison=path.join(output,'m4-physics-off-on-comparison.png');
 const focus=bake.releaseFrame+30;
 run('ffmpeg',['-v','error','-y','-i',off,'-i',on,'-filter_complex',
   '[0:v]select=eq(n\\,'+focus+'),scale=960:540,setpts=PTS-STARTPTS[l];'+
   '[1:v]select=eq(n\\,'+focus+'),scale=960:540,setpts=PTS-STARTPTS[r];'+
   '[l][r]hstack=inputs=2','-frames:v','1',comparison]);
 const comparisonSha=sha(await readFile(comparison));
 assert.notEqual(filmData.off!.frameHashes[focus],filmData.on!.frameHashes[focus],
   'M4_OFF_ON_IDENTICAL_FRAMES');
 const manifest={
   milestone:'M4',status:'TECHNICAL_EVIDENCE_PENDING_POST_RESULT_AUDIT',
   sourceCommit:process.env.SOURCE_HEAD_SHA||process.env.GITHUB_SHA||'LOCAL_UNPINNED',
   checkoutCommit:process.env.GITHUB_SHA||'LOCAL_UNPINNED',
   project:{file:'m4-project.json',sha256:sha(projectBytes)},
   bake:{file:'m4-bake.json',sha256:sha(bakeBytes),receipt:bake.bakeSha256,
     recipeSha256:bake.recipeSha256,artSha256:bake.artSha256,
     inputSha256:bake.inputSha256,releaseFrame:bake.releaseFrame,events:bake.events},
   videos:filmData,comparison:{file:path.basename(comparison),sha256:comparisonSha,frame:focus},
   selectedFrames:selected,
   dimensions:{width:1920,height:1080,fps:24,count:frames},
   audio:'intentionally-silent',
   physics:{solverHz:240,substeps:10,platformStageY:project.prop.floorStageY,
     collisionProxyHalfExtentsM:project.prop.halfExtentsM,contactSkinM:bake.recipe.contactSkinM,
     boundedPlatform:m4PlatformGeometry(project.motion,pack,bake.releaseFrame)},
   limitations:['M4 supports one SHA-locked cup on a level platform with the existing M3 rig',
     'Motion/physics ownership handoff happens at the actual M3 contact release',
     'Only documented in-scope rigid-body interactions; no arbitrary third-party art/cloth'],
 };
 await writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('M4_NATIVE_VIDEO_PASS '+JSON.stringify({frames,release:bake.releaseFrame,
   off:filmData.off!.sha256,on:filmData.on!.sha256,comparisonSha,events:bake.events}));
}finally{
 if(ff&&ff.exitCode===null)ff.kill('SIGTERM');
 if(session)await closeCaptureSession(session);
 if(service)service.close();
 await drainBrowserPool();
}
