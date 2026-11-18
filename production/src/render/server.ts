/** Local fixture server. Serves only known assets and generated trusted code;
 * user/model HTML/JS is never executed. Fault modes are test-only injection. */
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {type RenderConfig,type TextureSpec} from './browser.js';
import {validateM3,type M3Project} from '../motion/character-library.js';
import {m6DefaultQuality,parseM6Quality,type M6Quality} from '../motion/m6-quality.js';
import {validateGeneralFilm,type GeneralFilm} from '../motion/general-timeline.js';
import {validateGeneralPlaybackAgainstSolver} from '../motion/general-playback-validate.js';
import {validateM4Project,validateM4Bake} from '../physics/m4.js';
import type {M4RenderData} from '../physics/m4-adapter.js';
import {type ShotId,type Edit} from '../scene/benchmark.js';
import type {ArtPack} from '../scene/types.js';
import {phonemeCues} from '../audio/cues.js';
import {voiceFixture} from '../audio/fixture.js';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export type Fault='none'|'slow'|'404'|'corrupt'|'hash'|'timeout';
export async function serve(shot:ShotId,options:{width?:number;height?:number;edit?:Edit;fault?:Fault}={}){
 const pack=JSON.parse(await readFile(path.join(root,options.edit?.polish?'assets/lantern-polish-1/manifest.json':'assets/lantern-v1/manifest.json'),'utf8')) as ArtPack;
 const manifest=JSON.parse(await readFile(path.join(root,options.edit?.polish?'out/art-q2-polish/textures.json':'out/art-q1/textures.json'),'utf8')) as {textures:{id:string;file:string;sha256:string;width:number;height:number}[]};
 const fault=options.fault??'none',faultId='mai/head-quarter-neutral';
 const files=new Map<string,Buffer>(),textures:TextureSpec[]=[];
 for(const t of manifest.textures){
  const url=`/textures/${encodeURIComponent(t.id)}.png`;let bytes=await readFile(path.join(root,'out/art-q1',t.file));
  if(createHash('sha256').update(bytes).digest('hex')!==t.sha256)throw Error(`SOURCE_TEXTURE_HASH ${t.id}`);
  if(t.id===faultId&&fault==='corrupt')bytes=Buffer.from('not a PNG');
  files.set(url,bytes);textures.push({id:t.id,url,sha256:fault==='corrupt'&&t.id===faultId?createHash('sha256').update(bytes).digest('hex'):t.sha256,width:t.width,height:t.height});
 }
 const {manifest:voice}=await voiceFixture(options.edit);
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

/** Serve a real IR scene using the same verified native textures and Three path.
 * Keep benchmark source untouched and reject invalid configs in the browser.
 * Fresh preview & final sessions use the same pure IR evaluator. */
export async function serveIR(ir:import('../scene/animation-ir-adapter.js').StageShotTimeline,
  options:{width?:number;height?:number}={}){
  const session=await serve('S01',options);
  session.config.ir=ir;
  if(!ir.artPack || session.config.pack.version!==ir.artPack.version){
    session.close();
    throw Error('IR_ART_PACK_VERSION_MISMATCH');
  }
  return session;
}

/** M3 uses the same trusted Three texture loader and locked art-pack hashes.
 * Never serve source- or model-generated browser code. */
export async function serveM3(project:M3Project,options:{width?:number;height?:number}={}){
  const session=await serve('S01',options);
  try{session.config.m3=validateM3(project,session.config.pack);}
  catch(error){session.close();throw error;}
  return session;
}

/** Same native art, camera and timebase for M6 paired comparison.
 * Quality is a validated data-only envelope, not arbitrary browser code.
 */
export async function serveM6(project:M3Project,quality:'baseline'|'enhanced',
  controls:unknown=m6DefaultQuality,options:{width?:number;height?:number}={}){
 if(quality!=='baseline'&&quality!=='enhanced')throw Error('M6_RENDER_MODE');
 const session=await serve('S01',options);
 try{
  session.config.m6={project:validateM3(project,session.config.pack),quality,
   controls:parseM6Quality(controls) as M6Quality};
 }catch(error){session.close();throw error;}
 return session;
}

/** A validated user-editable M3 motion project is the authored input of M4.
 * Both OFF and ON use the same render backend, timeline, camera and art pack.
 * Never trust a caller's bake hash without checking input+toolchain+art.
 */
export async function serveM4(raw:M4RenderData,options:{width?:number;height?:number}={}){
 const session=await serve('S01',options);
 try{
   const project=validateM4Project(raw.project,session.config.pack);
   const bake=validateM4Bake(raw.bake,project,session.config.pack);
   if(typeof raw.enabled!=='boolean')throw Error('M4_RENDER_MODE');
   session.config.m4={project,bake,enabled:raw.enabled};
 }catch(error){session.close();throw error;}
 return session;
}

/** G3 isolated motion/physics native movie endpoint. Explicit schema and
 * bake provenance are validated before browser serving; no Director M5 code
 * or approvals are changed. */
export async function serveG3(raw:unknown,options:{width?:number;height?:number}={}){
 const session=await serve('S01',options);
 try{
   session.config.generalPlayback=await validateGeneralPlaybackAgainstSolver(raw,session.config.pack);
 }catch(error){session.close();throw error;}
 return session;
}
/** G3 standalone motion-only native review, same shaders/textures and timeline. */
export async function serveGeneral(raw:unknown,options:{width?:number;height?:number}={}){
 const session=await serve('S01',options);
 try{
   session.config.general=validateGeneralFilm(raw,session.config.pack) as GeneralFilm;
 }catch(error){session.close();throw error;}
 return session;
}
