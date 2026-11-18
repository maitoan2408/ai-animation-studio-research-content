/**
 * G3 reusable authored motion timeline over G2 anchored contacts.
 * The actor's feet stay planted; hand/object contact is solved per frame,
 * not faked by moving a marker. Unsupported walks/releases fail closed and
 * require a separately validated motion or physics clip.
 */
import {background} from '../scene/benchmark.js';
import {actorSprites} from '../scene/rig.js';
import {smooth,mix} from '../scene/math.js';
import {sprite,type ArtPack,type SceneFrame} from '../scene/types.js';
import {sampleGeneralGrip,validateGeneralContact,generalContactFrameContract,type ContactProject} from './general-interaction.js';
import {auditFrame,type ContactContract,type FrameContract} from '../qa/general-scene-quality.js';

export type GeneralKey={frame:number;dx:number;dy:number;headAngle:number};
export type CameraKey={frame:number;x:number;y:number;zoom:number};
export type GeneralTrack={contact:ContactProject;keys:GeneralKey[]};
export type StageProp={id:string;asset:string;sha256:string;x:number;y:number;z:number;scale:number};
export type GeneralFilm={
 schemaVersion:'general-film/1';frames:number;
 tracks:GeneralTrack[];camera:CameraKey[];stage?:StageProp[];
};
const isObj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const exact=(x:Record<string,unknown>,wanted:string[])=>
 Object.keys(x).sort().join('|')===wanted.slice().sort().join('|');
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
function validateKeys<T extends {frame:number}>(raw:unknown,frames:number,types:string[],
  guard:(v:Record<string,unknown>)=>boolean):asserts raw is T[]{
  if(!Array.isArray(raw)||raw.length<2||raw.length>20)throw Error('GENERAL_FILM_KEYS');
  let previous=-1;
  for(const rawValue of raw){
    if(!isObj(rawValue)||!exact(rawValue,types)||
       !Number.isSafeInteger(rawValue.frame)||(rawValue.frame as number)<=previous||
       (rawValue.frame as number)>=frames||!guard(rawValue))throw Error('GENERAL_FILM_KEY_INVALID');
    previous=rawValue.frame as number;
  }
  if(raw[0].frame!==0||raw[raw.length-1].frame!==frames-1)
    throw Error('GENERAL_FILM_KEY_BOUNDARY');
}
export function validateGeneralFilm(raw:unknown,pack:ArtPack):GeneralFilm{
 if(!isObj(raw)||!exact(raw,Object.prototype.hasOwnProperty.call(raw,'stage')?
       ['schemaVersion','frames','tracks','camera','stage']:
       ['schemaVersion','frames','tracks','camera'])||
    raw.schemaVersion!=='general-film/1'||!Number.isSafeInteger(raw.frames)||
    Number(raw.frames)<24||Number(raw.frames)>480||!Array.isArray(raw.tracks)||
    raw.tracks.length<1||raw.tracks.length>3)throw Error('GENERAL_FILM_SCHEMA');
 const frames=raw.frames as number;
 validateKeys<CameraKey>(raw.camera,frames,['frame','x','y','zoom'],
   v=>finite(v.x)&&finite(v.y)&&finite(v.zoom)&&v.zoom>=.6&&v.zoom<=2.8);
 const actorIds=new Set<string>(),objectIds=new Set<string>();
 const staged=new Set<string>();
 if(raw.stage!==undefined){
   if(!Array.isArray(raw.stage)||raw.stage.length>8)throw Error('GENERAL_FILM_STAGE');
   for(const part of raw.stage){
     if(!isObj(part)||!exact(part,['id','asset','sha256','x','y','z','scale'])||
       typeof part.id!=='string'||!/^[a-z][a-z0-9-]{1,38}$/.test(part.id)||
       staged.has(part.id)||typeof part.asset!=='string'||
       !finite(part.x)||!finite(part.y)||!finite(part.z)||!finite(part.scale)||part.scale<=0||part.scale>4)
       throw Error('GENERAL_FILM_STAGE_INVALID');
     const art=pack.assets.find(a=>a.id===part.asset);
     if(!art||art.sha256!==part.sha256||art.category!=='prop')
       throw Error('GENERAL_FILM_STAGE_ASSET_STALE');
     staged.add(part.id);
   }
 }
 for(const track of raw.tracks){
   if(!isObj(track)||!exact(track,['contact','keys']))throw Error('GENERAL_FILM_TRACK');
   const c=validateGeneralContact(track.contact,pack);
   if(staged.has(c.actor.id)||staged.has(c.object.id)||
      actorIds.has(c.actor.id)||objectIds.has(c.object.id)||
      actorIds.has(c.object.id)||objectIds.has(c.actor.id))
     throw Error('GENERAL_FILM_DUPLICATE_ACTOR_OR_PROP');
   actorIds.add(c.actor.id);objectIds.add(c.object.id);
   validateKeys<GeneralKey>(track.keys,frames,['frame','dx','dy','headAngle'],
     v=>finite(v.dx)&&Math.abs(v.dx)<=100&&finite(v.dy)&&Math.abs(v.dy)<=100&&
       finite(v.headAngle)&&Math.abs(v.headAngle)<=20);
   // Verify every authored waypoint is actually IK reachable. Continuous
   // interpolation will be checked again during each random-access sample.
   for(const k of track.keys as GeneralKey[]){
     const p=structuredClone(c);p.object.x+=k.dx;p.object.y+=k.dy;
     sampleGeneralGrip(p,pack);
   }
 }
 return raw as GeneralFilm;
}
function interpolation<T extends {frame:number}>(keys:T[],frame:number){
 let i=0;while(i<keys.length-2&&frame>keys[i+1]!.frame)i++;
 const left=keys[i]!,right=keys[i+1]!;
 return {a:left,b:right,t:smooth((frame-left.frame)/(right.frame-left.frame))};
}
/** Derived from authored tracks and release schedule, never from rendered
 * sprite/marker claims. Includes source-pinned stage prop identities. */
