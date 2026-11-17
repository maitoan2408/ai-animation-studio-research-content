/**
 * M6 independent post-result verifier: bytes from actual paired MP4s, frame
 * hashes, editable input, camera/contact geometry and full decode. A second
 * evaluation cannot certify artistic acting; it only verifies technical facts.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluateM6} from '../motion/m6-critic.js';
import {m3TotalFrames,validateM3,type M3Project} from '../motion/character-library.js';
import type {ArtPack} from '../scene/types.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const exec=(command:string,args:string[])=>{
  const p=spawnSync(command,args,{encoding:'utf8',maxBuffer:20*1024*1024});
  if(p.error||p.status!==0)throw Error('M6_AUDIT_EXEC '+command+' '+String(p.stderr||p.error));
  return p.stdout;
};
type Video={file:string;sha256:string;width:number;height:number;fps:number;frames:number;duration:number;hasAudio:boolean};
type Manifest={
  milestone:string;qualityMode:string|null;sourceCommit:string;
  video:Video;project:{sha256:string;file:string};
  frameHashes:string[];nativeFrames:Record<string,string>;
  contacts:{file:string;sha256:string};
};
export async function inspect(folder:string,mode:'baseline'|'enhanced',project:M3Project,pack:ArtPack){
  const m=JSON.parse(await readFile(path.join(folder,'manifest.json'),'utf8')) as Manifest;
  assert.equal(m.milestone,'M6');assert.equal(m.qualityMode,mode);
  if(process.env.SOURCE_HEAD_SHA)assert.equal(m.sourceCommit,process.env.SOURCE_HEAD_SHA,'source commit mismatch');
  const frames=m3TotalFrames(project);
  assert.equal(m.video.file,'m3-character-motion-final-1080p.mp4');
  assert.ok(/^[a-f0-9]{64}$/.test(m.video.sha256));
  assert.equal(m.video.width,1920);assert.equal(m.video.height,1080);
  assert.equal(m.video.fps,24);assert.equal(m.video.frames,frames);
  assert.equal(m.video.hasAudio,false,'this native shot is intentionally silent');
  assert.equal(m.frameHashes.length,frames);
  assert.ok(m.frameHashes.every(d=>/^[a-f0-9]{64}$/.test(d)),'M6_FRAME_DIGEST_FORMAT');
  assert.ok(Object.keys(m.nativeFrames).length>=9,'M6_NATIVE_STILLS_MISSING');
  assert.equal(m.project.file,'m3-project.json');
  const j=await readFile(path.join(folder,m.project.file),'utf8');
  assert.equal(sha(j),m.project.sha256);
  assert.deepEqual(validateM3(JSON.parse(j),pack),project);
  const video=path.join(folder,m.video.file);
  assert.equal(sha(await readFile(video)),m.video.sha256,'video source bytes tampered');
  const meta=JSON.parse(exec('ffprobe',['-v','error','-count_frames','-show_streams',
    '-show_format','-of','json',video])) as {
      streams:Array<{codec_type:string;width:number;height:number;avg_frame_rate:string;nb_read_frames:string}>;
    };
  const v=meta.streams.find(x=>x.codec_type==='video');
  assert.equal(v?.width,1920);assert.equal(v?.height,1080);
  assert.equal(v?.avg_frame_rate,'24/1');assert.equal(v?.nb_read_frames,String(frames));
  assert.ok(Math.abs(m.video.duration-frames/24)<.08,'M6_MANIFEST_DURATION_MISMATCH');
  assert.ok(!meta.streams.some(s=>s.codec_type==='audio'));
  exec('ffmpeg',['-v','error','-xerror','-nostdin','-threads','1','-i',video,
    '-threads','1','-f','null','-']);
  const selected=new Set<number>();
  for(const [file,digest] of Object.entries(m.nativeFrames)){
    const match=/^m3-final-frame-(\\d{3,4})\\.png$/.exec(file);
    if(!match)throw Error('M6_NATIVE_FRAME_PATH_INVALID: '+file);
    const frame=Number(match[1]);
    if(!Number.isSafeInteger(frame)||frame<0||frame>=frames)
      throw Error('M6_NATIVE_FRAME_RANGE_INVALID: '+file);
    selected.add(frame);
    const actual=sha(await readFile(path.join(folder,file)));
    assert.equal(actual,digest,'still frame integrity '+file);
    if(m.frameHashes[frame]!==actual)throw Error('M6_FRAME_SAMPLE_MISMATCH: '+file);
  }
  assert.ok(selected.has(0)&&selected.has(frames-1),'M6_BOUNDARY_STILLS_MISSING');
  if(m.contacts.file!=='m3-chronological-contact-sheet.png')
    throw Error('M6_CONTACT_SHEET_PATH_INVALID');
  assert.equal(sha(await readFile(path.join(folder,m.contacts.file))),m.contacts.sha256);
  return m;
}
export async function auditM6(output:string){
  const pack=JSON.parse(await readFile(path.join(root,'assets/lantern-v1/manifest.json'),'utf8')) as ArtPack;
  const baselineFolder=path.join(output,'baseline');
  const enhancedFolder=path.join(output,'enhanced');
  // Read the validated editable source actually delivered by the renderer.
  // Do not silently audit a hard-coded showcase when the user rendered a retimed
  // or near-reach M3 project through the public M3_PROJECT_FILE boundary.
  const project=validateM3(JSON.parse(await readFile(path.join(baselineFolder,'m3-project.json'),'utf8')),pack);
  const frames=m3TotalFrames(project);
  const [a,b]=await Promise.all([
    inspect(baselineFolder,'baseline',project,pack),
    inspect(enhancedFolder,'enhanced',project,pack),
  ]);
  assert.equal(a.sourceCommit,b.sourceCommit);
  assert.equal(a.project.sha256,b.project.sha256,'A/B projects differ');
  assert.equal(a.video.frames,b.video.frames);
  assert.equal(a.video.duration,b.video.duration);
  const changed=b.frameHashes.filter((digest,f)=>digest!==a.frameHashes[f]).length;
  const minimumChanged=frames===268?24:Math.max(1,Math.ceil(frames*.1));
  assert.ok(changed>=minimumChanged,'M6 A/B did not measurably change native pixels: '+changed);
  const before=evaluateM6(project,pack,'baseline');
  const after=evaluateM6(project,pack,'enhanced');
  assert.deepEqual(before.issues,[]);assert.deepEqual(after.issues,[]);
  assert.equal(before.metrics.cameraChanges,0);assert.equal(after.metrics.cameraChanges,0);
  assert.equal(before.metrics.plantedSamples,after.metrics.plantedSamples);
  assert.equal(before.metrics.heldGripSamples,after.metrics.heldGripSamples);
  assert.ok(after.metrics.maxPlantedDriftPixels<=before.metrics.maxPlantedDriftPixels+.001);
  assert.ok(after.metrics.maxGripErrorPixels<=before.metrics.maxGripErrorPixels+.001);
  const sampleFrames=[...new Set(Array.from({length:11},(_,i)=>Math.round((frames-1)*i/10)))];
  for(const f of sampleFrames){
    assert.equal(before.samples[f]?.camera,after.samples[f]?.camera,'camera mismatch');
    assert.equal(before.samples[f]?.heldGripPixels,after.samples[f]?.heldGripPixels,
      'held grip mismatch f='+f);
    assert.deepEqual(before.samples[f]?.plantedSoles,after.samples[f]?.plantedSoles);
  }
  const board=path.join(output,'m6-paired-contact-sheet.png');
  exec('ffmpeg',['-v','error','-xerror','-y',
    '-i',path.join(baselineFolder,a.contacts.file),
    '-i',path.join(enhancedFolder,b.contacts.file),
    '-filter_complex','[0:v][1:v]hstack=inputs=2','-frames:v','1',board]);
  const boardSha=sha(await readFile(board));
  await writeFile(path.join(output,'baseline-critic.json'),JSON.stringify(before,null,2)+'\n');
  await writeFile(path.join(output,'enhanced-critic.json'),JSON.stringify(after,null,2)+'\n');
  const result={
    schemaVersion:'m6-paired-audit/1',status:'PASS_TECHNICAL_ONLY',
    sourceCommit:a.sourceCommit,projectSha256:a.project.sha256,
    baseline:{...a.video,mode:'baseline'},enhanced:{...b.video,mode:'enhanced'},
    changedNativeFrames:changed,pairedContactSheet:{file:path.basename(board),sha256:boardSha},
    measurements:{baseline:before.metrics,enhanced:after.metrics},
    checks:['same validated project/camera/timeline/artpack',
      'separate genuine Chromium captures at native 1920x1080 24fps',
      'both independent full video decodes',
      'matching planted stance and hand/prop contacts',
      'native frame pixel changes; quality not judged automatically',
      'editable source and source revision SHA preserved'],
    limits:['Native M3/M6 is separate from root Studio M2/Director',
      'Both comparison clips intentionally silent; no voice quality improvement claimed',
      'Independent project validation and dynamic per-project frame count (no fixed 268-frame assumption)',
      'Art remains development asset; no new licensed art approved',
      'Subjective polish must be assessed by owner',
      'No cloth/hair solving, no general rig retargeting or arbitrary-scene support'],
  };
  await writeFile(path.join(output,'m6-paired-audit.json'),JSON.stringify(result,null,2)+'\n');
  console.log('M6_INDEPENDENT_PAIRED_MEDIA_AUDIT_PASS '+JSON.stringify({
    sourceCommit:result.sourceCommit,changedNativeFrames:changed,metrics:result.measurements,
    videoSha256s:[a.video.sha256,b.video.sha256],
  }));
  return result;
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
  const output=process.env.M6_OUTPUT_DIR?
    path.resolve(process.env.M6_OUTPUT_DIR):path.join(root,'out/product-first/m6');
  await mkdir(output,{recursive:true});
  await auditM6(output);
}
