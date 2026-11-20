/**
 * Renderer self-check on a real film request: texture faults must fail closed
 * before readiness, and frame capture must be identical in any seek order and
 * across fresh browser sessions.
 *   npx tsx src/render/check-renderer.ts examples/films/<film>.json
 */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {createCaptureSession,initializeSession,captureFrameToBuffer,closeCaptureSession,drainBrowserPool} from '@hyperframes/engine';
import {serveFilm,root,type Fault} from './server.js';
import {validateFilmRequest,buildPlayback} from './render-films.js';
import {loadArtPack} from '../art/pack.js';
import {browserPath} from '../art/textures.js';

const file=process.argv[2];
if(!file)throw Error('USAGE: check-renderer.ts <film.json>');
const raw=JSON.parse(await readFile(path.resolve(file),'utf8'));
const pack=await loadArtPack(path.resolve(root,String(raw.artPack)));
const request=validateFilmRequest(raw,pack);
const playback=await buildPlayback(request,pack);
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const options={artPackDir:request.artPack,width:640,height:360};
try{
 for(const fault of ['none','slow','404','hash','corrupt','timeout'] as Fault[]){
  const server=await serveFilm(playback,{...options,fault});
  const browser=await puppeteer.launch({executablePath:browserPath(),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
  try{
   const page=await browser.newPage();await page.setViewport({width:640,height:360,deviceScaleFactor:1});
   await page.goto(server.url,{waitUntil:'domcontentloaded'});
   if(fault==='slow'){
    await new Promise(r=>setTimeout(r,150));
    assert.deepEqual(await page.evaluate('({ready:window.studio?.ready,protocol:!!window.__hf})'),{ready:false,protocol:false});
   }
   await page.waitForFunction('window.studio && (window.studio.ready || window.studio.error)',{timeout:30000});
   const result=await page.evaluate('({ready:window.studio.ready,error:window.studio.error,protocol:!!window.__hf})') as {ready:boolean;error:string|null;protocol:boolean};
   const expected:Partial<Record<Fault,string>>={'404':'ASSET_HTTP',hash:'ASSET_HASH',corrupt:'ASSET_DECODE',timeout:'ASSET_TIMEOUT'};
   if(expected[fault]){
    assert.equal(result.ready,false);assert.equal(result.protocol,false);
    assert.ok(result.error?.startsWith(expected[fault]!),fault+' '+JSON.stringify(result));
   }else{assert.equal(result.ready,true);assert.equal(result.protocol,true);}
   console.log(JSON.stringify({fault,...result,pass:true}));
  }finally{await browser.close();server.close();}
 }
 const server=await serveFilm(playback,options);
 const last=playback.film.frames-1,mid=Math.floor(last/2);
 const frames=[0,1,mid-1,mid,mid+1,last-1,last];
 const orders=[frames,[...frames].reverse(),[mid,0,last,1,mid+1,last-1,mid-1],frames];
 let session:Awaited<ReturnType<typeof createCaptureSession>>|undefined;
 const baseline=new Map<number,{image:string;state:string}>();
 const create=async()=>{
  const s=await createCaptureSession(server.url,'/tmp',{width:640,height:360,fps:{num:24,den:1},format:'png'},null,
   {chromePath:browserPath(),forceScreenshot:true,browserGpuMode:'software',enableBrowserPool:false});
  try{await initializeSession(s);await s.page.waitForFunction('window.studio?.ready===true',{timeout:30000});return s;}
  catch(e){await closeCaptureSession(s);throw e;}
 };
 let samples=0;
 try{
  session=await create();
  for(const [pass,order] of orders.entries()){
   if(pass===3){await closeCaptureSession(session);session=await create();}
   for(const frame of order){
    const result=await captureFrameToBuffer(session,frame,frame/24),image=sha(result.buffer);
    const state=sha(await session.page.evaluate('JSON.stringify(window.studio.state)') as string);
    if(pass===0)baseline.set(frame,{image,state});
    assert.ok(image===baseline.get(frame)!.image&&state===baseline.get(frame)!.state,`SEEK_MISMATCH ${pass}:${frame}`);
    samples++;
   }
  }
 }finally{if(session)await closeCaptureSession(session);server.close();}
 console.log(JSON.stringify({status:'RENDERER_CHECK_PASS',film:request.id,faultCases:6,seekSamples:samples}));
}finally{await drainBrowserPool();}