export function generalFilmFrameContract(film:GeneralFilm,pack:ArtPack,frame:number,
  released:readonly string[]=[]):FrameContract{
 const parts=film.tracks.map(t=>generalContactFrameContract(t.contact,pack,frame,
   !released.includes(t.contact.actor.id)));
 return {frame,contacts:parts.flatMap(p=>p.contacts??[]),
   grounds:parts.flatMap(p=>p.grounds??[]),bounds:parts.flatMap(p=>p.bounds??[]),
   requiredSprites:[...parts.flatMap(p=>p.requiredSprites??[]),
     ...(film.stage??[]).map(s=>({id:s.id,asset:s.asset,sha256:s.sha256}))]};
}
export type GeneralSample={frame:SceneFrame;contacts:ContactContract[];index:number};
export function sampleGeneralFilm(raw:unknown,index:number,pack:ArtPack):GeneralSample{
 const film=validateGeneralFilm(raw,pack);
 if(!Number.isSafeInteger(index)||index<0||index>=film.frames)
   throw RangeError('GENERAL_FILM_FRAME_RANGE');
 const cam=interpolation(film.camera,index);
 const camera={x:mix(cam.a.x,cam.b.x,cam.t),y:mix(cam.a.y,cam.b.y,cam.t),
   zoom:mix(cam.a.zoom,cam.b.zoom,cam.t)};
 const sprites=background(camera),markers:SceneFrame['markers']=[],contacts:ContactContract[]=[];
 for(const staged of film.stage??[])
   sprites.push(sprite(staged.id,staged.asset,staged.x,staged.y,staged.z,0,staged.scale));
 for(const track of film.tracks){
   const k=interpolation(track.keys,index);
   const p=structuredClone(track.contact);
   p.object.x+=mix(k.a.dx,k.b.dx,k.t);
   p.object.y+=mix(k.a.dy,k.b.dy,k.t);
   const grip=sampleGeneralGrip(p,pack);
   const pose={...grip.pose,headAngle:mix(k.a.headAngle,k.b.headAngle,k.t)};
   const rig=actorSprites(pack,pose);
   sprites.push(...rig.sprites,grip.objectSprite);
   markers.push(...rig.markers);
   contacts.push(grip.contact);
 }
 const frame={camera,sprites,markers};
 const issues=auditFrame(frame,pack,generalFilmFrameContract(film,pack,index));
 if(issues.length)throw Error('GENERAL_FILM_FRAME_QA: '+issues.map(x=>x.code).join(','));
 return {frame,contacts,index};
}
