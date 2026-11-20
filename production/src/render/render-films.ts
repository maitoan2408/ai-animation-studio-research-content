/**
 * Render one or more film requests (data files) to native 1080p24 MP4s.
 *   npx tsx src/render/render-films.ts examples/films/*.json [--out dir]
 * A request holds the editable film, the release/physics recipe for each held
 * prop and an optional performance layer. No character, prop or film is known
 * to this code: everything comes from the request and its art pack.
 * With a performance layer, a baseline and an "-enhanced" film are rendered
 * from the same playback so the A/B pair differs only in that layer.
 */
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {root} from './server.js';
import {sampleGeneralFilm,validateGeneralFilm,type GeneralFilm} from '../motion/general-timeline.js';
import {centerOfSprite,type GeneralPlayback,type GeneralRelease} from '../motion/general-playback.js';
import {validateG3Performance,type G3PerformancePlan} from '../motion/g3-performance.js';
import {validateGeneralPlayback} from '../motion/general-playback-validate.js';
import {bakeGeneralDrop,type GeneralDrop} from '../physics/general-drop.js';
import {loadArtPack} from '../art/pack.js';
import type {ArtPack} from '../scene/types.js';

export type ReleaseRequest={
 actorId:string;objectId:string;frame:number;settleFrames:number;supportStageId:string;
 collider:GeneralDrop['collider'];physics:GeneralDrop['physics'];
};
export type FilmRequest={
 schemaVersion:'film-request/1';id:string;artPack:string;film:GeneralFilm;
 releases:ReleaseRequest[];performance?:{tracks:G3PerformancePlan['tracks']};
};
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const isObj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);

export function validateFilmRequest(raw:unknown,pack:ArtPack):FilmRequest{
 if(!isObj(raw)||raw.schemaVersion!=='film-request/1'||typeof raw.id!=='string'||
    !/^[a-z][a-z0-9-]{1,62}$/.test(raw.id)||typeof raw.artPack!=='string'||
    !Array.isArray(raw.releases)||raw.releases.length<1)throw Error('FILM_REQUEST_SCHEMA');
 const allowed=['schemaVersion','id','artPack','film','releases','performance'];
 for(const k of Object.keys(raw))if(!allowed.includes(k))throw Error('FILM_REQUEST_UNKNOWN_FIELD '+k);
 const film=validateGeneralFilm(raw.film,pack);
 for(const r of raw.releases){
  if(!isObj(r)||typeof r.actorId!=='string'||typeof r.objectId!=='string'||
     !Number.isSafeInteger(r.frame)||!Number.isSafeInteger(r.settleFrames)||
     typeof r.supportStageId!=='string'||!isObj(r.collider)||!isObj(r.physics))
   throw Error('FILM_REQUEST_RELEASE');
  if(!film.stage?.some(s=>s.id===r.supportStageId))throw Error('FILM_REQUEST_SUPPORT_UNKNOWN '+r.supportStageId);
  if(!film.tracks.some(t=>t.contact.actor.id===r.actorId&&t.contact.object.id===r.objectId))
   throw Error('FILM_REQUEST_RELEASE_TRACK '+r.actorId+' '+r.objectId);
 }
 if(raw.performance!==undefined&&(!isObj(raw.performance)||!Array.isArray(raw.performance.tracks)))
  throw Error('FILM_REQUEST_PERFORMANCE');
 return {...(raw as FilmRequest),film};
}

/** Build the immutable playback: authored film + one Rapier bake per release.
 * The released prop starts exactly where the hand held it on the frame before
 * release and lands on the support surface of the referenced stage prop. */
export async function buildPlayback(request:FilmRequest,pack:ArtPack):Promise<GeneralPlayback>{
 const film=request.film,releases:GeneralRelease[]=[];
 for(const r of request.releases){
  const held=sampleGeneralFilm(film,r.frame-1,pack);
  const prop=held.frame.sprites.find(s=>s.id===r.objectId);
  if(!prop)throw Error('FILM_RELEASE_OBJECT_MISSING '+r.objectId);
  const stage=film.stage!.find(s=>s.id===r.supportStageId)!;
  const support=pack.assets.find(a=>a.id===stage.asset)!;
  if(!support.anchors.support)throw Error('FILM_SUPPORT_ANCHOR_MISSING '+stage.asset);
  const [cx,cy]=centerOfSprite(prop,pack);
  const art=pack.assets.find(a=>a.id===prop.asset)!;
  const project:GeneralDrop={
   schemaVersion:'general-physics/1',asset:prop.asset,assetSha256:art.sha256,
   initial:{centerX:cx,centerY:cy,angleDeg:prop.rotation},
   collider:r.collider,
   platform:{left:stage.x-support.pivot[0]*stage.scale,
     right:stage.x+(support.width-support.pivot[0])*stage.scale,
     top:stage.y+(support.anchors.support[1]-support.pivot[1])*stage.scale},
   initialVelocity:{xPxPerSecond:0,yPxPerSecond:0,angularDegPerSecond:0},
   physics:r.physics,frames:film.frames-r.frame,pixelsPerMeter:200,
  };
  const bake=await bakeGeneralDrop(project,pack);
  if(!bake.contacts.length)throw Error('FILM_NO_SUPPORT_CONTACT '+request.id+' '+r.objectId);
  releases.push({actorId:r.actorId,frame:r.frame,settleFrames:r.settleFrames,project,bake});
 }
 const playback:GeneralPlayback={schemaVersion:'general-playback/1',film,releases};
 validateGeneralPlayback(playback,pack);
 return playback;
}

