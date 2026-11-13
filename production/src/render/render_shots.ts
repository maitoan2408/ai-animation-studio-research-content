/** Reproducible candidate A batch. Writes a unique take, keeps failed frames/logs,
 * and only declares a shot complete after full decode + frame/profile checks.
 * Art/motion/loudness approval is a separate gate, never inferred from MP4. */
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createCaptureSession,initializeSession,captureFrameToBuffer,closeCaptureSession,drainBrowserPool} from '@hyperframes/engine';
import {serve,root} from './server.js';
import {shotFrames,type ShotId,type Edit} from '../scene/benchmark.js';
import {voiceFixture} from '../audio/fixture.js';

const ids=(process.argv[2]??'S01,S02,S03,S04,S05,S06').split(',') as ShotId[];
if(!ids.length||ids.some(s=>!Object.hasOwn(shotFrames,s)))throw Error('UNKNOWN_SHOT');
const width=Number(process.argv[3]??640);if(![640,1920].includes(width))throw Error('EXPECTED_WIDTH_640_OR_1920');
const edit:Edit=process.argv[4]?JSON.parse(await readFile(process.argv[4],'utf8')):{};
const take=path.join(root,'out/candidate-a',`${new Date().toISOString().replace(/[:.]/g,'-')}-${width}-${randomUUID().slice(0,8)}`);
await mkdir(take,{recursive:true});
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const run=async(args:string[],command='ffmpeg')=>{
 const p=spawn(command,args,{stdio:['ignore','pipe','pipe']});let out='',err='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);
 const [code]=await once(p,'close');if(code!==0)throw Error(`${command} ${code}: ${err}`);return {out,err};
};
const reports:Record<string,unknown>[]=[];
for(const shot of ids){
 const dir=path.join(take,shot);await mkdir(dir,{recursive:true});
 const server=await serve(shot,{width,height:width*9/16,edit});
 await writeFile(path.join(dir,'inputs.json'),JSON.stringify(server.config,null,2)+'\n');
 await writeFile(path.join(dir,'request.json'),JSON.stringify({shot,width,frames:shotFrames[shot],status:'RUNNING',started:new Date().toISOString()},null,2)+'\n');
 let session:Awaited<ReturnType<typeof createCaptureSession>>|undefined;
 const hashes:string[]=[],started=performance.now();
 try{
  session=await createCaptureSession(server.url,dir,{width,height:width*9/16,fps:{num:24,den:1},format:'png'},null,
   {chromePath:'/usr/bin/chromium',forceScreenshot:true,browserGpuMode:'software',enableBrowserPool:false});
  await initializeSession(session);await session.page.waitForFunction('window.studio?.ready===true',{timeout:30000});
  const argv=['-v','error','-nostdin','-y','-f','image2pipe','-framerate','24','-c:v','png','-i','pipe:0',
   '-vf','zscale=primariesin=709:transferin=iec61966-2-1:matrixin=gbr:rangein=full:primaries=709:transfer=709:matrix=709:range=limited,format=yuv420p',
   '-c:v','libx264','-preset','fast','-crf','18','-threads','2','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv',path.join(dir,'picture.mp4')];
  await writeFile(path.join(dir,'encode-argv.json'),JSON.stringify(argv,null,2)+'\n');
  const encoder=spawn('ffmpeg',argv,{stdio:['pipe','ignore','pipe']});let encoderError='';encoder.stderr.on('data',b=>encoderError+=b);
  const encoderExit=once(encoder,'close');let pipeError:Error|undefined;encoder.stdin.on('error',e=>{pipeError=e;});
  try{
   for(let frame=0;frame<shotFrames[shot];frame++){
    const image=(await captureFrameToBuffer(session,frame,frame/24)).buffer;
    if(pipeError)throw pipeError;
    const observed=await session.page.evaluate('window.studio.frame');if(observed!==frame)throw Error(`CAPTURE_FRAME_MISMATCH ${frame}/${observed}`);
    hashes.push(sha(image));
    if([0,23,48,60,72,96,120,143,179,shotFrames[shot]-1].includes(frame))await writeFile(path.join(dir,`frame-${frame}.png`),image);
    if(!encoder.stdin.write(image))await Promise.race([once(encoder.stdin,'drain'),encoderExit.then(()=>{throw Error(`ENCODER_CLOSED ${encoderError}`);})]);
    if(frame%48===0)console.log(`${shot} frame ${frame}/${shotFrames[shot]}`);
   }
   encoder.stdin.end();const [code]=await encoderExit;if(code!==0)throw Error(`ENCODE_FAILED ${code} ${encoderError}`);
  }finally{if(encoder.exitCode===null)encoder.kill('SIGTERM');await writeFile(path.join(dir,'encode.log'),encoderError);}
  const duration=shotFrames[shot]/24;
  const fixture=await voiceFixture(edit);
  const audio=shot==='S01'?['-i',fixture.audioPath]:['-f','lavfi','-i','anullsrc=r=48000:cl=stereo'];
  await run(['-v','error','-nostdin','-y','-i',path.join(dir,'picture.mp4'),...audio,'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-ar','48000','-ac','2','-b:a','192k','-t',String(duration),'-movflags','+faststart',path.join(dir,'delivery.mp4')]);
  await run(['-v','error','-nostdin','-i',path.join(dir,'delivery.mp4'),'-f','null','-']);
  const probe=JSON.parse((await run(['-v','error','-count_frames','-show_streams','-show_format','-of','json',path.join(dir,'delivery.mp4')],'ffprobe')).out);
  const v=probe.streams.find((s:{codec_type:string})=>s.codec_type==='video'),a=probe.streams.find((s:{codec_type:string})=>s.codec_type==='audio');
  if(v.nb_read_frames!==String(shotFrames[shot])||v.width!==width||v.height!==width*9/16||v.r_frame_rate!=='24/1'||v.pix_fmt!=='yuv420p'||v.color_space!=='bt709'||v.color_range!=='tv'||a.channels!==2||a.sample_rate!=='48000')throw Error(`MEDIA_PROFILE_FAILED ${JSON.stringify(probe)}`);
  const report={shot,status:'PASS_TECHNICAL',width,height:width*9/16,frames:shotFrames[shot],elapsedSeconds:(performance.now()-started)/1000,
   imageHashes:hashes,configSha256:sha(JSON.stringify(server.config)),audioInputSha256:shot==='S01'?fixture.sha256:null,deliverySha256:sha(await readFile(path.join(dir,'delivery.mp4'))),probe,
   diagnostics:await session.page.evaluate('window.studio.diagnostics'),limits:['Blocking candidate; no art approval','Q7 final loudness not applied','Q1 listening review open']};
  await writeFile(path.join(dir,'result.json'),JSON.stringify(report,null,2)+'\n');reports.push(report);console.log(`${shot} complete ${report.elapsedSeconds.toFixed(2)} seconds`);
 }catch(e){await writeFile(path.join(dir,'result.json'),JSON.stringify({shot,status:'FAIL',error:String(e),capturedFrames:hashes.length},null,2)+'\n');throw e;}
 finally{if(session)await closeCaptureSession(session);server.close();await drainBrowserPool();}
}
await writeFile(path.join(take,'report.json'),JSON.stringify({take,candidate:'A',shots:reports},null,2)+'\n');console.log(JSON.stringify({take,status:'PASS_TECHNICAL'}));
