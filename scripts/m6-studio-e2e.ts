/** M6 real browser quality selection -> saved M3 project -> native MP4.
 * Product-level positive path (not a unit-only mode-flag test).
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdtemp,mkdir,readFile,copyFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
import {Studio} from '../src/application.js';
import {serve} from '../src/server.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'artifacts/product-first/m6-studio');
const digest=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex');
const probe=(file:string)=>{
  const result=spawnSync('ffprobe',['-v','error','-count_frames','-show_streams','-of','json',file],
    {encoding:'utf8'});
  if(result.error||result.status!==0)throw Error('M6_STUDIO_FFPROBE '+result.stderr);
  return JSON.parse(result.stdout) as {streams:Array<{
    codec_type:string;nb_read_frames:string;avg_frame_rate:string;width:number;height:number
  }>};
};
await mkdir(output,{recursive:true});
const store=await mkdtemp(path.join(os.tmpdir(),'m6-studio-native-'));
const app=await Studio.open(store);
const server=await serve(app,0);
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,
 args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
let passed=false;
try{
  const page=await browser.newPage();
  await page.setViewport({width:1365,height:900,deviceScaleFactor:1});
  await page.goto(server.url+'/motion',{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>
    (document.querySelector<HTMLInputElement>('#character-id')?.value??'')==='guest-01');
  const initial=await (await fetch(server.url+'/api/motion/project')).json() as {
    revision:string;frames:number;
  };
  assert.equal(initial.frames,268);
  await page.select('#motion-quality','enhanced');
  await page.$eval('#character-id',element=>{
    const id=element as HTMLInputElement;
    id.value='guest-m6-real-ui';
    id.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.click('#motion-save');
  await page.waitForFunction(()=>
    document.querySelector('#motion-notice')?.textContent?.includes('Đã lưu'));
  const saved=await (await fetch(server.url+'/api/motion/project')).json() as {
    revision:string;frames:number;project:{character:{id:string}};
  };
  assert.notEqual(saved.revision,initial.revision);
  assert.equal(saved.project.character.id,'guest-m6-real-ui');
  assert.equal(saved.frames,268);
  assert.equal(await page.$eval('#motion-quality',el=>(el as HTMLSelectElement).value),'enhanced');
  await page.click('#motion-render');
  await page.waitForFunction(()=>!!localStorage.getItem('m3-last-job-id'),{timeout:20000});
  const jobId=await page.evaluate(()=>localStorage.getItem('m3-last-job-id'));
  assert.ok(jobId);
  let done:{status:string;frames:number;qualityMode?:string;videoSha256?:string;error?:string}|undefined;
  for(let attempt=0;attempt<420;attempt++){
    const response=await fetch(server.url+'/api/motion/jobs/'+jobId);
    assert.equal(response.status,200);
    done=await response.json() as typeof done;
    if(done!.status!=='rendering')break;
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  assert.equal(done?.status,'succeeded','M6 Studio positive native mode failed: '+done?.error);
  assert.equal(done.qualityMode,'enhanced');
  assert.equal(done.frames,268);
  await page.waitForFunction(()=>
    (document.querySelector('#motion-status')?.textContent??'').includes('M6 quality'),
  {timeout:30000});
  await page.waitForFunction(()=>
    (document.querySelector<HTMLVideoElement>('#motion-video')?.videoWidth??0)===1920,
  {timeout:30000});
  const videoUrl=server.url+'/api/motion/jobs/'+jobId+'/video';
  const response=await fetch(videoUrl);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),'video/mp4');
  const media=Buffer.from(await response.arrayBuffer());
  assert.equal(digest(media),done.videoSha256);
  const jobDir=path.join(store,'motion-m3/jobs',jobId);
  const manifest=JSON.parse(await readFile(path.join(jobDir,'manifest.json'),'utf8')) as {
    milestone:string;qualityMode:string;video:{sha256:string;frames:number;file:string};
    project:{file:string;sha256:string};
  };
  assert.equal(manifest.milestone,'M6');assert.equal(manifest.qualityMode,'enhanced');
  assert.equal(manifest.video.sha256,done.videoSha256);
  const movie=path.join(jobDir,manifest.video.file);
  assert.equal(digest(await readFile(movie)),done.videoSha256);
  const streams=probe(movie).streams;
  const stream=streams.find(s=>s.codec_type==='video');
  assert.equal(stream?.width,1920);assert.equal(stream?.height,1080);
  assert.equal(stream?.nb_read_frames,'268');assert.equal(stream?.avg_frame_rate,'24/1');
  assert.equal(streams.some(s=>s.codec_type==='audio'),false);
  await copyFile(movie,path.join(output,'m6-studio-real-ui.mp4'));
  await copyFile(path.join(jobDir,manifest.project.file),path.join(output,'m6-studio-project.json'));
  await page.screenshot({path:path.join(output,'m6-studio-desktop.png'),fullPage:true});
  const evidence={milestone:'M6',gate:'TECHNICAL_PRODUCT_VERIFICATION_ONLY',
    sourceCommit:process.env.SOURCE_HEAD_SHA??'LOCAL_UNPINNED',qualityMode:done.qualityMode,
    revisedProject:saved.revision,character:saved.project.character.id,
    jobId,frames:done.frames,videoSha256:done.videoSha256,
    tests:['real browser selected enhanced quality','edited and saved versioned project',
      'native Chromium/Three renderer produced verified 268 frames','Studio returned correct quality metadata',
      'same-origin MP4 played in browser metadata','video SHA equals exported job and file']};
  await writeFile(path.join(output,'m6-studio-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('M6_STUDIO_REAL_ENHANCED_PASS '+JSON.stringify(evidence));
  passed=true;
}finally{
  await browser.close();
  await server.close();
  await app.close();
  if(passed)await rm(store,{recursive:true,force:true});
  else console.error('M6_STUDIO_DEBUG_ROOT '+store);
}
