/**
 * G3 source verification: release bakes must match the exact authored handoff
 * position, declared visible platform art and immutable solver result.
 */
import {sampleGeneralFilm,validateGeneralFilm} from './general-timeline.js';
import {centerOfSprite,type GeneralPlayback} from './general-playback.js';
import {validateGeneralDrop,verifyGeneralDropBake} from '../physics/general-drop.js';
import type {ArtPack} from '../scene/types.js';

export function validateGeneralPlayback(raw:unknown,pack:ArtPack):GeneralPlayback{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('G3_PLAYBACK_SCHEMA');
 const p=raw as Record<string,unknown>;
 if(Object.keys(p).sort().join('|')!=='film|releases|schemaVersion'||
    p.schemaVersion!=='general-playback/1'||!Array.isArray(p.releases)||
    p.releases.length>3)throw Error('G3_PLAYBACK_SCHEMA');
 const film=validateGeneralFilm(p.film,pack);
 const ids=new Set<string>();
 for(const release of p.releases){
   if(!release||typeof release!=='object'||Array.isArray(release))
     throw Error('G3_RELEASE_SCHEMA');
   const q=release as Record<string,unknown>;
   if(Object.keys(q).sort().join('|')!=='actorId|bake|frame|project'||
      typeof q.actorId!=='string'||ids.has(q.actorId)||
      !Number.isSafeInteger(q.frame)||Number(q.frame)<6||
      Number(q.frame)>=film.frames-24)throw Error('G3_RELEASE_SCHEMA');
   ids.add(q.actorId);
   const track=film.tracks.find(t=>t.contact.actor.id===q.actorId);
   if(!track)throw Error('G3_RELEASE_ACTOR_UNKNOWN');
   const project=validateGeneralDrop(q.project,pack);
   verifyGeneralDropBake(q.bake,project);
   if(project.frames!==film.frames-Number(q.frame)||
      project.asset!==track.contact.object.asset||
      project.assetSha256!==track.contact.object.sha256)
     throw Error('G3_RELEASE_PROJECT_STALE');
   // A physics proxy can be numerically stable while the actual cup or
   // lantern visibly buries itself in the table. Bind the collider's
   // vertical contact extent to the art's declared support point.
   const propArt=pack.assets.find(a=>a.id===project.asset)!;
   const support=propArt.anchors.support;
   if(!support)throw Error('G3_PROP_SUPPORT_MISSING');
   const supportOffset=(support[1]-propArt.height/2)*track.contact.object.scale;
   const verticalExtent=project.collider.kind==='box'?
     project.collider.halfHeightPx:project.collider.radiusPx;
   if(Math.abs(supportOffset-verticalExtent)>3)
     throw Error('G3_COLLIDER_VISUAL_CONTACT_MISMATCH');
   const before=sampleGeneralFilm(film,Number(q.frame)-1,pack);
   const item=before.frame.sprites.find(s=>s.id===track.contact.object.id);
   if(!item)throw Error('G3_RELEASE_PROP_NOT_FOUND');
   const [x,y]=centerOfSprite(item,pack);
   if(Math.hypot(x-project.initial.centerX,y-project.initial.centerY)>1e-5||
      Math.abs(project.initial.angleDeg-item.rotation)>1e-5)
     throw Error('G3_RELEASE_TELEPORT');
   // Physics collision platform must be the visible declared workbench, not
   // an invisible or distant floor. Source art anchor is authoritative.
   const benchtops=(film.stage??[]).filter(s=>s.asset==='props/workbench');
   const art=pack.assets.find(a=>a.id==='props/workbench')!;
   const match=benchtops.some(s=>
     Math.abs(project.platform.left-(s.x-art.pivot[0]*s.scale))<1e-4&&
     Math.abs(project.platform.right-(s.x+(art.width-art.pivot[0])*s.scale))<1e-4&&
     Math.abs(project.platform.top-(s.y+(art.anchors.support![1]-art.pivot[1])*s.scale))<1e-4);
   if(!match)throw Error('G3_RELEASE_INVISIBLE_PLATFORM');
 }
 return raw as GeneralPlayback;
}
