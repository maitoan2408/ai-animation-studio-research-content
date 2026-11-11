/** Local fixture server. Serves only known assets and generated trusted code;
 * user/model HTML/JS is never executed. Fault modes are test-only injection. */
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {type RenderConfig,type TextureSpec} from './browser.js';
import {type ShotId,type Edit} from '../scene/benchmark.js';
import type {ArtPack} from '../scene/types.js';
import {phonemeCues} from '../audio/cues.js';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export type Fault='none'|'slow'|'404'|'corrupt'|'hash'|'timeout';
export async function serve(shot:ShotId,options:{width?:number;height?:number;edit?:Edit;fault?:Fault}={}){
 const pack=JSON.parse(await readFile(path.join(root,'assets/lantern-v1/manifest.json'),'utf8')) as ArtPack;
 const manifest=JSON.parse(await readFile(path.join(root,'out/art-q1/textures.json'),'utf8')) as {textures:{id:string;file:string;sha256:string;width:number;height:number}[]};
 const fault=options.fault??'none',faultId='mai/head-quarter-neutral';
 const files=new Map<string,Buffer>(),textures:TextureSpec[]=[];
 for(const t of manifest.textures){
  const url=`/textures/${encodeURIComponent(t.id)}.png`;let bytes=await readFile(path.join(root,'out/art-q1',t.file));
  if(createHash('sha256').update(bytes).digest('hex')!==t.sha256)throw Error(`SOURCE_TEXTURE_HASH ${t.id}`);
  if(t.id===faultId&&fault==='corrupt')bytes=Buffer.from('not a PNG');
  files.set(url,bytes);textures.push({id:t.id,url,sha256:fault==='corrupt'&&t.id===faultId?createHash('sha256').update(bytes).digest('hex'):t.sha256,width:t.width,height:t.height});
 }
 const voice=JSON.parse(await readFile(path.join(root,'artifacts/Q1/draft-3/voice/manifest.json'),'utf8'));
 const config:RenderConfig={pack,textures,shot,edit:{cues:phonemeCues(voice.timings),...options.edit},width:options.width??640,height:options.height??360,timeoutMs:fault==='timeout'?200:10000};
 const script=await build({entryPoints:[path.join(root,'src/render/browser.ts')],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
 const server=createServer(async(req,res)=>{
  try{
   const url=req.url??'/';
   if(url==='/app.js'){res.setHeader('content-type','text/javascript');res.end(script.outputFiles[0]!.contents);}
   else if(url==='/config.json'){res.setHeader('content-type','application/json');res.end(JSON.stringify(config));}
   else if(files.has(url)){
    if(url===textures.find(t=>t.id===faultId)!.url){
     if(fault==='404'){res.statusCode=404;res.end('fixture missing');return;}
     if(fault==='slow'||fault==='timeout')await new Promise(resolve=>setTimeout(resolve,fault==='slow'?400:900));
     if(fault==='hash'){res.end(Buffer.from('tampered'));return;}
    }
    res.setHeader('content-type','image/png');res.end(files.get(url));
   }else if(url==='/'||url==='/index.html'){res.setHeader('content-type','text/html');res.end('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;overflow:hidden"><script type="module" src="/app.js"></script></body></html>');}
   else {res.statusCode=404;res.end('not found');}
  }catch(e){res.statusCode=500;res.end(String(e));}
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const addr=server.address();if(!addr||typeof addr==='string')throw Error('NO_SERVER_PORT');
 return {url:`http://127.0.0.1:${addr.port}`,config,close:()=>{server.closeAllConnections();server.close();}};
}
