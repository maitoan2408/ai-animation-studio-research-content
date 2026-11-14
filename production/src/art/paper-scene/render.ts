/** Local hash-verified actual S05 comparison; never publishes as final render. */
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const sha=(x:Buffer)=>createHash('sha256').update(x).digest('hex');
const source=process.argv[2];if(!source)throw Error('USAGE_S05_JSON_REQUIRED');
const frameNumber=process.argv[3]===undefined?108:Number(process.argv[3]);
if(!Number.isInteger(frameNumber)||frameNumber<0||frameNumber>=192)throw Error('SCENE_FRAME_RANGE');
const bytes=await readFile(path.resolve(source)),data=JSON.parse(bytes.toString());
const alpha=JSON.parse(await readFile(path.join(path.dirname(path.resolve(source)),'alpha-critic.json'),'utf8'));
if(alpha.sourceSha256!==sha(bytes)||alpha.frames!==192||alpha.alphaThreshold!==128||
 alpha.overlap['mai.torso'].length||alpha.overlap['an.torso'].length)throw Error('SCENE_ALPHA_GATE');
const contourPath=process.argv[4]?path.resolve(process.argv[4]):path.join(root,'artifacts/quality/v2-f2/s05-binary-contours.json');
const contourBytes=await readFile(contourPath);
const contour=JSON.parse(contourBytes.toString());
const frame=data.frames[frameNumber];if(!frame||data.shot!=='S05'||data.fps!==24)throw Error('SCENE_SOURCE');
const used=new Set(frame.sprites.map((s:{asset:string})=>s.asset)),files=new Map<string,Buffer>(),urls:Record<string,string>={};
for(const entry of data.textures.textures){
 if(!used.has(entry.id))continue;
 const a=data.pack.assets.find((x:{id:string})=>x.id===entry.id);if(!a||a.sha256!==entry.sourceSha256)throw Error('SCENE_ART_HASH');
 const file=await readFile(path.resolve(root,'out/art-q1',entry.file));if(sha(file)!==entry.sha256)throw Error('SCENE_TEXTURE_HASH');
 const c=contour.assets.find((x:{id:string})=>x.id===entry.id);
 if(c&&(c.textureSha256!==entry.sha256||c.sourceSha256!==a.sha256))throw Error('SCENE_CONTOUR_HASH');
 const url=`/texture/${encodeURIComponent(entry.id)}`;files.set(url,file);urls[entry.id]=url;
}
if(Object.keys(urls).length!==used.size)throw Error('SCENE_TEXTURE_COVERAGE');
const bundle=await build({entryPoints:[path.join(root,'src/art/paper-scene/browser.ts')],bundle:true,write:false,format:'iife',platform:'browser'});
const server=createServer((req,res)=>{if(req.url==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><html><body style="margin:0"></body></html>');return;}const file=files.get(req.url??'');if(!file){res.statusCode=404;res.end();return;}res.setHeader('content-type','image/png');res.end(file);});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=server.address();if(!address||typeof address==='string')throw Error('SCENE_SERVER');
const base=`http://127.0.0.1:${address.port}`,output=path.join(root,'out/paper-scene',randomUUID());await mkdir(output,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
try{
 const reports=[];
 for(const mode of ['flat','volume'] as const){
  const page=await browser.newPage();await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
  page.on('requestfailed',r=>errors.push(`REQUEST ${r.url()} ${r.failure()?.errorText}`));
  page.on('response',r=>{if(r.status()>=400 && r.url().includes('/texture/'))errors.push(`HTTP ${r.status()} ${r.url()}`);});
  await page.goto(base+'/');
  const absoluteUrls=Object.fromEntries(Object.entries(urls).map(([k,v])=>[k,base+v]));
  await page.evaluate(input=>{(window as any).sceneInput=input;},{pack:data.pack,frame,contours:contour.assets,mode,textureUrls:absoluteUrls});
  await page.addScriptTag({content:bundle.outputFiles[0]!.text});
  await page.waitForFunction('window.sceneReady||window.sceneError',{timeout:60000});
  const state=await page.evaluate(()=>({stats:(window as any).sceneStats,error:(window as any).sceneError}));
  if(state.error||errors.length)throw Error(`SCENE_BROWSER ${state.error} ${errors.join(' ')}`);
  const imagePath=path.join(output,`${mode}.png`);await page.screenshot({path:imagePath});
  reports.push({...state.stats,sha256:sha(await readFile(imagePath))});await page.close();
 }
 const result={status:'PARTIAL_SCENE_EXPERIMENT',frame:frameNumber,inputSha256:sha(bytes),contourSha256:sha(contourBytes),
  images:reports,browser:await browser.version(),output,
  limitations:['One S05 frame only; oblique per-sprite depth shear is a 2.5D projection, not a shared physically consistent camera or 3D; no animation or backend parity claim',
   'Raster alpha >=128 silhouettes for actors/prop; translucency and subpixel edge details are not modeled by extrusion',
   'Adds one shared directional shadow receiver behind foreground plus existing authored shadow sprites; no per-layer shadow or true ground contact shadow',
   'No final art, full 3D physical collision or artistic approval']};
 await writeFile(path.join(output,'report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();server.closeAllConnections();server.close();}