async function renderOne(dir:string,artPack:string,playbackFile:string,performanceFile?:string){
 const child=spawn(process.execPath,['--import','tsx',path.join(root,'src/render/render-native.ts')],{
  cwd:root,stdio:'inherit',env:{...process.env,FILM_ART_PACK:artPack,FILM_PLAYBACK_FILE:playbackFile,
   ...(performanceFile?{FILM_PERFORMANCE_FILE:performanceFile}:{}),FILM_OUTPUT_DIR:dir,
   HYPERFRAMES_NO_TELEMETRY:'1'},
 });
 const [exit]=await once(child,'close');
 if(exit!==0)throw Error('FILM_NATIVE_RENDER_FAILED '+dir+' '+exit);
 return JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8'));
}

async function main(argv:string[]){
 const outFlag=argv.indexOf('--out');
 const out=path.resolve(outFlag>=0?argv[outFlag+1]!:process.env.FILM_OUTPUT_ROOT??path.join(root,'out/films'));
 const files=argv.filter((a,i)=>a!=='--out'&&i!==outFlag+1);
 if(!files.length)throw Error('USAGE: render-films.ts <film.json...> [--out dir]');
 await mkdir(out,{recursive:true});
 const clips=[],pairs=[];
 for(const file of files){
  const raw=JSON.parse(await readFile(path.resolve(file),'utf8'));
  const pack=await loadArtPack(path.join(root,String(raw.artPack)));
  const request=validateFilmRequest(raw,pack);
  const playback=await buildPlayback(request,pack);
  const data=JSON.stringify(playback,null,2)+'\n';
  const dir=path.join(out,request.id);
  await mkdir(dir,{recursive:true});
  const source=path.join(dir,'source-playback.json');
  await writeFile(source,data);
  const manifest=await renderOne(dir,request.artPack,source);
  clips.push({id:request.id,artPack:request.artPack,frames:playback.film.frames,
   releases:playback.releases.map(r=>({actorId:r.actorId,frame:r.frame,contacts:r.bake.contacts})),
   sourceSha256:hash(data),video:manifest.video});
  if(!request.performance)continue;
  const plan:G3PerformancePlan={schemaVersion:'g3-performance/1',
   playbackSha256:hash(JSON.stringify(playback)),artSha256:hash(JSON.stringify(pack)),
   tracks:request.performance.tracks};
  validateG3Performance(plan,playback,pack,{playbackSha256:plan.playbackSha256,artSha256:plan.artSha256});
  const enhancedId=request.id+'-enhanced',enhancedDir=path.join(out,enhancedId);
  await mkdir(enhancedDir,{recursive:true});
  const enhancedSource=path.join(enhancedDir,'source-playback.json');
  const planFile=path.join(enhancedDir,'source-performance.json');
  const planBytes=JSON.stringify(plan,null,2)+'\n';
  await writeFile(enhancedSource,data);
  await writeFile(planFile,planBytes);
  const enhanced=await renderOne(enhancedDir,request.artPack,enhancedSource,planFile);
  if(enhanced.sourceSha256!==manifest.sourceSha256)throw Error('FILM_AB_PLAYBACK_DIVERGENCE');
  if(enhanced.performance?.sha256!==hash(planBytes))throw Error('FILM_AB_PERFORMANCE_MISSING');
  pairs.push({baseline:request.id,artPack:request.artPack,enhanced:enhancedId,playbackSha256:hash(data),
   performanceSha256:hash(planBytes),baselineVideoSha256:manifest.video.sha256,
   enhancedVideoSha256:enhanced.video.sha256,
   changedActingFrames:enhanced.performance.changedActingFrames,
   backoffCount:enhanced.performance.backoffFrames.length});
 }
 const sourceCommit=process.env.SOURCE_HEAD_SHA??process.env.GITHUB_SHA??'LOCAL';
 await writeFile(path.join(out,'films.json'),JSON.stringify({schemaVersion:'film-renders/1',
  status:'AWAITING_INDEPENDENT_AUDIT',sourceCommit,clips,pairs,
  limitations:['Technical checks are not artistic approval']},null,2)+'\n');
 console.log('FILM_RENDERS_PASS '+JSON.stringify({films:clips.map(c=>c.id),pairs:pairs.length,out}));
}
if(import.meta.url===`file://${process.argv[1]}`)await main(process.argv.slice(2));
