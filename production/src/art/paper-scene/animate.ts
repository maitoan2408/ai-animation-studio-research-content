/** Native Chromium preview frame stream; no audio or art approval. */
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const root=fileURLToPath(new URL('../../../',import.meta.url)),run=promisify(execFile),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const [source,contourFile,profile='preview',coverage='foreground',look='basic',intensityArg='0.4']=process.argv.slice(2);if(!source||!contourFile||!['preview','1080'].includes(profile)||!['foreground','physical'].includes(coverage)||!['basic','bump','edge-alpha','lamp-light'].includes(look))throw Error('ANIMATION_ARGUMENTS');
const lanternIntensity=Number(intensityArg);if(!Number.isFinite(lanternIntensity)||lanternIntensity<0||lanternIntensity>1)throw Error('ANIMATION_LANTERN_INTENSITY');
const width=profile==='1080'?1920:640,height=profile==='1080'?1080:360;
const sourcePath=path.resolve(source),raw=await readFile(sourcePath),data=JSON.parse(raw.toString());
const alpha=JSON.parse(await readFile(path.join(path.dirname(sourcePath),'alpha-critic.json'),'utf8'));
if(alpha.sourceSha256!==sha(raw)||alpha.frames!==192||alpha.alphaThreshold!==128||alpha.overlap['mai.torso'].length||alpha.overlap['an.torso'].length)throw Error('ANIMATION_ALPHA_GATE');
if(data.shot!=='S05'||data.fps!==24||data.frames.length!==192||!['f2-overlay-baseline','f3-head-emphasis','f3-action-fixture','f3-living-fixture','f3-fall-fixture','f3-hero-life'].includes(data.edit.qualityCandidate))throw Error('ANIMATION_SOURCE');
const contourBytes=await readFile(path.resolve(contourFile)),contour=JSON.parse(contourBytes.toString());
const used=new Set<string>(data.frames.flatMap((f:{sprites:{asset:string}[]})=>f.sprites.map(s=>s.asset)));
const files=new Map<string,Buffer>(),urls:Record<string,string>={};
for(const t of data.textures.textures){
 if(!used.has(t.id))continue;const asset=data.pack.assets.find((a:{id:string})=>a.id===t.id);
 if(!asset||asset.sha256!==t.sourceSha256)throw Error(`ANIMATION_ART_HASH ${t.id}`);
 const file=await readFile(path.resolve(root,'out/art-q1',t.file));if(sha(file)!==t.sha256)throw Error(`ANIMATION_TEXTURE_HASH ${t.id}`);
 const c=contour.assets.find((a:{id:string})=>a.id===t.id);if(c&&(c.textureSha256!==t.sha256||c.sourceSha256!==asset.sha256))throw Error(`ANIMATION_CONTOUR_HASH ${t.id}`);
 const url=`/texture/${encodeURIComponent(t.id)}`;files.set(url,file);urls[t.id]=url;
}
if(Object.keys(urls).length!==used.size)throw Error('ANIMATION_TEXTURE_COVERAGE');
const code=await build({entryPoints:[path.join(root,'src/art/paper-scene/animation-browser.ts')],bundle:true,write:false,format:'iife',platform:'browser'});
const server=createServer((req,res)=>{if(req.url==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><body style="margin:0"></body>');return;}
 const f=files.get(req.url??'');if(!f){res.statusCode=404;res.end();return;}res.setHeader('content-type','image/png');res.end(f);});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const addr=server.address();if(!addr||typeof addr==='string')throw Error('ANIMATION_SERVER');
const base=`http://127.0.0.1:${addr.port}`,out=path.join(root,'out/f2-animation',randomUUID());await mkdir(path.join(out,'frames'),{recursive:true});
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage();await page.setViewport({width,height,deviceScaleFactor:1});const errors:string[]=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('requestfailed',r=>errors.push(`${r.url()} ${r.failure()?.errorText}`));await page.goto(base+'/');
 const absolute=Object.fromEntries(Object.entries(urls).map(([id,url])=>[id,base+url]));
 await page.evaluate(config=>{(window as any).animationInput=config;},{pack:data.pack,frames:data.frames,contours:contour.assets,textureUrls:absolute,width,height,includeBackground:coverage==='physical',look,lanternIntensity});
 await page.addScriptTag({content:code.outputFiles[0]!.text});await page.waitForFunction('window.animationReady||window.animationError',{timeout:90000});
 const error=await page.evaluate(()=>(window as any).animationError);if(error||errors.length)throw Error(`ANIMATION_BROWSER ${error} ${errors.join(' ')}`);
 const screenshot=async(frame:number)=>{await page.evaluate(f=>(window as any).animationSeek(f),frame);return Buffer.from(await page.screenshot({type:'png'}));};
 const first108=await screenshot(108),hashes:string[]=[];
 for(let f=0;f<192;f++){const png=await screenshot(f);hashes.push(sha(png));await writeFile(path.join(out,'frames',String(f).padStart(4,'0')+'.png'),png,{flag:'wx'});}
 const again108=await screenshot(108);if(sha(first108)!==sha(again108)||sha(first108)!==hashes[108])throw Error('ANIMATION_SEEK_NONDETERMINISTIC');
 const seekChecks=[191,0,143,72,108,24];
 for(const f of seekChecks)if(sha(await screenshot(f))!==hashes[f])throw Error(`ANIMATION_SEEK_MISMATCH ${f}`);
 const rejects=await page.evaluate(()=>{try{(window as any).animationSeek(192);return false;}catch{return true;}});if(!rejects)throw Error('ANIMATION_RANGE_ACCEPTED');
 if(errors.length)throw Error(`ANIMATION_ERRORS ${errors.join(' ')}`);
 const video=path.join(out,'preview.mp4');await run('ffmpeg',['-v','error','-framerate','24','-i',path.join(out,'frames/%04d.png'),'-frames:v','192','-c:v','libx264','-pix_fmt','yuv420p','-y',video],{timeout:180000});
 const probe=await run('ffprobe',['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,nb_read_frames','-of','json',video]);
 const streams=JSON.parse(probe.stdout).streams;if(streams.length!==1||streams[0].width!==width||streams[0].height!==height||streams[0].r_frame_rate!=='24/1'||streams[0].nb_read_frames!=='192')throw Error('ANIMATION_PROBE');
 await run('ffmpeg',['-v','error','-i',video,'-f','null','-'],{timeout:180000});
 const report={status:profile==='1080'?'PASS_PROVISIONAL_1080P':'PASS_PROVISIONAL_PREVIEW',output:out,sourceSha256:sha(raw),contourSha256:sha(contourBytes),
  width,height,profile,coverage,look,lanternIntensity,stats:await page.evaluate(()=>(window as any).animationStats),fps:'24/1',frames:192,videoSha256:sha(await readFile(video)),frameSha256:hashes,seek108Exact:true,seekChecks,
  browser:await browser.version(),limitations:[profile==='1080'?'Silent native-size technical candidate; no audio or artistic review':'Silent 640x360 preview, not native 1080p final or audio review',
   data.edit.qualityCandidate==='f3-head-emphasis'?'Bounded Mai head emphasis on S05, no new mouth or expression animation':data.edit.qualityCandidate==='f3-action-fixture'?'Two experimental rig actions in a static test scene; no complete F3 or acting approval':data.edit.qualityCandidate==='f3-living-fixture'?'Seeded rest and blink fixture, no complete F3 or acting approval':data.edit.qualityCandidate==='f3-fall-fixture'?'Isolated kinematic crouch/recovery spike; actors and lamp relocated; no dynamics or acting approval':data.edit.qualityCandidate==='f3-hero-life'?'S05 with seeded Mai blink and breathing; no complete F3 or acting approval':'Uses existing S05 poses; no draft mouth or expression animation',look==='bump'?'Bump experimental only on Mai torso/arms; no creative or flicker approval':look==='edge-alpha'?'Inward alpha edge experiment on props only; no full-rig or artistic approval':look==='lamp-light'?'Point light follows lantern anchor, no cast shadow or artistic approval':'Basic raster face baseline','Authored shadow sprites, no 3D physical collision or artistic approval']};
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();server.closeAllConnections();server.close();}
