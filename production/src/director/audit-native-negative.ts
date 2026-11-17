/**
 * G6 independent fail-closed replay audit on real Director outputs.
 * Works only on temporary private copies of final artifacts.
 * Never modifies published films, manifests, revisions, or owner approvals.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {root} from '../render/server.js';
import {executeNativeDirector} from './native-director.js';

const sha=(x:Uint8Array|string)=>createHash('sha256').update(x).digest('hex');
const output=path.resolve(process.env.NATIVE_DIRECTOR_OUTPUT_DIR??
  path.join(root,'out/product-first/m6-native-director-six'));
const overview=JSON.parse(await readFile(path.join(output,'six-overview.json'),'utf8')) as {
  sourceCommit:string; scenarios:Array<{
    id:string;planSha256:string;planFile:string;published:string;
    mediaFile:string;mediaSha256:string;
  }>;
};
if(process.env.SOURCE_HEAD_SHA!==overview.sourceCommit)
  throw Error('G6_NEGATIVE_SOURCE_STALE');
const picked=[overview.scenarios.find(x=>x.id==='01-an-right-cup-drop'),
  overview.scenarios.find(x=>x.id==='05-mai-left-cup-place')];
if(picked.some(x=>!x))throw Error('G6_NEGATIVE_REQUIRES_G3_AND_M3');
let assertions=0;
for(const item of picked){
  if(!item)continue;
  const tmp=await mkdtemp(path.join(os.tmpdir(),'m6-g6-negative-'));
  try{
    const plan=path.join(tmp,'projects',item.planSha256+'.json');
    const dir=path.join(tmp,'jobs',item.planSha256,'published');
    await mkdir(path.dirname(plan),{recursive:true});
    await mkdir(dir,{recursive:true});
    await copyFile(path.join(output,item.planFile),plan);
    const original=path.join(output,item.published);
    const sourceFile=item.mediaFile.startsWith('g3-')?
      'source-playback.json':'source-project.json';
    for(const f of ['manifest.json','native-director-receipt.json',
      item.mediaFile,sourceFile])
      await copyFile(path.join(original,f),path.join(dir,f));
    const receiptPath=path.join(dir,'native-director-receipt.json');
    const manifestPath=path.join(dir,'manifest.json');
    const sourcePath=path.join(dir,sourceFile);
    const moviePath=path.join(dir,item.mediaFile);
    const receiptBytes=await readFile(receiptPath);
    const manifestBytes=await readFile(manifestPath);
    const sourceBytes=await readFile(sourcePath);
    const movieBytes=await readFile(moviePath);
    const stable=await executeNativeDirector(plan,tmp);
    assert.equal(stable.mediaSha256,item.mediaSha256);
    assert.equal((await executeNativeDirector(plan,tmp)).attemptId,stable.attemptId);
    assertions+=2;
    const originalReceipt=JSON.parse(receiptBytes.toString()) as Record<string,unknown>;
    const rejectReceipt=async(change:(x:Record<string,unknown>)=>void,
      code:RegExp)=>{
      const forged=structuredClone(originalReceipt);
      change(forged);
      await writeFile(receiptPath,JSON.stringify(forged)+'\n');
      await assert.rejects(executeNativeDirector(plan,tmp),code);
      await writeFile(receiptPath,receiptBytes);
      assertions++;
    };
    await rejectReceipt(x=>{x.executor='native-unknown';},/NATIVE_DIRECTOR_RECEIPT_PROFILE_TAMPER/);
    await rejectReceipt(x=>{x.frames=Number(x.frames)+1;},/NATIVE_DIRECTOR_RECEIPT_PROFILE_TAMPER/);
    await rejectReceipt(x=>{x.fps=30;},/NATIVE_DIRECTOR_RECEIPT_PROFILE_TAMPER/);
    await rejectReceipt(x=>{x.mediaFile='../../secret.mp4';},/NATIVE_DIRECTOR_RECEIPT_PROFILE_TAMPER/);
    await rejectReceipt(x=>{x.rendererSourceSha256='f'.repeat(64);},
      /NATIVE_DIRECTOR_RENDER_SOURCE_TAMPER/);
    await rejectReceipt(x=>{x.nativeManifestSha256='f'.repeat(64);},
      /NATIVE_DIRECTOR_MANIFEST_TAMPER/);
    await rejectReceipt(x=>{x.mediaSha256='f'.repeat(64);},
      /NATIVE_DIRECTOR_MEDIA_TAMPER/);
    await writeFile(sourcePath,Buffer.concat([sourceBytes,Buffer.from(' ')]) );
    await assert.rejects(executeNativeDirector(plan,tmp),/NATIVE_DIRECTOR_RENDER_SOURCE_TAMPER/);
    await writeFile(sourcePath,sourceBytes);assertions++;
    await writeFile(manifestPath,Buffer.concat([manifestBytes,Buffer.from(' ')]) );
    await assert.rejects(executeNativeDirector(plan,tmp),/NATIVE_DIRECTOR_MANIFEST_TAMPER/);
    await writeFile(manifestPath,manifestBytes);assertions++;
    const changed=JSON.parse(manifestBytes.toString());
    changed.video.frames=Number(changed.video.frames)+1;
    const tamperedManifest=Buffer.from(JSON.stringify(changed)+'\n');
    await writeFile(manifestPath,tamperedManifest);
    const forged=structuredClone(originalReceipt);
    forged.nativeManifestSha256=sha(tamperedManifest);
    await writeFile(receiptPath,JSON.stringify(forged)+'\n');
    await assert.rejects(executeNativeDirector(plan,tmp),/NATIVE_DIRECTOR_MANIFEST_PROFILE_TAMPER/);
    await writeFile(receiptPath,receiptBytes);
    await writeFile(manifestPath,manifestBytes);assertions++;
    const damaged=Buffer.from(movieBytes);
    damaged[Math.floor(damaged.length/2)]^=1;
    await writeFile(moviePath,damaged);
    await assert.rejects(executeNativeDirector(plan,tmp),/NATIVE_DIRECTOR_MEDIA_TAMPER/);
    await writeFile(moviePath,movieBytes);assertions++;
    const originalPlan=await readFile(plan);
    const altered=Buffer.from(originalPlan.toString().replace(item.id,item.id+'-invalid'));
    await writeFile(plan,Buffer.concat([altered,Buffer.from(' ')]));
    await assert.rejects(executeNativeDirector(plan,tmp),
      /NATIVE_DIRECTOR_(STALE_PLAN|REVISION_TAMPER)/);
    await writeFile(plan,originalPlan);assertions++;
    assert.equal((await executeNativeDirector(plan,tmp)).mediaSha256,item.mediaSha256);
    assertions++;
    console.log('G6_NEGATIVE_CASES_PASSED '+item.id);
  }finally{await rm(tmp,{recursive:true,force:true});}
}
assert.equal(assertions,30);
console.log('G6_INDEPENDENT_FAIL_CLOSED_PASS '+JSON.stringify({
  sourceCommit:overview.sourceCommit,scenarios:picked.map(x=>x!.id),
  assertions,noGoldenModified:true
}));
