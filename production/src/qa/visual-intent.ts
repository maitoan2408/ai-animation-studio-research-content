/** Source-derived G3 ownership, visible grip and support-surface auditor.
 * This runs on real sprite geometry; never trusts contact markers alone.
 * The short free-fall phase is intentional, never mislabeled as a float bug.
 */
import {anchorPoint,spriteBounds,spriteBoundsGap} from '../scene/geometry.js';
import type {ArtPack,SceneFrame,Sprite,Point} from '../scene/types.js';
import type {GeneralPlayback} from '../motion/general-playback.js';
import {releasedHandState} from '../motion/hand-release.js';

export type PropState='held'|'falling'|'settling'|'resting';
export type VisualIntentIssue={code:string;frame:number;actorId:string;detail:string};
export type PropVisualState={actorId:string;propId:string;frame:number;state:PropState;
 supportDistancePx:number|null};
const dist=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const byId=(frame:SceneFrame,id:string):Sprite|undefined=>frame.sprites.find(s=>s.id===id);
const fail=(issues:VisualIntentIssue[],code:string,frame:number,actorId:string,detail:string)=>
 issues.push({code,frame,actorId,detail});

export function auditG3VisualIntent(playback:GeneralPlayback,frame:number,scene:SceneFrame,
 pack:ArtPack):{states:PropVisualState[];issues:VisualIntentIssue[]}{
 if(!Number.isSafeInteger(frame)||frame<0||frame>=playback.film.frames)
  throw RangeError('G3_VISUAL_FRAME_OUT_OF_RANGE');
 const issues:VisualIntentIssue[]=[],states:PropVisualState[]=[];
 for(const track of playback.film.tracks){
  const a=track.contact.actor,propDef=track.contact.object,hand=track.contact.hand;
  const release=playback.releases.find(r=>r.actorId===a.id);
  const prop=byId(scene,propDef.id);
  if(!prop){fail(issues,'G3_VISUAL_PROP_MISSING',frame,a.id,propDef.id);continue;}
  const first=release?.bake.contacts[0];
  const contactFrame=release&&first!==undefined?release.frame+first:undefined;
  const state:PropState=!release||frame<release.frame?'held':
   contactFrame===undefined||frame<contactFrame?'falling':
   frame<contactFrame+6?'settling':'resting';
  const prefix=a.id+'.',palm=byId(scene,prefix+hand+'-hand'),
   fingers=byId(scene,prefix+hand+'-grip-front');
  if(!palm){fail(issues,'G3_VISUAL_HAND_MISSING',frame,a.id,hand);continue;}
  if(state==='held'){
   const palmArt=pack.assets.find(x=>x.id===palm.asset);
   if(!palmArt||!palm.asset.endsWith('/hand-grip'))
    fail(issues,'G3_VISUAL_HELD_HAND_OPEN',frame,a.id,palm.asset);
   if(!fingers)fail(issues,'G3_VISUAL_GRIP_FINGERS_MISSING',frame,a.id,hand);
   try{
    const p=anchorPoint(pack,palm,'grip');
    const q=anchorPoint(pack,prop,propDef.anchor);
    if(dist(p,q)>.001)fail(issues,'G3_VISUAL_HELD_GRIP_DETACHED',frame,a.id,String(dist(p,q)));
    if(fingers){
     const r=anchorPoint(pack,fingers,'grip');
     if(dist(r,q)>.001||!(palm.z<prop.z&&prop.z<fingers.z))
      fail(issues,'G3_VISUAL_GRIP_LAYER_OR_CONTACT',frame,a.id,hand);
    }
   }catch(e){fail(issues,'G3_VISUAL_GRIP_ANCHOR_UNAVAILABLE',frame,a.id,String(e));}
  }else{
   if(fingers)fail(issues,'G3_VISUAL_GHOST_FINGERS_AFTER_RELEASE',frame,a.id,hand);
   const expected=a.model+'/hand-'+releasedHandState(pack,a.model,frame-release!.frame,release!.settleFrames);
   if(palm.asset!==expected)
    fail(issues,'G3_VISUAL_RELEASED_HAND_STILL_GRIPPING',frame,a.id,palm.asset+' expected '+expected);
  }
  let supportDistancePx:number|null=null;
  // An unheld object should not visually touch an idle open hand after
  // recovery: correct physics can still read as an invisible grip on film.
  if(release&&frame>=release.frame+(release.settleFrames??24)){
   try{
    const space=spriteBoundsGap(spriteBounds(pack,palm),spriteBounds(pack,prop));
    if(space<6)
     fail(issues,'G3_VISUAL_RELEASED_HAND_PROP_STILL_TOUCHING',frame,a.id,
       space.toFixed(3)+'px visual AABB gap');
   }catch(e){fail(issues,'G3_VISUAL_SEPARATION_GEOMETRY',frame,a.id,String(e));}
  }
  if(release){
   const top=release.project.platform.top;
   const p=release.project.platform;
   const visibleStage=(playback.film.stage??[]).some(s=>{
    const art=pack.assets.find(x=>x.id===s.asset),anchor=art?.anchors.support;
    if(!art||!anchor)return false;
    const left=s.x-art.pivot[0]*s.scale;
    const right=s.x+(art.width-art.pivot[0])*s.scale;
    const y=s.y+(anchor[1]-art.pivot[1])*s.scale;
    return Math.abs(left-p.left)<.001&&Math.abs(right-p.right)<.001&&Math.abs(y-top)<.001;
   });
   if(!visibleStage)fail(issues,'G3_VISUAL_SUPPORT_SURFACE_HIDDEN',frame,a.id,propDef.id);
   try{
    const support=anchorPoint(pack,prop,'support');
    supportDistancePx=top-support[1];
    if(support[0]<p.left||support[0]>p.right)
     fail(issues,'G3_VISUAL_PROP_OUTSIDE_SUPPORT',frame,a.id,String(support[0]));
    if(state==='resting'&&Math.abs(supportDistancePx)>4)
     fail(issues,'G3_VISUAL_RESTING_PROP_FLOAT_OR_SINK',frame,a.id,
      supportDistancePx.toFixed(3));
    // Contact can briefly penetrate/swing before solver settles; do not
    // confuse transient release/fall with a permanently unsupported object.
    if(state==='resting'&&contactFrame===undefined)
     fail(issues,'G3_VISUAL_RESTING_WITHOUT_CONTACT',frame,a.id,propDef.id);
   }catch(e){fail(issues,'G3_VISUAL_PROP_SUPPORT_ANCHOR',frame,a.id,String(e));}
  }
  states.push({actorId:a.id,propId:propDef.id,frame,state,supportDistancePx});
 }
 return {states,issues};
}
