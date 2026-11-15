/** Reproducible delegated-agent audit; expected failures are not approved media.
 * Usage: node --import tsx <this file> <exported project> <final MP4> <evidence dir>
 */
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { Studio } from '../../../src/application.js';
import { serve } from '../../../src/server.js';
import { run } from '../../../src/process.js';
import { hash } from '../../../src/domain.js';
import { checkM2Media } from '../../../scripts/m2-media-parity.js';
const [packageFile, video, evidence] = process.argv.slice(2);
assert.ok(packageFile && video && evidence);
await mkdir(evidence, {recursive:true});
const root=await mkdtemp('/tmp/m2-negative-');
const app=await Studio.open(root);
const server=await serve(app,0);
const browser=await puppeteer.launch({executablePath:process.env.STUDIO_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const checks=[];
try {
 const portable=JSON.parse(await readFile(packageFile,'utf8'));
 const changed=structuredClone(portable); changed.spec.scenes[0].color='#00ff00';
 const p=await app.import(changed), r=(await app.store.current(p.id)).revision;
 const colorEvidence=path.join(evidence,'wrong-revision'); await mkdir(colorEvidence,{recursive:true});
 await assert.rejects(()=>checkM2Media(browser,app.store,r.spec,server.url+'/api/projects/'+p.id+'/preview?revision='+r.id,video,colorEvidence), error=>{
  if (!(error instanceof assert.AssertionError) || !error.message.startsWith('Preview/final pixel mismatch:')) return false;
  checks.push({case:'Stale video after visible scene edit',status:'EXPECTED_REJECTION',message:error.message});return true;
 });
 const original=await app.import(portable), rev=(await app.store.current(original.id)).revision;
 const delayed=path.join(root,'delayed-audio.mp4');
 await run('ffmpeg',['-v','error','-nostdin','-y','-i',video,'-map','0:v:0','-map','0:a:0','-af','adelay=250:all=1,apad','-c:v','copy','-c:a','aac','-ar','48000','-t','24',delayed]);
 const audioEvidence=path.join(evidence,'delayed-voice'); await mkdir(audioEvidence,{recursive:true});
 await assert.rejects(()=>checkM2Media(browser,app.store,rev.spec,server.url+'/api/projects/'+original.id+'/preview?revision='+rev.id,delayed,audioEvidence),error=>{
  if (!(error instanceof assert.AssertionError) || !error.message.includes('encoded voice differs or is shifted:')) return false;
  checks.push({case:'Encoded voice shifted 250 ms',status:'EXPECTED_REJECTION',message:error.message});return true;
 });
 const report={status:'PASS',reviewer:'delegated-agent',meaning:'Independent consumer-path negative checks by same agent, not independent human approval',videoSha256:hash(await readFile(video)),scriptSha256:hash(await readFile(new URL(import.meta.url))),checks};
 await writeFile(path.join(evidence,'negative-media-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} finally {await browser.close();await server.close();await app.close();await rm(root,{recursive:true,force:true});}
