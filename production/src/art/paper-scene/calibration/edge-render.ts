import {build} from 'esbuild';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {createServer} from 'node:http';import path from 'node:path';import {fileURLToPath} from 'node:url';import puppeteer from 'puppeteer-core';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),source=process.argv[2];if(!source)throw Error('EDGE_FIXTURE_SOURCE');
const data=JSON.parse(await readFile(path.resolve(source),'utf8')),item=data.textures.textures.find((x:{id:string})=>x.id==='props/lantern-lit');if(!item)throw Error('EDGE_FIXTURE_TEXTURE');
const bytes=await readFile(path.resolve(root,'out/art-q1',item.file));if(createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('EDGE_FIXTURE_HASH');
const server=createServer((_req,res)=>{res.setHeader('content-type','image/png');res.setHeader('access-control-allow-origin','*');res.end(bytes);});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const addr=server.address();if(!addr||typeof addr==='string')throw Error('EDGE_FIXTURE_SERVER');
const built=await build({entryPoints:[path.join(root,'src/art/paper-scene/calibration/edge-browser.ts')],bundle:true,write:false,format:'iife',platform:'browser'});
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
try{const p=await browser.newPage(),errors:string[]=[];p.on('pageerror',e=>errors.push(String(e)));await p.setContent('<!doctype html><body></body>');await p.evaluate(u=>{(window as any).edgeUrl=u;},`http://127.0.0.1:${addr.port}/texture.png`);await p.addScriptTag({content:built.outputFiles[0]!.text});
 await p.waitForFunction('window.edgeDone||window.edgeFailure',{timeout:60000});const state=await p.evaluate(()=>({result:(window as any).edgeDone,error:(window as any).edgeFailure}));
 if(state.error||errors.length||state.result?.increased!==0||state.result?.thresholdAdded!==0||state.result?.reduced<1)throw Error('EDGE_FIXTURE_FAILED '+JSON.stringify({state,errors}));
 console.log(JSON.stringify({status:'PASS_ISOLATED_INWARD_ALPHA',textureSha256:item.sha256,...state.result}));
}finally{await browser.close();server.closeAllConnections();server.close();}
