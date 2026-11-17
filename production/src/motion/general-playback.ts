/**
 * G3 deterministic playback of authored contact -> immutable Rapier ownership.
 * Browser-safe: import only data types from the Node-only physics module.
 * Author pose at release is preserved without following the falling prop.
 */
import {sampleGeneralFilm,type GeneralFilm,type GeneralSample} from './general-timeline.js';
import {actorSprites} from '../scene/rig.js';
import {mix,mixPoint,smooth} from '../scene/math.js';
import type {GeneralDrop,GeneralDropBake} from '../physics/general-drop.js';
import type {ActorPose,ArtPack,Point,Sprite,SceneFrame} from '../scene/types.js';

export type GeneralRelease={actorId:string;frame:number;project:GeneralDrop;bake:GeneralDropBake;settleFrames?:number};
export type GeneralPlayback={schemaVersion:'general-playback/1';film:GeneralFilm;releases:GeneralRelease[]};
const center=(s:Sprite,pack:ArtPack):[number,number]=>{
 const art=pack.assets.find(a=>a.id===s.asset);
 if(!art)throw Error('G3_PLAYBACK_ASSET');
 const dx=(art.width/2-art.pivot[0])*s.scaleX;
 const dy=(art.height/2-art.pivot[1])*s.scaleY;
 const a=s.rotation*Math.PI/180,c=Math.cos(a),si=Math.sin(a);
 return [s.x+dx*c-dy*si,s.y+dx*si+dy*c];
};
export function centerOfSprite(s:Sprite,pack:ArtPack):[number,number]{return center(s,pack);}
function fromCenter(old:Sprite,pack:ArtPack,x:number,y:number,angle:number):Sprite{
 const s={...old,rotation:angle};
 const [cx,cy]=center({...s,x:0,y:0},pack);
 return {...s,x:x-cx,y:y-cy};
}
export function sampleGeneralPlayback(playback:GeneralPlayback,frame:number,pack:ArtPack):GeneralSample{
 const sample=sampleGeneralFilm(playback.film,frame,pack);
 if(!playback.releases.length)return sample;
 let sprites=sample.frame.sprites,markers=sample.frame.markers;
 let contacts=sample.contacts;
 for(const release of playback.releases){
   if(frame<release.frame)continue;
   const t=playback.film.tracks.find(t=>t.contact.actor.id===release.actorId);
   if(!t)throw Error('G3_RELEASE_TRACK_UNKNOWN');
   const propId=t.contact.object.id,actorId=t.contact.actor.id;
   const idx=frame-release.frame,v=release.bake.frames[idx];
   if(!v||v.frame!==idx)throw Error('G3_BAKE_FRAME_NOT_FOUND');
   const old=sprites.find(s=>s.id===propId);
   if(!old)throw Error('G3_PROP_FRAME_MISSING');
   const hold=sampleGeneralFilm(playback.film,release.frame-1,pack);
   const hand=t.contact.hand,model=t.contact.actor.model,a=t.contact.actor;
   const prefix=actorId+'.';
   const before=hold.frame.markers.find(m=>m.id===prefix+hand+'-wrist')?.point;
   if(!before)throw Error('G3_HANDOFF_WRIST_MISSING');
   const neutral:ActorPose={id:actorId,character:model,x:a.x,floor:a.floor,
     facing:a.facing,scale:a.scale,view:'quarter'};
   const neutralRig=actorSprites(pack,neutral);
   const rest=neutralRig.markers.find(m=>m.id===prefix+hand+'-wrist')?.point;
   if(!rest)throw Error('G3_NEUTRAL_WRIST_MISSING');
   // Follow-through: smooth withdrawal to a closer, relaxed wrist location.
   // Never freeze the hand above a falling prop: this previously read as
   // telekinesis despite perfect physics hashes and grip anchors.
   const u=smooth((frame-release.frame)/(release.settleFrames??24));
   const destination:Point=[mix(a.x,rest[0],.70),rest[1]];
   const world=mixPoint(before,destination,u);
   const local:Point=[(world[0]-a.x)/(a.scale*a.facing),
     (world[1]-a.floor)/a.scale];
   const head=hold.frame.sprites.find(s=>s.id===prefix+'head')?.rotation??0;
   const pose:ActorPose={...neutral,headAngle:head/a.facing*(1-u),
     ...(hand==='left'?
       {leftWrist:local,leftHand:'open' as const,leftHandAngle:mix(0,180,u)}:
       {rightWrist:local,rightHand:'open' as const,rightHandAngle:mix(0,180,u)})};
   const follow=actorSprites(pack,pose);
   sprites=[...sprites.filter(s=>!s.id.startsWith(prefix)&&s.id!==propId),
     ...follow.sprites,fromCenter(old,pack,v.centerX,v.centerY,v.angleDeg)];
   markers=[...markers.filter(m=>!m.id.startsWith(prefix)),
     ...follow.markers.filter(m=>!m.id.endsWith('-grip'))];
   contacts=contacts.filter(c=>c.propId!==propId);
 }
 const out:SceneFrame={...sample.frame,sprites,markers};
 return {...sample,frame:out,contacts};
}
