/**
 * G4 opt-in native Director. The narrative script labels an explicitly authored,
 * validated storyboard; this API does not claim to interpret arbitrary prose.
 * It calls the real M3 or G3 native executor and Rapier baker (no M2 fallback).
 * Accepted historical M5 contracts remain unchanged.
 */
import {createHash,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdir,readFile,writeFile,rename,stat,rm} from 'node:fs/promises';
import path from 'node:path';
import {root} from '../render/server.js';
import {validateM3,m3TotalFrames,type M3Project} from '../motion/character-library.js';
import {sampleGeneralFilm,validateGeneralFilm,type GeneralFilm} from '../motion/general-timeline.js';
import {centerOfSprite,type GeneralPlayback,type GeneralRelease} from '../motion/general-playback.js';
import {validateGeneralPlayback} from '../motion/general-playback-validate.js';
import {bakeGeneralDrop,validateGeneralDrop,type GeneralDrop} from '../physics/general-drop.js';
import type {ArtPack} from '../scene/types.js';

export type NativeReleaseRecipe={
 actorId:string;frame:number;stageId:string;settleFrames:number;
 collider:{kind:'box';halfWidthPx:number}|{kind:'ball'};
 physics:{massKg:number;restitution:number;friction:number;gravityMps2:number};
};
export type NativeStoryboard=
 |{engine:'m3';project:M3Project}
 |{engine:'g3';film:GeneralFilm;releases:NativeReleaseRecipe[]};
