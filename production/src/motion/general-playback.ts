/**
 * G3 deterministic playback of authored contact -> immutable Rapier ownership.
 * Browser-safe: import only data types from the Node-only physics module.
 * Author pose at release is preserved without following the falling prop.
 */
import {sampleGeneralFilm,type GeneralFilm,type GeneralSample} from './general-timeline.js';
import type {GeneralDrop,GeneralDropBake} from '../physics/general-drop.js';
import type {ArtPack,Sprite,SceneFrame} from '../scene/types.js';

export type GeneralRelease={actorId:string;frame:number;project:GeneralDrop;bake:GeneralDropBake};
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
   const hand=t.contact.hand,model=t.contact.actor.model;
   const prefix=actorId+'.';
   const stable=hold.frame.sprites.filter(s=>s.id.startsWith(prefix)
     &&s.id!==prefix+hand+'-grip-front')
     .map(s=>s.id===prefix+hand+'-hand'?{...s,asset:model+'/hand-open'}:s);
   // Rebuild actor from the last authored pose before release. All other
   // timeline tracks continue independently. Prop is now physics-owned.
   sprites=[...sprites.filter(s=>!s.id.startsWith(prefix)&&s.id!==propId),
     ...stable,fromCenter(old,pack,v.centerX,v.centerY,v.angleDeg)];
   markers=[...markers.filter(m=>!m.id.startsWith(prefix)),
     ...hold.frame.markers.filter(m=>m.id.startsWith(prefix)&&!m.id.endsWith('-grip'))];
   contacts=contacts.filter(c=>c.propId!==propId);
 }
 const out:SceneFrame={...sample.frame,sprites,markers};
 return {...sample,frame:out,contacts};
}
