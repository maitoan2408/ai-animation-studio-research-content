import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {createCaptureSession,initializeSession,captureFrameToBuffer,closeCaptureSession,drainBrowserPool} from '@hyperframes/engine';
import {serve,root,type Fault} from './server.js';

 const output=path.join(root,'out/adapter-check',new Date().toISOString().replace(/[:.]/g,'-'));await mkdir(output,{recursive:true});
const cases:Record<string,unknown>[]=[];
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
try{
 for(const fault of ['none','slow','404','hash','corrupt','timeout'] as Fault[]){
  const server=await serve('S01',{fault});
  const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
  try{
   const page=await browser.newPage();await page.setViewport({width:640,height:360,deviceScaleFactor:1});
   await page.goto(server.url,{waitUntil:'domcontentloaded'});
   // Readiness must be absent during a deliberately slow required texture.
   let early:unknown=null;
   if(fault==='slow'){await new Promise(r=>setTimeout(r,150));early=await page.evaluate('({ready:window.studio?.ready,protocol:!!window.__hf})');assert.deepEqual(early,{ready:false,protocol:false});}
   await page.waitForFunction('window.studio && (window.studio.ready || window.studio.error)',{timeout:30000});
   const result=await page.evaluate('({ready:window.studio.ready,error:window.studio.error,protocol:!!window.__hf,diagnostics:window.studio.diagnostics})') as {ready:boolean;error:string|null;protocol:boolean;diagnostics:Record<string,unknown>};
   const expected:Partial<Record<Fault,string>>={'404':'ASSET_HTTP',hash:'ASSET_HASH',corrupt:'ASSET_DECODE',timeout:'ASSET_TIMEOUT'};
   if(expected[fault]){assert.equal(result.ready,false);assert.equal(result.protocol,false);assert.ok(result.error?.startsWith(expected[fault]!),JSON.stringify(result));}
   else {assert.equal(result.ready,true);assert.equal(result.protocol,true);await page.screenshot({path:path.join(output,`${fault}.png`)});}
   cases.push({fault,early,...result,pass:true});console.log(JSON.stringify(cases.at(-1)));
  }finally{await browser.close();server.close();}
 }
 const server=await serve('S05');
 const frames=[0,23,24,47,48,71,72,95,96,119,120,191],orders=[frames,[...frames].reverse(),[72,0,191,24,96,23,120,48,119,47,95,71],frames];
 let session:Awaited<ReturnType<typeof createCaptureSession>>|undefined;
 const baseline=new Map<number,{image:string;state:string}>(),samples:Record<string,unknown>[]=[];
 const create=async()=>{
  const s=await createCaptureSession(server.url,output,{width:640,height:360,fps:{num:24,den:1},format:'png'},null,
    {chromePath:'/usr/bin/chromium',forceScreenshot:true,browserGpuMode:'software',enableBrowserPool:false});
  try{await initializeSession(s);await s.page.waitForFunction('window.studio?.ready===true',{timeout:30000});return s;}
  catch(e){await closeCaptureSession(s);throw e;}
 };
 try{
  session=await create();
  for(const [pass,order] of orders.entries()){
   if(pass===3){await closeCaptureSession(session);session=await create();}
   for(const frame of order){
    const result=await captureFrameToBuffer(session,frame,frame/24),image=sha(result.buffer);
    const state=sha(await session.page.evaluate('JSON.stringify(window.studio.state)') as string);
    if(pass===0){baseline.set(frame,{image,state});await writeFile(path.join(output,`S05-${frame}.png`),result.buffer);}
    const ok=image===baseline.get(frame)!.image&&state===baseline.get(frame)!.state;
    samples.push({pass,frame,image,state,passResult:ok});assert.ok(ok,`SEEK_MISMATCH ${pass}:${frame}`);
   }
  }
 }finally{if(session)await closeCaptureSession(session);server.close();await drainBrowserPool();}
 cases.push({test:'HyperFrames actual capture seek',orders,samples,pass:true});
 await writeFile(path.join(output,'report.json'),JSON.stringify({status:'PASS',cases},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',faultCases:6,seekSamples:samples.length}));
}catch(e){await writeFile(path.join(output,'report.json'),JSON.stringify({status:'FAIL',cases,error:String(e)},null,2)+'\n');throw e;}
