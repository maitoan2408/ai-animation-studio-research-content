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
import {makeM3Showcase,validateM3,type M3Project} from '../motion/character-library.js';
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
async function inspect(folder:string,mode:'baseline'|'enhanced',project:M3Project,pack:ArtPack){
  const m=JSON.parse(await readFile(path.join(folder,'manifest.json'),'utf8')) as Manifest;
  assert.equal(m.milestone,'M6');assert.equal(m.qualityMode,mode);
  assert.equal(m.video.file,'m3-character-motion-final-1080p.mp4');
  assert.ok(/^[a-f0-9]{64}$/.test(m.video.sha256));
  assert.equal(m.video.width,1920);assert.equal(m.video.height,1080);
  assert.equal(m.video.fps,24);assert.equal(m.video.frames,268);
  assert.equal(m.video.hasAudio,false,'this native shot is intentionally silent');
  assert.equal(m.frameHashes.length,m.video.frames);
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
  assert.equal(v?.avg_frame_rate,'24/1');assert.equal(v?.nb_read_frames,'268');
  assert.ok(!meta.streams.some(s=>s.codec_type==='audio'));
  exec('ffmpeg',['-v','error','-xerror','-nostdin','-threads','1','-i',video,
    '-threads','1','-f','null','-']);
  for(const [file,digest] of Object.entries(m.nativeFrames)){
    assert.equal(sha(await readFile(path.join(folder,file))),digest,'still frame integrity '+file);
  }
  assert.equal(sha(await readFile(path.join(folder,m.contacts.file))),m.contacts.sha256);
  return m;
}
export async function auditM6(output:string){
  const pack=JSON.parse(await readFile(path.join(root,'assets/lantern-v1/manifest.json'),'utf8')) as ArtPack;
  const project=makeM3Showcase(pack,'guest-01','an');
  const baselineFolder=path.join(output,'baseline');
  const enhancedFolder=path.join(output,'enhanced');
  const [a,b]=await Promise.all([
    inspect(baselineFolder,'baseline',project,pack),
    inspect(enhancedFolder,'enhanced',project,pack),
  ]);
  assert.equal(a.sourceCommit,b.sourceCommit);
  assert.equal(a.project.sha256,b.project.sha256,'A/B projects differ');
  assert.equal(a.video.frames,b.video.frames);
  assert.equal(a.video.duration,b.video.duration);
  const changed=b.frameHashes.filter((digest,f)=>digest!==a.frameHashes[f]).length;
  assert.ok(changed>=24,'M6 A/B did not measurably change native pixels: '+changed);
  const before=evaluateM6(project,pack,'baseline');
  const after=evaluateM6(project,pack,'enhanced');
  assert.deepEqual(before.issues,[]);assert.deepEqual(after.issues,[]);
  assert.equal(before.metrics.cameraChanges,0);assert.equal(after.metrics.cameraChanges,0);
  assert.equal(before.metrics.plantedSamples,after.metrics.plantedSamples);
  assert.equal(before.metrics.heldGripSamples,after.metrics.heldGripSamples);
  assert.ok(after.metrics.maxPlantedDriftPixels<=before.metrics.maxPlantedDriftPixels+.001);
  assert.ok(after.metrics.maxGripErrorPixels<=before.metrics.maxGripErrorPixels+.001);
  for(const f of [0,12,36,72,73,121,147,171,195,218,267]){
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
