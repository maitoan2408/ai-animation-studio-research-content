/** G3 opt-in 2.5D projection of the source native forearm. Do not flip
 * the outside elbow across the torso (rejected in independent R4 art review).
 * World grip/hand, feet, props, Rapier and legacy source remain unchanged.
 */
import {elbow} from './math.js';
import {anchorPoint} from './geometry.js';
import type {ArtPack,SceneFrame,Point,Sprite} from './types.js';
type Side='left'|'right';
const part=(f:SceneFrame,id:string):Sprite=>{
 const s=f.sprites.find(v=>v.id===id);
 if(!s)throw Error('G3_PROJECTION_SPRITE_MISSING '+id);
 return s;
};
const length=(pack:ArtPack,s:Sprite,nominalY:number)=>{
 const a=pack.assets.find(x=>x.id===s.asset);
 if(!a?.anchors.end)throw Error('G3_PROJECTION_ART_MISSING '+s.asset);
 const n=Math.hypot((a.anchors.end[0]-a.pivot[0])*s.scaleX,
 (a.anchors.end[1]-a.pivot[1])*nominalY);
 if(!(n>0))throw Error('G3_PROJECTION_LINK_INVALID');
 return n;
};
const angle=(a:Point,b:Point)=>Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI-90;
/** Bounded perspective, no bone stretch. Select the least foreshortening in
 * [0.56,1] that avoids the winged near-body elbow. If none is feasible,
 * retain source IK. Derive nominal lengths from asset pivots/ends and the
 * unchanged upper-arm scale, so repeated random seeks are idempotent.
 */
export function applyG3ArmProjection(f:SceneFrame,pack:ArtPack,actor:string,
 side:Side,facing:1|-1):SceneFrame{
 const u=part(f,actor+'.'+side+'-upper'),v=part(f,actor+'.'+side+'-forearm');
 const wrist=f.markers.find(m=>m.id===actor+'.'+side+'-wrist')?.point;
 if(!wrist)throw Error('G3_PROJECTION_WRIST_MISSING');
 const shoulder:Point=[u.x,u.y],nominal=u.scaleY;
 const upper=length(pack,u,nominal),lower=length(pack,v,nominal);
 const bend=((side==='left'?-1:1)*facing) as 1|-1;
 let joint=elbow(shoulder,wrist,upper,lower,bend),ratio=1;
 if(joint[1]<shoulder[1]+upper*.06){
  for(let i=1;i<=44;i++){
   const candidateRatio=1-i*.01;
   let candidate:Point;
   try{candidate=elbow(shoulder,wrist,upper,lower*candidateRatio,bend);}
   catch(e){if(e instanceof Error&&e.message.startsWith('IK_UNREACHABLE'))break;throw e;}
   if(candidate[1]>=shoulder[1]+upper*.06){joint=candidate;ratio=candidateRatio;break;}
  }
 }
 const nu={...u,rotation:angle(shoulder,joint)};
 const nv={...v,x:joint[0],y:joint[1],scaleY:nominal*ratio,
  rotation:angle(joint,wrist)};
 if(Math.abs(u.rotation-nu.rotation)<1e-9&&
    Math.hypot(v.x-joint[0],v.y-joint[1])<1e-8&&
    Math.abs(v.scaleY-nv.scaleY)<1e-9&&
    Math.abs(v.rotation-nv.rotation)<1e-9)return f;
 const endUpper=anchorPoint(pack,nu,'end'),endLower=anchorPoint(pack,nv,'end');
 if(Math.hypot(endUpper[0]-joint[0],endUpper[1]-joint[1])>.001||
    Math.hypot(endLower[0]-wrist[0],endLower[1]-wrist[1])>.001)
  throw Error('G3_PROJECTION_NATIVE_ANCHOR_DRIFT');
 return {...f,sprites:f.sprites.map(s=>s.id===u.id?nu:s.id===v.id?nv:s)};
}
