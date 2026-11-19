/**
 * G3 deterministic playback of authored contact -> immutable Rapier ownership.
 * Browser-safe: import only data types from the Node-only physics module.
 * Author pose at release is preserved without following the falling prop.
 */
import {sampleGeneralFilm,type GeneralFilm,type GeneralSample} from './general-timeline.js';
import {actorSprites} from '../scene/rig.js';
import {spriteBounds,spriteBoundsGap} from '../scene/geometry.js';
import {scoreG3RestPose} from '../scene/g3-rest-pose.js';
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
/** Native silhouette resting is an opt-in G3 style; archived baseline unchanged. */
export type GeneralRestStyle='legacy'|'native-silhouette';
export function sampleGeneralPlayback(playback:GeneralPlayback,frame:number,pack:ArtPack,
 restStyle:GeneralRestStyle='legacy'):GeneralSample{
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
   // A relaxed hand must visibly separate from the released prop. The previous
   // .70 target returned it almost to the prop's original x, creating
   // the illusion of an invisible grip despite correct Rapier collision.
   // A shoulder-aligned return with modest vertical fall is generic to both hands.
   // Choose the least invasive reachable neutral wrist that no longer overlaps
   // the *resting* object's actual art bounds. This is generic for arbitrary
   // compatible actors/prop sizes/hands and preserves all source/bake positions.
   const finish=release.bake.frames[release.bake.frames.length-1]!;
   const physicalRest=fromCenter(old,pack,finish.centerX,finish.centerY,finish.angleDeg);
   const propBounds=spriteBounds(pack,physicalRest);
   let destination:Point|undefined;
   let best=Number.POSITIVE_INFINITY;
   // Source-derived semantic wrist rest, not a specific actor/prop or frame.
   // Maintain historical candidate search for all non-enhanced playback.
   for(let yshift=restStyle==='native-silhouette'?12:10;
     yshift>=(restStyle==='native-silhouette'?-6:-4)&&
       (restStyle==='native-silhouette'||!destination);
     yshift-=restStyle==='native-silhouette'?3:2){
     // Search the same source-body pose space for both strategies, while G3
     // adds neutral-side candidates. Include every legacy candidate to ensure
     // the new score cannot worsen baseline hand/thigh overlap by construction.
     // Expand *outward*, away from the thighs: the previous search stopped
     // at neutral and sometimes chose a cramped inner wrist to clear a prop.
     // The native arm span and full IK still reject invalid reach.
     const factors=Array.from({length:restStyle==='native-silhouette'?61:20},
       (_,n)=>(restStyle==='native-silhouette'?1.32:.38)-n*
         (restStyle==='native-silhouette'?.022:.02));
     for(const factor of factors){
       const world:Point=[mix(a.x,rest[0],Math.max(0,factor)),rest[1]+yshift];
       const local:Point=[(world[0]-a.x)/(a.scale*a.facing),
         (world[1]-a.floor)/a.scale];
       try{
         const solved=actorSprites(pack,{...neutral,
           ...(hand==='left'?{leftWrist:local,leftHand:'open' as const,leftHandAngle:180}:
             {rightWrist:local,rightHand:'open' as const,rightHandAngle:180})});
         const palm=solved.sprites.find(s=>s.id===prefix+hand+'-hand');
         if(!palm)throw Error('G3_REST_HAND_MISSING '+actorId);
         const visible=spriteBounds(pack,palm);
         if(spriteBoundsGap(visible,propBounds)<6)continue;
         if(restStyle==='legacy'){destination=world;break;}
         const score=scoreG3RestPose(pack,solved.sprites,actorId,hand,rest,yshift);
         if(score<best-1e-10){best=score;destination=world;}
       }catch(e){
         if(!(e instanceof Error)||!e.message.startsWith('IK_UNREACHABLE'))throw e;
       }
     }
   }
   if(!destination)throw Error('G3_RELEASE_RESTING_HAND_CLEARANCE_UNREACHABLE '+actorId);
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
