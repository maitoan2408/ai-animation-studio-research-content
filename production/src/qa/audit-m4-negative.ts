/** Corrupt private copies of real native output; prove the consumer fails closed. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {cp,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {root} from '../render/server.js';
const sha=(x:string|Uint8Array)=>createHash('sha256').update(x).digest('hex');
const source=path.resolve(process.env.M4_OUTPUT_DIR??path.join(root,'out/product-first/m4'));
const parent=await mkdtemp('/tmp/m4-negative-audit-');
const results:Array<{case:string;status:string;error:string}>=[];
try{
 for(const kind of ['project','video','still','missing-still','source','rehashed-trajectory','off-as-on','rehashed-still','rehashed-comparison']){
  const out=path.join(parent,kind);await cp(source,out,{recursive:true});
  const manifestPath=path.join(out,'manifest.json');
  const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  const expected:Record<string,RegExp>={project:/M4_DELIVERY_HASH/,video:/M4_DELIVERY_HASH/,
   still:/M4_DELIVERY_HASH/,'missing-still':/M4_NATIVE_STILLS_MISSING/,source:/M4_SOURCE_COMMIT/,
   'rehashed-trajectory':/M4_RECOMPUTED_BAKE_MISMATCH/,'off-as-on':/M4_DECODED_OFF_ON_IDENTICAL/,'rehashed-still':/M4_NATIVE_FRAME_BINDING/,
   'rehashed-comparison':/M4_COMPARISON_NOT_FROM_FILMS/};
  if(['project','video','still'].includes(kind)){
   const file=kind==='project'?manifest.project.file:kind==='video'?manifest.videos.on.name:
     Object.keys(manifest.videos.on.nativeStills)[0];
   const target=path.join(out,file),bytes=await readFile(target);
   bytes[Math.floor(bytes.length/2)]!^=1;await writeFile(target,bytes);
  }else if(kind==='rehashed-still'){
   const files=Object.keys(manifest.videos.on.nativeStills);
   const bytes=await readFile(path.join(out,files[1]!));
   await writeFile(path.join(out,files[0]!),bytes);manifest.videos.on.nativeStills[files[0]!]=sha(bytes);
  }else if(kind==='rehashed-comparison'){
   const bytes=await readFile(path.join(out,'m4-off-contact-sheet.png'));
   await writeFile(path.join(out,manifest.comparison.file),bytes);manifest.comparison.sha256=sha(bytes);
  }else if(kind==='missing-still')delete manifest.videos.on.nativeStills[Object.keys(manifest.videos.on.nativeStills)[0]!];
  else if(kind==='source')manifest.sourceCommit='LOCAL_UNPINNED';
  else if(kind==='off-as-on'){
   const bytes=await readFile(path.join(out,manifest.videos.off.name));
   await writeFile(path.join(out,manifest.videos.on.name),bytes);manifest.videos.on.sha256=sha(bytes);
  }else{
   const file=path.join(out,manifest.bake.file),bake=JSON.parse(await readFile(file,'utf8'));
   bake.frames[bake.releaseFrame+10].centerX+=1;
   const {bakeSha256,...payload}=bake;bake.bakeSha256=sha(JSON.stringify(payload));
   const bytes=JSON.stringify(bake,null,2)+'\n';await writeFile(file,bytes);
   manifest.bake.sha256=sha(bytes);manifest.bake.receipt=bake.bakeSha256;
  }
  await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  const result=spawnSync(process.execPath,['--import','tsx',path.join(root,'src/qa/audit-m4.ts')],
   {cwd:root,env:{...process.env,M4_OUTPUT_DIR:out},encoding:'utf8',timeout:120000});
  assert.equal(result.error,undefined);assert.notEqual(result.status,0,'accepted '+kind);
  const report=JSON.parse(await readFile(path.join(out,'m4-post-result-audit.json'),'utf8'));
  assert.equal(report.status,'FAIL','stale PASS retained');assert.match(report.error,expected[kind]!);
  results.push({case:kind,status:'REJECTED',error:report.error});
 }
 await writeFile(path.join(source,'m4-negative-audit.json'),JSON.stringify({status:'PASS',checks:results},null,2)+'\n');
 console.log('M4_CORRUPTION_REGRESSION_PASS '+JSON.stringify(results));
}finally{await rm(parent,{recursive:true,force:true});}
