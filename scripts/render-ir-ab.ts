import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Studio } from '../src/application.js';
import { compile, qcVideo } from '../src/render.js';
import { doctor } from '../src/process.js';
import { toAnimationIR, toLegacyProjectSpec } from '../src/animation-ir.js';
import { frameSvg } from '../src/rig.js';
import { createRenderJob, executeRenderJob } from '@hyperframes/producer';
import { drainBrowserPool } from '@hyperframes/engine';

/**
 * Real M1 A/B proof. Render independent videos via both compilers, decode
 * ALL frames and audio, and publish only if parity checks succeed.
 */
function exec(name:string,args:string[]):Buffer {
  const result=spawnSync(name,args,{maxBuffer:100*1024*1024});
  if(result.status!==0 || result.error)
    throw new Error(name+' exit='+result.status+' '+(result.stderr?.toString()||String(result.error)).slice(-3000));
  return result.stdout;
}
function sha(data:Buffer):string { return createHash('sha256').update(data).digest('hex'); }
const out=path.resolve('artifacts/product-first/m1');
const temp=await mkdtemp(path.join(os.tmpdir(),'studio-m1-ir-ab-'));
await mkdir(out,{recursive:true});
const app=await Studio.open(path.join(temp,'data'));
try {
  const runtime=await doctor();
  process.env.HYPERFRAMES_BROWSER_PATH=runtime.browser;
  process.env.HYPERFRAMES_CACHE_DIR=path.join(temp,'browser-cache');
  process.env.HYPERFRAMES_NO_TELEMETRY='1';
  process.env.PRODUCER_BROWSER_GPU='false';

  const script=await readFile('examples/smoke.txt','utf8');
  const project=await app.create(script,'M1 AnimationIR A/B','paper-cut','vi');
  const revision=await app.voice(project.id,project.currentRevisionId);
  const spec=revision.spec;
  const ir=toAnimationIR(spec);
  assert.deepEqual(toLegacyProjectSpec(ir),spec);
  const sourceSamples=[0,1,12,23,24,47,48,49,72,94,95];
  for(const i of sourceSamples)
    assert.equal(frameSvg(spec,i),frameSvg(toLegacyProjectSpec(ir),i));
  const results=[];
  for(const mode of ['legacy','ir'] as const) {
    const comp=path.join(temp,'comp-'+mode);
    await compile(app.store,spec,'preview',comp,mode);
    const file=path.join(out,'m1-'+mode+'.mp4');
    const job=createRenderJob({
      fps:24,format:'mp4',quality:'standard',workers:1,
      strictness:'strict',maxRenderMs:900000,crf:18,
      logger:{error:console.error,warn:console.warn,info:()=>{},debug:()=>{}},
    });
    await executeRenderJob(job,comp,file,async()=>{},new AbortController().signal);
    const qc=await qcVideo(file,spec,'preview');
    assert.equal(qc.frames,96);
    const bytes=await readFile(file);
    results.push({mode,file:path.relative(process.cwd(),file),sha256:sha(bytes),sizeBytes:bytes.length,qc});
  }
  const a=path.join(out,'m1-legacy.mp4');
  const b=path.join(out,'m1-ir.mp4');
  const videoFrames=(p:string)=>exec('ffmpeg',['-v','error','-xerror','-i',p,'-map','0:v:0','-f','framemd5','-']);
  const av=videoFrames(a),bv=videoFrames(b);
  assert.equal(sha(av),sha(bv),'IR and legacy decoded image frames differ');
  const audio=(p:string)=>exec('ffmpeg',['-v','error','-xerror','-i',p,'-map','0:a:0','-ac','1','-ar','48000','-f','s16le','-']);
  const aa=audio(a),ba=audio(b);
  assert.equal(sha(aa),sha(ba),'IR and legacy decoded voice differ');
  exec('ffmpeg',[
    '-v','error','-xerror','-y','-i',b,'-an',
    '-vf','select=eq(n\\,0)+eq(n\\,24)+eq(n\\,48)+eq(n\\,95),scale=480:270,tile=4x1',
    '-frames:v','1',path.join(out,'m1-ir-contact.png'),
  ]);
  const image=await readFile(path.join(out,'m1-ir-contact.png'));
  assert.deepEqual([...image.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  const manifest={
    milestone:'M1',
    status:'TECHNICAL_PARITY_READY_FOR_USER_REVIEW_NOT_ART_ACCEPTANCE',
    commit:process.env.GITHUB_SHA||'LOCAL_UNPINNED',
    source:'examples/smoke.txt',
    verification:'two independent HyperFrames MP4 renders, full frame+audio decoded parity',
    decodedFrameMD5Sha256:sha(av),
    decodedAudioSha256:sha(aa),
    media:results,
    contact:{file:'artifacts/product-first/m1/m1-ir-contact.png',sha256:sha(image)},
  };
  await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log('M1_AB_VISUAL_GATE_PASS '+JSON.stringify({
    decodedFrameMD5Sha256:manifest.decodedFrameMD5Sha256,
    decodedAudioSha256:manifest.decodedAudioSha256,
    media:results.map(x=>x.file),
  }));
} finally {
  await app.close();
  await drainBrowserPool();
  await rm(temp,{recursive:true,force:true});
}
