/**
 * G3 deterministic playback of authored contact -> immutable Rapier ownership.
 * Browser-safe: import only data types from the Node-only physics module.
 * Author pose at release is preserved without following the falling prop.
 */
import {sampleGeneralFilm,type GeneralFilm,type GeneralSample} from './general-timeline.js';
import {actorSprites} from '../scene/rig.js';
import {spriteBounds,spriteBoundsGap,orientedCoverage} from '../scene/geometry.js';
import {mix,mixPoint,smooth} from '../scene/math.js';
import type {GeneralDrop,GeneralDropBake} from '../physics/general-drop.js';
import type {ActorPose,ArtPack,Point,Sprite,SceneFrame} from '../scene/types.js';
import {releasedHandState,releasedHandAngle} from './hand-release.js';

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
/** Released actors and the hand drawing each must show at `frame`. */
export function releasedHands(playback:GeneralPlayback,frame:number,pack:ArtPack){
 return playback.releases.filter(r=>frame>=r.frame).map(r=>{
  const t=playback.film.tracks.find(t=>t.contact.actor.id===r.actorId);
  if(!t)throw Error('G3_RELEASE_TRACK_UNKNOWN');
  return {actorId:r.actorId,hand:releasedHandState(pack,t.contact.actor.model,frame-r.frame,r.settleFrames)};
 });
}
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
   const restHand=(world:Point)=>{
     const local:Point=[(world[0]-a.x)/(a.scale*a.facing),(world[1]-a.floor)/a.scale];
     const shape=releasedHandState(pack,model,0);
     return hand==='left'?{leftWrist:local,leftHand:shape,leftHandAngle:180}:
       {rightWrist:local,rightHand:shape,rightHandAngle:180};
   };
   const handBounds=(solved:ReturnType<typeof actorSprites>)=>{
     const palm=solved.sprites.find(s=>s.id===prefix+hand+'-hand');
     if(!palm)throw Error('G3_REST_HAND_MISSING '+actorId);
     return spriteBounds(pack,palm);
   };
   const overlap=(x:ReturnType<typeof spriteBounds>,y:ReturnType<typeof spriteBounds>)=>
     Math.max(0,Math.min(x.right,y.right)-Math.max(x.left,y.left))*
     Math.max(0,Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top));
   if(restStyle==='legacy'){
    // Historical baseline search, kept so A/B baselines stay reproducible.
    for(let yshift=10;yshift>=-4&&!destination;yshift-=2){
     for(const factor of Array.from({length:20},(_,n)=>.38-n*.02)){
      const world:Point=[mix(a.x,rest[0],Math.max(0,factor)),rest[1]+yshift];
      try{
       const solved=actorSprites(pack,{...neutral,...restHand(world)});
       if(spriteBoundsGap(handBounds(solved),propBounds)<6)continue;
       destination=world;break;
      }catch(e){if(!(e instanceof Error)||!e.message.startsWith('IK_UNREACHABLE'))throw e;}
     }
    }
   }else{
    // Hang the hand where the arm falls naturally, beside the body. Hard
    // limits: >=6px clear of the resting prop and at most 10% of the hand's
    // own rotated rectangle inside either thigh's rotated rectangle. Among valid spots take the one closest to the
    // natural hang. If none exists the staging leaves no room for the hand,
    // which is an authoring error, not something to hide on the thigh.
    for(let yshift=10;yshift>=-4;yshift-=2){
     for(let n=-20;n<=20;n++){
      const factor=1+n*.02;
      const world:Point=[mix(a.x,rest[0],factor),rest[1]+yshift];
      try{
       const solved=actorSprites(pack,{...neutral,...restHand(world)});
       const visible=handBounds(solved);
       if(spriteBoundsGap(visible,propBounds)<6)continue;
       const area=(visible.right-visible.left)*(visible.bottom-visible.top);
       if(!(area>0))throw Error('G3_REST_HAND_BOUNDS '+actorId);
       const palm=solved.sprites.find(s=>s.id===prefix+hand+'-hand')!;
       const thighRatio=solved.sprites.filter(s=>
         s.id===prefix+'left-thigh'||s.id===prefix+'right-thigh')
         .reduce((sum,s)=>sum+orientedCoverage(pack,palm,s),0);
       if(thighRatio>.1)continue;
       const score=Math.abs(factor-1)+Math.abs(yshift)*.002;
       if(score<best-1e-10){best=score;destination=world;}
      }catch(e){if(!(e instanceof Error)||!e.message.startsWith('IK_UNREACHABLE'))throw e;}
     }
    }
    if(!destination)throw Error('G3_RELEASE_REST_BLOCKED_BY_STAGING '+actorId+
      ': no reachable hang beside the body is clear of '+t.contact.object.id+' and the thighs');
   }
   if(!destination)throw Error('G3_RELEASE_RESTING_HAND_CLEARANCE_UNREACHABLE '+actorId);
   const world=mixPoint(before,destination,u);
   const local:Point=[(world[0]-a.x)/(a.scale*a.facing),
     (world[1]-a.floor)/a.scale];
   const head=hold.frame.sprites.find(s=>s.id===prefix+'head')?.rotation??0;
   const shape=releasedHandState(pack,model,frame-release.frame,release.settleFrames);
   const angle=releasedHandAngle(pack,model,frame-release.frame,release.settleFrames??24,mix(0,1,u));
   const pose:ActorPose={...neutral,headAngle:head/a.facing*(1-u),
     ...(hand==='left'?
       {leftWrist:local,leftHand:shape,leftHandAngle:angle}:
       {rightWrist:local,rightHand:shape,rightHandAngle:angle})};
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
