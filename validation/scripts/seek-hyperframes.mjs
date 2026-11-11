import {createFileServer} from '@hyperframes/producer';
import {createCaptureSession,initializeSession,captureFrameToBuffer,closeCaptureSession,drainBrowserPool} from '@hyperframes/engine';
import {writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const frames=[0,23,24,47,48,71,72,95,96,119,120,239];
const orders=[frames,[...frames].reverse(),[72,0,239,24,96,23,120,48,119,47,95,71],frames];
const server=await createFileServer({projectDir:`${root}/fixtures/hyperframes-study`,fps:{num:24,den:1}});
const results=[]; const baseline={};
await mkdir(`${root}/out`,{recursive:true});
let session;
const create=async()=>{
 const s=await createCaptureSession(server.url,`${root}/out/hf-seek`,{width:640,height:360,fps:{num:24,den:1},format:'png'},null,
 {chromePath:'/usr/bin/chromium',forceScreenshot:true,browserGpuMode:'software',enableBrowserPool:false});
 await initializeSession(s);return s;
};
try {
 session=await create();
 for(let pass=0;pass<orders.length;pass++){
  if(pass===3){await closeCaptureSession(session);session=await create();}
  for(const f of orders[pass]){
   const r=await captureFrameToBuffer(session,f,f/24);
   const buffer=r.buffer;
   const hash=createHash('sha256').update(buffer).digest('hex');
   if(pass===0){baseline[f]=hash;await writeFile(`${root}/out/hyperframes-${f}.png`,buffer);}
   const state=await session.page.evaluate(()=>({html:document.querySelector('#scene').innerHTML,clipVisible:getComputedStyle(document.querySelector('#window')).display!=='none'}));
   results.push({pass,frame:f,hash,matchesBaseline:hash===baseline[f],clipVisible:state.clipVisible,stateHash:createHash('sha256').update(state.html).digest('hex')});
  }
 }
}finally{if(session)await closeCaptureSession(session);server.close();await drainBrowserPool();}
await writeFile(`${root}/evidence/hyperframes-seek.json`,JSON.stringify({orders,results},null,2)+'\n');
console.log(JSON.stringify({samples:results.length,failures:results.filter(x=>!x.matchesBaseline)}));
if(results.some(x=>!x.matchesBaseline))process.exitCode=1;
