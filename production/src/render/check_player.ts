/** Actual Chromium video playback/decode/color sampling against a native PNG.
 * This records target-player evidence. Audio perception and artistic approval
 * are not inferred from playback success or a pixel measurement. */
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import puppeteer from 'puppeteer-core';
import {root} from './server.js';
const dir=path.resolve(process.argv[2]!),frame=Number(process.argv[3]??72);
if(!Number.isInteger(frame)||frame<0)throw Error('INVALID_FRAME');
const rate=Number(process.argv[4]??1);if(![.5,1].includes(rate))throw Error('INVALID_PLAYBACK_RATE');
const video=await readFile(path.join(dir,'delivery.mp4'));
const out=path.join(root,'out/player-check',randomUUID());await mkdir(out,{recursive:true});
const server=createServer((req,res)=>{
 if(req.url==='/video.mp4'){
  res.setHeader('content-type','video/mp4');res.setHeader('accept-ranges','bytes');
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if(range){
   const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),video.length-1):video.length-1;
   if(start>end||start>=video.length){res.writeHead(416,{'content-range':`bytes */${video.length}`});res.end();return;}
   res.writeHead(206,{'content-range':`bytes ${start}-${end}/${video.length}`,'content-length':end-start+1});res.end(video.subarray(start,end+1));
  }else{res.setHeader('content-length',video.length);res.end(video);}
 }
 else res.end('<body style="margin:0"><video id="v" muted preload="auto" src="/video.mp4" style="width:1920px;height:1080px"></video><canvas id="c" width="1920" height="1080" style="display:none"></canvas></body>');
});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const addr=server.address();if(!addr||typeof addr==='string')throw Error('NO_PORT');
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage();await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});await page.goto(`http://127.0.0.1:${addr.port}`);
 // A fixed browser script avoids tsx injecting Node-only __name helpers.
 const sample=await page.evaluate(`(async()=>{const f=${frame};
  const v=document.querySelector('video'),c=document.querySelector('canvas'),ctx=c.getContext('2d',{colorSpace:'srgb'});
  if(v.readyState<2)await new Promise(r=>v.addEventListener('loadeddata',()=>r(),{once:true}));
  if(f>=Math.round(v.duration*24))throw Error('FRAME_OUT_OF_RANGE');
  // seeked alone can leave the old decoded image on an off-screen video.
  // Keep the video visible and require compositor mediaTime, not currentTime.
  const seekPresented=async(frame)=>new Promise((resolve,reject)=>{
   const observed=[];
   const timer=setTimeout(()=>reject(Error('PRESENTED_FRAME_TIMEOUT '+JSON.stringify({frame,currentTime:v.currentTime,observed}))),10000);
   const observe=(_now,meta)=>{
    observed.push(meta.mediaTime);
    if(Math.abs(meta.mediaTime-frame/24)<1/48){clearTimeout(timer);resolve(meta.mediaTime);}
    else v.requestVideoFrameCallback(observe);
   };
   v.requestVideoFrameCallback(observe);v.currentTime=(frame+.1)/24;
  });
  const presentedMediaTime=await seekPresented(f);ctx.drawImage(v,0,0);
  const sampled=c.toDataURL('image/png');window.seekAuditFrame=seekPresented;
  return {sampled,presentedMediaTime};
 })()` ) as {sampled:string;presentedMediaTime:number};
 // Keep an actual compositor screenshot as well: canvas drawImage may use a
 // different transfer path from displayed HTML video on a given platform.
 await page.screenshot({path:path.join(out,'compositor.png')});
 const playback=await page.evaluate(`(async()=>{const rate=${rate};
  const v=document.querySelector('video');await window.seekAuditFrame(0);
  v.playbackRate=rate;const before=v.getVideoPlaybackQuality();
  const ended=new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('PLAYBACK_TIMEOUT')),1000*(v.duration/rate*2+5));
   v.addEventListener('ended',()=>{clearTimeout(timer);resolve();},{once:true});
   v.addEventListener('error',()=>{clearTimeout(timer);reject(Error('VIDEO_PLAYBACK_ERROR'));},{once:true});
  });
  const began=performance.now();await v.play();await ended;
  const quality=v.getVideoPlaybackQuality();return {elapsedSeconds:(performance.now()-began)/1000,duration:v.duration,ended:v.ended,width:v.videoWidth,height:v.videoHeight,decoded:quality.totalVideoFrames-before.totalVideoFrames,dropped:quality.droppedVideoFrames-before.droppedVideoFrames};
 })()` ) as {elapsedSeconds:number;duration:number;ended:boolean;width:number;height:number;decoded:number;dropped:number};
 const report={...sample,...playback};
 await writeFile(path.join(out,'player.png'),Buffer.from(report.sampled.split(',')[1]!,'base64'));
 const {sampled,...metadata}=report;await writeFile(path.join(out,'report.json'),JSON.stringify({frame,rate,deliverySha256:createHash('sha256').update(video).digest('hex'),browser:await browser.version(),...metadata,scope:'Visible HTML video playback, muted; counts exclude seeking. No listening/creative gate'},null,2)+'\n');
 console.log(JSON.stringify({output:out,...metadata}));
}finally{await browser.close();server.closeAllConnections();server.close();}
