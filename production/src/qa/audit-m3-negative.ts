/** Genuine corruption tests against the post-result consumer, on private copies. */
import assert from 'node:assert/strict';
import {cp,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {root} from '../render/server.js';
const source=path.join(root,'out/product-first/m3');
const parent=await mkdtemp('/tmp/m3-negative-audit-');
const results:Array<{file:string;status:string}>=[];
try{
 for(const file of ['m3-project.json','m3-character-motion-final-1080p.mp4','m3-final-frame-036.png']){
  const out=path.join(parent,String(results.length));
  await cp(source,out,{recursive:true});
  const target=path.join(out,file),bytes=await readFile(target);
  bytes[Math.floor(bytes.length/2)]!^=1;
  await writeFile(target,bytes);
  const result=spawnSync(process.execPath,['--import','tsx',path.join(root,'src/qa/audit-m3.ts')],
    {cwd:root,env:{...process.env,M3_AUDIT_DIR:out},encoding:'utf8',timeout:60000});
  assert.equal(result.error,undefined);
  assert.notEqual(result.status,0,'corrupt '+file+' was accepted');
  const report=JSON.parse(await readFile(path.join(out,'m3-post-result-audit.json'),'utf8'));
  assert.equal(report.status,'FAIL');
  assert.match(report.error,/SHA mismatch|stale visual snapshot/,'audit failed for an unrelated reason');
  results.push({file,status:'REJECTED'});
 }
 await writeFile(path.join(source,'m3-negative-audit.json'),JSON.stringify({status:'PASS',checks:results},null,2)+'\n');
 console.log('M3_CORRUPTION_REGRESSION_PASS '+JSON.stringify(results));
}finally{await rm(parent,{recursive:true,force:true});}
