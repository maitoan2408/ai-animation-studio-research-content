/**
 * M1 real Three/HyperFrames renderer exercise — no benchmarkFrame and no
 * input-generated JavaScript. Publishes MP4, native 1080p stills, contact sheet
 * and a digest manifest only after full decode/seek/frame tests succeed.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createCaptureSession,initializeSession,captureFrameToBuffer,closeCaptureSession,drainBrowserPool} from '@hyperframes/engine';
import {serveIR,root} from './server.js';
import type {StageShotTimeline} from '../scene/animation-ir-adapter.js';

const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
function processResult(name:string,args:string[]):string{
  const r=spawnSync(name,args,{encoding:'utf8',maxBuffer:24*1024*1024});
  if(r.status!==0||r.error)throw Error(name+' failed: '+String(r.stderr||r.error||'').slice(-2000));
  return r.stdout;
}
const ir=JSON.parse(await readFile(path.join(root,'fixtures/m1-production-ir.json'),'utf8')) as StageShotTimeline;
const out=path.join(root,'out/product-first/m1');
await mkdir(out,{recursive:true});
const frames=ir.timeline.totalFrames,stillFrames=[0,17,35,36,53,71];
const hashes:string[]=[],snapshots:Record<string,string>={},stateHashes:Record<number,string>={};
const output=path.join(out,'m1-ir-production-640.mp4');
let server:Awaited<ReturnType<typeof serveIR>>|undefined;
let session:Awaited<ReturnType<typeof createCaptureSession>>|undefined;
let videoEncoder:ReturnType<typeof spawn>|undefined;
let processError='';
try{
  // Separate source IR from the locked 6-shot benchmark renderer.
  server=await serveIR(ir,{width:640,height:360});
  session=await createCaptureSession(server.url,out,{
    width:640,height:360,fps:{num:24,den:1},format:'png'
  },null,{
    chromePath:'/usr/bin/chromium',forceScreenshot:true,
    browserGpuMode:'software',enableBrowserPool:false
  });
  await initializeSession(session);
  await session.page.waitForFunction('window.studio?.ready===true',{timeout:40000});
  assert.equal(await session.page.evaluate('window.__hf?.duration'),frames/24);
  const args=[
    '-v','error','-nostdin','-y','-f','image2pipe','-framerate','24',
    '-c:v','png','-i','pipe:0','-pix_fmt','yuv420p','-c:v','libx264',
    '-preset','fast','-crf','18','-threads','2',output
  ];
  videoEncoder=spawn('ffmpeg',args,{stdio:['pipe','ignore','pipe']});
  videoEncoder.stderr!.on('data',(b:Buffer)=>processError+=b.toString());
  const ended=once(videoEncoder,'close');
  let streamError:Error|undefined;
  videoEncoder.stdin!.on('error',(e:Error)=>{streamError=e});
  for(let f=0;f<frames;f++){
    const raw=await captureFrameToBuffer(session,f,f/24);
    assert.equal(await session.page.evaluate('window.studio.frame'),f);
    const state=await session.page.evaluate('JSON.stringify(window.studio.state)') as string;
    stateHashes[f]=sha(state);
    hashes.push(sha(raw.buffer));
    if(stillFrames.includes(f)){
      const name='m1-preview-frame-'+f+'.png';
      await writeFile(path.join(out,name),raw.buffer);
      snapshots[name]=sha(raw.buffer);
    }
    if(streamError)throw streamError;
    if(!videoEncoder.stdin!.write(raw.buffer))
      await Promise.race([once(videoEncoder.stdin!,'drain'),ended.then(()=>{throw Error('ENCODER_CLOSED '+processError);})]);
  }
  videoEncoder.stdin!.end();
  const [exitCode]=await ended;
  if(exitCode!==0)throw Error('ENCODER_FAILED '+exitCode+' '+processError);
  for(const f of [71,35,0,36,17,53,0,71]){
    const image=await captureFrameToBuffer(session,f,f/24);
    assert.equal(sha(image.buffer),hashes[f],'reverse-seek raster differs '+f);
    const state=await session.page.evaluate('JSON.stringify(window.studio.state)') as string;
    assert.equal(sha(state),stateHashes[f],'reverse-seek IR state differs '+f);
  }
  await closeCaptureSession(session);session=undefined;server.close();server=undefined;
  // The same IR evaluator must yield identical stage-space state on native 1080p.
  server=await serveIR(ir,{width:1920,height:1080});
  session=await createCaptureSession(server.url,out,{
    width:1920,height:1080,fps:{num:24,den:1},format:'png'
  },null,{
    chromePath:'/usr/bin/chromium',forceScreenshot:true,
    browserGpuMode:'software',enableBrowserPool:false
  });
  await initializeSession(session);
  await session.page.waitForFunction('window.studio?.ready===true',{timeout:40000});
  for(const f of [0,35,36,71]){
    const image=await captureFrameToBuffer(session,f,f/24);
    const name='m1-final-native1080-frame-'+f+'.png';
    await writeFile(path.join(out,name),image.buffer);
    snapshots[name]=sha(image.buffer);
    const state=await session.page.evaluate('JSON.stringify(window.studio.state)') as string;
    assert.equal(sha(state),stateHashes[f],'preview vs final evaluator differs '+f);
  }
  await closeCaptureSession(session);session=undefined;server.close();server=undefined;
  const probe=JSON.parse(processResult('ffprobe',[
    '-v','error','-count_frames','-show_streams','-show_format','-of','json',output
  ])) as {streams:Array<{codec_type:string;nb_read_frames:string;avg_frame_rate:string;width:number;height:number}>;format:{duration:string}};
  const video=probe.streams.find(s=>s.codec_type==='video');
  assert.equal(video?.nb_read_frames,String(frames));
  assert.equal(video?.avg_frame_rate,'24/1');
  assert.equal(video?.width,640);assert.equal(video?.height,360);
  processResult('ffmpeg',['-v','error','-xerror','-nostdin','-i',output,'-f','null','-']);
  const contact=path.join(out,'m1-ir-production-contact.png');
  processResult('ffmpeg',[
    '-v','error','-xerror','-y','-i',output,'-vf',
    'select=eq(n\\,0)+eq(n\\,17)+eq(n\\,36)+eq(n\\,71),scale=480:270,tile=4x1',
    '-frames:v','1',contact
  ]);
  const c=await readFile(contact);
  assert.deepEqual([...c.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  const manifest={
    milestone:'M1',sourceCommit:process.env.GITHUB_SHA||'LOCAL_UNPINNED',
    scene:'production/fixtures/m1-production-ir.json',renderer:'Three.js with real asset-bound puppet rig (not benchmarkFrame)',
    status:'TECHNICAL_VERIFIED_PENDING_OWNER_REVIEW',previewFrames:frames,
    video:{file:path.relative(root,output),sha256:sha(await readFile(output)),frames,width:640,height:360,fps:24,hasVoice:false},
    nativeFinalStills:4,contact:{file:path.relative(root,contact),sha256:sha(c)},
    frameHashes:hashes,stageHashes:stateHashes,snapshotHashes:snapshots,
    checks:['all frames captured in real Chromium','full MP4 decode','reverse arbitrary seek pixel and scene state parity','preview/final frame evaluator equal','production rig sprites+contacts+asset SHA anchors'],
    limitations:['Technical scene bridge only','No voice design in M1','Artistic quality requires owner review']
  };
  await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log('M1_REAL_PRODUCTION_IR_GATE_PASS '+JSON.stringify({
    frames,sha256:manifest.video.sha256,contact:manifest.contact,
    stageFrames:manifest.nativeFinalStills
  }));
}finally{
  if(videoEncoder&&videoEncoder.exitCode===null)videoEncoder.kill('SIGTERM');
  if(session)await closeCaptureSession(session);
  if(server)server.close();
  await drainBrowserPool();
}
