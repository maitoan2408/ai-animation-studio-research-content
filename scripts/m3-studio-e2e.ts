/** Real M3 Studio UI → saved revision → native 1080p MP4 acceptance.
 * Uses the public localhost HTTP API and genuine Chromium controls, not an
 * internally generated default-only showcase. CI uploads actual review media.
 */
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,copyFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import puppeteer from 'puppeteer-core';
import {Studio} from '../src/application.js';
import {serve} from '../src/server.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'artifacts/product-first/m3-studio');
const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
const decode=(command:string,args:string[])=>{
 const result=spawnSync(command,args,{encoding:'utf8',maxBuffer:2*1024*1024});
 assert.equal(result.status,0,command+' '+String(result.stderr||result.error));
 return result.stdout;
};
await mkdir(output,{recursive:true});
const dir=await mkdtemp(path.join(os.tmpdir(),'m3-studio-native-'));
const app=await Studio.open(dir);
const server=await serve(app,0);
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,
 args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
let completed=false;
try{
 const page=await browser.newPage();
 await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
 await page.goto(server.url+'/motion',{waitUntil:'networkidle0'});
 await page.waitForFunction(()=>document.querySelector('#character-id')?.value==='guest-01');
 const initial=await (await fetch(server.url+'/api/motion/project')).json() as {revision:string};
 assert.match(initial.revision,/^[a-f0-9]{64}$/);
 // Deliberate non-demo input: new character ID, wave-only clips, NO cup.
 await page.evaluate(()=>{
  const rows=[...document.querySelectorAll('.m3-clip')];
  for(const i of [3,1,0])rows[i]!.querySelector('button')!.click();
  const id=document.querySelector<HTMLInputElement>('#character-id')!;
  id.value='guest-qa';id.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await page.click('#motion-save');
 await page.waitForFunction(()=>document.querySelector('#motion-notice')?.textContent?.includes('Đã lưu'));
 const document=await(await fetch(server.url+'/api/motion/project')).json() as {
  revision:string;frames:number;project:{character:{id:string;capabilities:string[]};clips:Array<{action:string;frames:number}>;prop?:unknown}
 };
 assert.notEqual(document.revision,initial.revision);
 assert.equal(document.frames,49);
 assert.equal(document.project.character.id,'guest-qa');
 assert.deepEqual(document.project.character.capabilities,['wave']);
 assert.deepEqual(document.project.clips,[{action:'wave',frames:49}]);
 assert.equal(document.project.prop,undefined);
 await page.click('#motion-render');
 await page.waitForFunction(()=>document.querySelector('#motion-status')?.textContent?.includes('rendering'),
 {timeout:20000});
 let job:{id:string;status:string;frames:number;videoSha256?:string;error?:string}|undefined;
 const started=Date.now();
 while(Date.now()-started<360000){
  const snapshot=await (await fetch(server.url+'/api/motion/project')).json() as {revision:string};
  assert.equal(snapshot.revision,document.revision,'revision changed during native render');
  const jobId=await page.evaluate(()=>localStorage.getItem('m3-last-job-id'));
  assert.ok(jobId,'UI did not retain a render job ID');
  job=await(await fetch(server.url+'/api/motion/jobs/'+jobId)).json() as typeof job;
  if(job.status!=='rendering')break;
  await new Promise(r=>setTimeout(r,1000));
 }
 assert.equal(job?.status,'succeeded','M3 custom native render failed: '+String(job?.error));
 assert.equal(job?.frames,49);
 await page.waitForFunction(()=>!document.querySelector<HTMLVideoElement>('#motion-video')?.hidden,{timeout:20000});
 await page.screenshot({path:path.join(output,'m3-studio-desktop.png'),fullPage:true});
 await page.setViewport({width:390,height:844,deviceScaleFactor:1});
 await page.screenshot({path:path.join(output,'m3-studio-mobile.png'),fullPage:true});
 const movie=await readFile(path.join(dir,'motion-m3/jobs',job!.id,'m3-character-motion-final-1080p.mp4'));
 assert.equal(sha(movie),job!.videoSha256);
 const nativeDir=path.join(dir,'motion-m3/jobs',job!.id);
 const manifest=JSON.parse(await readFile(path.join(nativeDir,'manifest.json'),'utf8')) as {
  video:{sha256:string;frames:number;width:number;height:number;fps:number;file:string};
  project:{sha256:string;file:string};
  nativeFrames:Record<string,string>;
 };
 assert.equal(manifest.video.sha256,sha(movie));
 assert.equal(manifest.video.frames,49);
 assert.equal(manifest.video.width,1920);
 assert.equal(manifest.video.height,1080);
 assert.equal(manifest.video.fps,24);
 for(const name of [manifest.video.file,manifest.project.file,
    'm3-chronological-contact-sheet.png','m3-standing-vs-motion.png']){
   await copyFile(path.join(nativeDir,name),path.join(output,name));
 }
 decode('ffmpeg',['-v','error','-xerror','-nostdin','-threads','1','-i',
   path.join(output,manifest.video.file),'-threads','1','-f','null','-']);
 const probe=JSON.parse(decode('ffprobe',['-v','error','-count_frames','-show_streams',
  '-of','json',path.join(output,manifest.video.file)])) as {
  streams:Array<{codec_type:string;nb_read_frames:string;avg_frame_rate:string;width:number;height:number}>
 };
 assert.equal(probe.streams.find(s=>s.codec_type==='video')?.nb_read_frames,'49');
 assert.equal(probe.streams.some(s=>s.codec_type==='audio'),false);
 const evidence={
  milestone:'M3',kind:'STUDIO_NATIVE_CUSTOM_END_TO_END',
  sourceCommit:process.env.SOURCE_HEAD_SHA??'LOCAL_UNPINNED',
  revision:document.revision,
  jobId:job!.id,frames:49,action:'wave',
  character:'guest-qa',hasProp:false,video:manifest.video,
  files:{} as Record<string,string>,
  assertions:['Real browser UI creates edited project','Saved immutable revision and no prop',
   'Native Three/Chromium preview and final delivered through same Studio origin',
   'FFprobe exact 49 native 1080p frames, full FFmpeg decode',
   'Desktop/mobile real UI screenshots, full SHA-bound media'],
 };
 for(const name of ['m3-studio-desktop.png','m3-studio-mobile.png',manifest.video.file,
  manifest.project.file,'m3-chronological-contact-sheet.png','m3-standing-vs-motion.png']){
  evidence.files[name]=sha(await readFile(path.join(output,name)));
 }
 await writeFile(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
 console.log('M3_STUDIO_NATIVE_CUSTOM_PASS '+JSON.stringify({frames:49,revision:document.revision,
  videoSha:manifest.video.sha256,files:Object.keys(evidence.files).length}));
 completed=true;
}finally{
 await browser.close();
 await server.close();
 await app.close();
 if(completed)await rm(dir,{recursive:true,force:true});
 else console.error('M3_STUDIO_DEBUG_ROOT '+dir);
}