export type NativeDirectorInput={
 schemaVersion:'native-director/1';title:string;script:string;
 style:'paper-cut'|'multiplane'|'shadow-box';storyboard:NativeStoryboard;
};
export type NativeDirectorPlan={
 schemaVersion:'native-director-plan/1';input:NativeDirectorInput;
 inputSha256:string;artPackSha256:string;planSha256:string;
 graph:{id:string;skill:string;needs:string[]}[];
};
export type NativeDirectorReceipt={
 schemaVersion:'native-director-receipt/1';
 planSha256:string;inputSha256:string;artPackSha256:string;
 executor:'native-m3'|'native-g3-rapier';
 status:'succeeded';frames:number;fps:24;width:1920;height:1080;
 rendererSourceSha256:string;mediaSha256:string;mediaFile:string;
 nativeManifestSha256:string;attemptId:string;createdAt:string;
};
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const only=(x:Record<string,unknown>,props:string[])=>
 Object.keys(x).sort().join('|')===props.slice().sort().join('|');
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
const id=(x:unknown)=>typeof x==='string'&&/^[a-z][a-z0-9-]{1,38}$/.test(x);
const canonical=(x:unknown):string=>{
 if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
 if(x!==null&&typeof x==='object')
   return '{'+Object.entries(x).sort(([a],[b])=>a.localeCompare(b))
     .map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
 const s=JSON.stringify(x);
 if(s===undefined)throw Error('NATIVE_DIRECTOR_UNDEFINED_FIELD');
 return s;
};
function reject(code:string):never{throw Error(code);}
export async function nativeArt():Promise<{pack:ArtPack;sha256:string}>{
 const bytes=await readFile(path.join(root,'assets/lantern-v1/manifest.json'));
 const pack=JSON.parse(bytes.toString()) as ArtPack;
 if(pack.version!=='lantern-art-1'||!Array.isArray(pack.assets))
   reject('NATIVE_DIRECTOR_ART_CATALOG');
 return {pack,sha256:sha(bytes)};
}
function checkRecipe(raw:unknown,film:GeneralFilm):NativeReleaseRecipe{
 if(!object(raw)||!only(raw,['actorId','frame','stageId','settleFrames','collider','physics'])||
    !id(raw.actorId)||!id(raw.stageId)||
    !Number.isSafeInteger(raw.frame)||Number(raw.frame)<6||
    Number(raw.frame)>=film.frames-24||film.frames-Number(raw.frame)>240||
    !Number.isSafeInteger(raw.settleFrames)||Number(raw.settleFrames)<8||
    Number(raw.settleFrames)>48||!object(raw.collider)||!object(raw.physics))
   reject('NATIVE_DIRECTOR_RELEASE_SCHEMA');
 const c=raw.collider,p=raw.physics;
 if(!((c.kind==='box'&&only(c,['kind','halfWidthPx'])&&finite(c.halfWidthPx)&&
       c.halfWidthPx>=2&&c.halfWidthPx<=100)||
      (c.kind==='ball'&&only(c,['kind'])))||
    !only(p,['massKg','restitution','friction','gravityMps2'])||
    ![p.massKg,p.restitution,p.friction,p.gravityMps2].every(finite)||
    Number(p.massKg)<.01||Number(p.massKg)>20||
    Number(p.restitution)<0||Number(p.restitution)>.9||
    Number(p.friction)<0||Number(p.friction)>2||
    Number(p.gravityMps2)<1||Number(p.gravityMps2)>30||
    !film.tracks.some(t=>t.contact.actor.id===raw.actorId)||
    !film.stage?.some(s=>s.id===raw.stageId&&s.asset==='props/workbench'))
   reject('NATIVE_DIRECTOR_RELEASE_UNSUPPORTED');
 return raw as NativeReleaseRecipe;
}
export function validateNativeDirector(raw:unknown,pack:ArtPack):NativeDirectorInput{
 if(!object(raw)||!only(raw,['schemaVersion','title','script','style','storyboard'])||
    raw.schemaVersion!=='native-director/1'||typeof raw.title!=='string'||
    !raw.title.trim()||raw.title.length>100||typeof raw.script!=='string'||
    !raw.script.trim()||raw.script.length>12000||
    !['paper-cut','multiplane','shadow-box'].includes(String(raw.style))||
    !object(raw.storyboard))
   reject('NATIVE_DIRECTOR_INPUT_INVALID');
 const s=raw.storyboard;
 if(s.engine==='m3'){
   if(!only(s,['engine','project']))reject('NATIVE_DIRECTOR_STORYBOARD_SCHEMA');
   validateM3(s.project,pack);
 }else if(s.engine==='g3'){
   if(!only(s,['engine','film','releases']))reject('NATIVE_DIRECTOR_STORYBOARD_SCHEMA');
   const film=validateGeneralFilm(s.film,pack);
   if(!Array.isArray(s.releases)||s.releases.length<1||s.releases.length>3)
     reject('NATIVE_DIRECTOR_RELEASE_COUNT');
   const actors=new Set<string>();
   for(const rawRecipe of s.releases){
     const r=checkRecipe(rawRecipe,film);
     if(actors.has(r.actorId))reject('NATIVE_DIRECTOR_DUPLICATE_RELEASE');
     actors.add(r.actorId);
   }
 }else reject('NATIVE_DIRECTOR_CAPABILITY_UNAVAILABLE');
 return structuredClone(raw) as NativeDirectorInput;
}
export function planNativeDirector(raw:unknown,pack:ArtPack,artSha:string):NativeDirectorPlan{
 const input=validateNativeDirector(raw,pack);
 if(!/^[0-9a-f]{64}$/.test(artSha))reject('NATIVE_DIRECTOR_ART_SHA');
 const graph:{id:string;skill:string;needs:string[]}[]=[
   {id:'validate',skill:'validate-storyboard',needs:[]}];
 if(input.storyboard.engine==='g3')
   graph.push({id:'physics',skill:'rapier-bake',needs:['validate']});
 graph.push({id:'render',skill:input.storyboard.engine==='m3'?
   'native-m3-chromium':'native-g3-chromium',
   needs:[input.storyboard.engine==='m3'?'validate':'physics']});
 graph.push({id:'verify',skill:'independent-native-media-qa',needs:['render']});
 const inputSha256=sha(canonical(input));
 const payload={schemaVersion:'native-director-plan/1' as const,
  input,inputSha256,artPackSha256:artSha,graph};
 return {...payload,planSha256:sha(canonical(payload))};
}
export function verifyNativePlan(raw:unknown,pack:ArtPack,artSha:string):NativeDirectorPlan{
 if(!object(raw)||!object(raw.input))reject('NATIVE_DIRECTOR_PLAN_SCHEMA');
 const plan=planNativeDirector(raw.input,pack,artSha);
 if(canonical(raw)!==canonical(plan))reject('NATIVE_DIRECTOR_STALE_PLAN');
 return plan;
}
async function buildPlayback(film:GeneralFilm,recipes:NativeReleaseRecipe[],pack:ArtPack)
  :Promise<GeneralPlayback>{
 const releases:GeneralRelease[]=[];
 for(const r of recipes){
   const t=film.tracks.find(t=>t.contact.actor.id===r.actorId)!;
   const stage=film.stage!.find(s=>s.id===r.stageId)!;
   const table=pack.assets.find(a=>a.id===stage.asset)!;
   const prop=pack.assets.find(a=>a.id===t.contact.object.asset)!;
   const support=prop.anchors.support;
   if(!support)reject('NATIVE_DIRECTOR_PROP_SUPPORT_UNAVAILABLE');
   const extent=(support[1]-prop.height/2)*t.contact.object.scale;
   if(extent<2||extent>100)reject('NATIVE_DIRECTOR_CONTACT_GEOMETRY');
   const before=sampleGeneralFilm(film,r.frame-1,pack);
   const item=before.frame.sprites.find(s=>s.id===t.contact.object.id);
   if(!item)reject('NATIVE_DIRECTOR_PROP_MISSING');
   const [centerX,centerY]=centerOfSprite(item,pack);
   const project:GeneralDrop={
     schemaVersion:'general-physics/1',asset:prop.id,assetSha256:prop.sha256,
     initial:{centerX,centerY,angleDeg:item.rotation},
     collider:r.collider.kind==='box'?
       {kind:'box',halfWidthPx:r.collider.halfWidthPx,halfHeightPx:extent}:
       {kind:'ball',radiusPx:extent},
     platform:{left:stage.x-table.pivot[0]*stage.scale,
       right:stage.x+(table.width-table.pivot[0])*stage.scale,
       top:stage.y+(table.anchors.support![1]-table.pivot[1])*stage.scale},
     initialVelocity:{xPxPerSecond:0,yPxPerSecond:0,angularDegPerSecond:0},
     physics:r.physics,frames:film.frames-r.frame,pixelsPerMeter:200,
   };
   validateGeneralDrop(project,pack);
   const bake=await bakeGeneralDrop(project,pack);
   if(!bake.contacts.length)reject('NATIVE_DIRECTOR_PHYSICS_NO_CONTACT');
   releases.push({actorId:r.actorId,frame:r.frame,settleFrames:r.settleFrames,
     project,bake});
 }
 const playback:GeneralPlayback={schemaVersion:'general-playback/1',film,releases};
 return validateGeneralPlayback(playback,pack);
}
function run(cmd:string,args:string[],opts:{cwd?:string;env?:NodeJS.ProcessEnv}={}){
 const x=spawnSync(cmd,args,{encoding:'utf8',timeout:35*60*1000,maxBuffer:8*1024*1024,...opts});
 if(x.error||x.status!==0)
   reject('NATIVE_DIRECTOR_EXECUTOR_FAILED '+String(x.error??x.stderr).slice(-1800));
 return x.stdout??'';
}
async function verifyReceipt(receipt:NativeDirectorReceipt,dir:string,
 input:NativeDirectorPlan){
 if(receipt.planSha256!==input.planSha256||receipt.inputSha256!==input.inputSha256||
    receipt.artPackSha256!==input.artPackSha256||
    receipt.status!=='succeeded')
   reject('NATIVE_DIRECTOR_RECEIPT_STALE');
 const media=await readFile(path.join(dir,receipt.mediaFile));
 if(sha(media)!==receipt.mediaSha256)reject('NATIVE_DIRECTOR_MEDIA_TAMPER');
 const manifest=await readFile(path.join(dir,'manifest.json'));
 if(sha(manifest)!==receipt.nativeManifestSha256)
   reject('NATIVE_DIRECTOR_MANIFEST_TAMPER');
 const probe=JSON.parse(run('ffprobe',['-v','error','-count_frames','-show_streams',
   '-of','json',path.join(dir,receipt.mediaFile)])) as {
    streams:Array<{codec_type:string;width:number;height:number;avg_frame_rate:string;nb_read_frames:string}>;
   };
 const v=probe.streams.find(s=>s.codec_type==='video');
 if(v?.width!==1920||v?.height!==1080||v?.avg_frame_rate!=='24/1'||
    v?.nb_read_frames!==String(receipt.frames))
    reject('NATIVE_DIRECTOR_PROFILE_INVALID');
 run('ffmpeg',['-v','error','-xerror','-nostdin','-i',
   path.join(dir,receipt.mediaFile),'-f','null','-']);
}
/** Revisions are immutable. A changed project is not silently substituted. */
export async function saveNativePlan(plan:NativeDirectorPlan,store:string,
 pack:ArtPack,artSha:string):Promise<string>{
 verifyNativePlan(plan,pack,artSha);
 const folder=path.resolve(store,'projects');
 await mkdir(folder,{recursive:true});
 const file=path.join(folder,plan.planSha256+'.json');
 const bytes=canonical(plan)+'\n';
 try{await writeFile(file,bytes,{flag:'wx'});}
 catch(e){
   if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;
   const saved=await readFile(file,'utf8');
   if(saved!==bytes)reject('NATIVE_DIRECTOR_REVISION_COLLISION');
 }
 return file;
}
export async function reopenNativePlan(file:string,pack:ArtPack,artSha:string)
 :Promise<NativeDirectorPlan>{
 const bytes=await readFile(file,'utf8');
 const checked=verifyNativePlan(JSON.parse(bytes),pack,artSha);
 if(path.basename(file)!==checked.planSha256+'.json'||bytes!==canonical(checked)+'\n')
   reject('NATIVE_DIRECTOR_REVISION_TAMPER');
 return checked;
}
/** Fail-closed real executor. No implicit M2 fallback, alternate or fake renderer. */
export async function executeNativeDirector(planFile:string,store:string):Promise<NativeDirectorReceipt>{
 const {pack,sha256:artSha}=await nativeArt();
 const plan=await reopenNativePlan(planFile,pack,artSha);
 const rootDir=path.resolve(store,'jobs',plan.planSha256);
 const published=path.join(rootDir,'published');
 await mkdir(rootDir,{recursive:true});
 const lock=path.join(rootDir,'render.lock');
 try{await mkdir(lock);}catch(e){
   if((e as NodeJS.ErrnoException).code==='EEXIST')reject('NATIVE_DIRECTOR_JOB_IN_PROGRESS');
   throw e;
 }
 try{
 try{
   await stat(path.join(published,'native-director-receipt.json'));
   const receipt=JSON.parse(await readFile(path.join(published,'native-director-receipt.json'),'utf8'))
     as NativeDirectorReceipt;
   await verifyReceipt(receipt,published,plan);
   return receipt;
 }catch(e){
   if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;
 }
 const attemptId=randomUUID(),attempt=path.join(rootDir,'attempt-'+attemptId);
 await mkdir(attempt,{recursive:false});
 let sceneData:string,engine:NativeDirectorReceipt['executor'],frames:number,renderer:string;
 try{
   const story=plan.input.storyboard;
   if(story.engine==='m3'){
     const project=validateM3(story.project,pack);
     sceneData=JSON.stringify(project,null,2)+'\n';
     engine='native-m3';frames=m3TotalFrames(project);
     renderer='m3-character-motion-final-1080p.mp4';
     const source=path.join(attempt,'source-project.json');
     await writeFile(source,sceneData);
     run(process.execPath,['--import','tsx',path.join(root,'src/render/render-m3.ts')],
       {cwd:root,env:{...process.env,M3_PROJECT_FILE:source,
        M3_OUTPUT_DIR:attempt,M6_QUALITY_MODE:'enhanced',HYPERFRAMES_NO_TELEMETRY:'1'}});
   }else{
     const playback=await buildPlayback(story.film,story.releases,pack);
     sceneData=JSON.stringify(playback,null,2)+'\n';
     engine='native-g3-rapier';frames=story.film.frames;
     renderer='g3-motion-physics-1080p.mp4';
     const source=path.join(attempt,'source-playback.json');
     await writeFile(source,sceneData);
     run(process.execPath,['--import','tsx',path.join(root,'src/render/render-g3.ts')],
       {cwd:root,env:{...process.env,G3_PLAYBACK_FILE:source,
        G3_OUTPUT_DIR:attempt,HYPERFRAMES_NO_TELEMETRY:'1'}});
   }
   const manifestBytes=await readFile(path.join(attempt,'manifest.json'));
   const manifest=JSON.parse(manifestBytes.toString()) as {
    sourceSha256?:string;project?:{sha256:string};
    video:{file:string;sha256:string;frames:number;width:number;height:number;fps:number};
   };
   if(manifest.video.file!==renderer||manifest.video.frames!==frames||
      manifest.video.width!==1920||manifest.video.height!==1080||manifest.video.fps!==24||
      (engine==='native-g3-rapier'?
        manifest.sourceSha256!==sha(sceneData):manifest.project?.sha256!==sha(sceneData)))
     reject('NATIVE_DIRECTOR_EXECUTOR_MANIFEST_MISMATCH');
   const media=await readFile(path.join(attempt,renderer));
   if(sha(media)!==manifest.video.sha256)reject('NATIVE_DIRECTOR_OUTPUT_SHA');
   const receipt:NativeDirectorReceipt={
    schemaVersion:'native-director-receipt/1',planSha256:plan.planSha256,
    inputSha256:plan.inputSha256,artPackSha256:plan.artPackSha256,
    executor:engine,status:'succeeded',frames,fps:24,width:1920,height:1080,
    rendererSourceSha256:sha(sceneData),mediaSha256:sha(media),
    mediaFile:renderer,nativeManifestSha256:sha(manifestBytes),
    attemptId,createdAt:new Date().toISOString(),
   };
   await verifyReceipt(receipt,attempt,plan);
   await writeFile(path.join(attempt,'native-director-receipt.json'),
     JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
   await rename(attempt,published);
   return receipt;
 }catch(e){
   await writeFile(path.join(attempt,'FAILED.txt'),String(e)+'\n',{flag:'wx'});
   throw e;
 }
 }finally{await rm(lock,{recursive:true,force:true});}
}
