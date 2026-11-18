/** Opt-in G3 elbow-branch selection for a planted cutout rig.
 * Correct a real paper-doll failure: a near-body grip can put the elbow ABOVE
 * its shoulder merely because the legacy rig uses a fixed +/- IK branch.
 * The choice is derived from source shoulder/wrist and native art link anchors;
 * it stays fixed across the whole contact/release clip to avoid a joint pop.
 * It does not touch hands, world grip, Rapier, soles, or archived rig output.
 */
import {elbow} from './math.js';
import {anchorPoint} from './geometry.js';
import type {ArtPack,SceneFrame,Point,Sprite} from './types.js';

export type G3Bend=1|-1;
type Side='left'|'right';
const item=(frame:SceneFrame,id:string):Sprite=>{
 const s=frame.sprites.find(p=>p.id===id);
 if(!s)throw Error('G3_ELBOW_PART_MISSING '+id);
 return s;
};
const wrist=(frame:SceneFrame,id:string):Point=>{
 const marker=frame.markers.find(m=>m.id===id);
 if(!marker)throw Error('G3_ELBOW_WRIST_MISSING '+id);
 return marker.point;
};
const linkLength=(pack:ArtPack,s:Sprite)=>{
 const art=pack.assets.find(a=>a.id===s.asset);
 if(!art?.anchors.end)throw Error('G3_ELBOW_NATIVE_LINK_MISSING '+s.asset);
 const dx=(art.anchors.end[0]-art.pivot[0])*s.scaleX;
 const dy=(art.anchors.end[1]-art.pivot[1])*s.scaleY;
 const length=Math.hypot(dx,dy);
 if(!Number.isFinite(length)||length<1)throw Error('G3_ELBOW_LINK_INVALID '+s.asset);
 return length;
};
const degree=(a:Point,b:Point)=>Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI-90;
function joints(frame:SceneFrame,pack:ArtPack,actorId:string,side:Side,facing:1|-1){
 const upper=item(frame,actorId+'.'+side+'-upper');
 const forearm=item(frame,actorId+'.'+side+'-forearm');
 const shoulder:Point=[upper.x,upper.y];
 const hand=wrist(frame,actorId+'.'+side+'-wrist');
 const u=linkLength(pack,upper),f=linkLength(pack,forearm);
 return {upper,forearm,shoulder,hand,
  joint:(bend:G3Bend)=>elbow(shoulder,hand,u,f,(bend*facing) as G3Bend)};
}
/** Use the first source-held pose to select an ergonomic branch once.
 * Strongly discourage elbows above shoulders; mildly discourage elbows
 * folding back across the torso. Both penalties are dimensionless and
 * invariant under uniform scale and facing reversal.
 */
export function selectG3ElbowBend(frame:SceneFrame,pack:ArtPack,actorId:string,
 side:Side,facing:1|-1):G3Bend{
 const chain=joints(frame,pack,actorId,side,facing);
 const reference=Math.max(1,linkLength(pack,chain.upper));
 const cost=(bend:G3Bend)=>{
  const p=chain.joint(bend);
  const above=Math.max(0,chain.shoulder[1]-p[1])/reference;
  const towardTorso=Math.max(0,(p[0]-chain.shoulder[0])*facing*(side==='left'?1:-1))/reference;
  return above*2+towardTorso*.6;
 };
 const negative=cost(-1),positive=cost(1);
 // Ties retain archived side preference and avoid an arbitrary bend flip.
 return Math.abs(negative-positive)<1e-9?(side==='left'?-1:1):
   negative<positive?-1:1;
}
/** Retarget only the two source arm-sprite rotations, without touching hands,
 * tips or art. Scene markers remain source authored. Native link end anchors
 * are required to coincide with the next native link's pivot.
 */
export function applyG3ElbowBend(frame:SceneFrame,pack:ArtPack,actorId:string,
 side:Side,facing:1|-1,bend:G3Bend):SceneFrame{
 if(bend!==1&&bend!==-1)throw Error('G3_ELBOW_BEND_INVALID');
 const chain=joints(frame,pack,actorId,side,facing);
 const joint=chain.joint(bend);
 if(Math.hypot(chain.forearm.x-joint[0],chain.forearm.y-joint[1])<.001 &&
    Math.hypot(anchorPoint(pack,chain.upper,'end')[0]-joint[0],
      anchorPoint(pack,chain.upper,'end')[1]-joint[1])<.001)return frame;
 const upper={...chain.upper,rotation:degree(chain.shoulder,joint)};
 const forearm={...chain.forearm,x:joint[0],y:joint[1],
  rotation:degree(joint,chain.hand)};
 const resolved={...frame,sprites:frame.sprites.map(s=>
  s.id===upper.id?upper:s.id===forearm.id?forearm:s)};
 const actual=anchorPoint(pack,upper,'end');
 const last=anchorPoint(pack,forearm,'end');
 if(Math.hypot(actual[0]-joint[0],actual[1]-joint[1])>.001 ||
    Math.hypot(last[0]-chain.hand[0],last[1]-chain.hand[1])>.001)
  throw Error('G3_ELBOW_NATIVE_CHAIN_DISCONNECTED');
 return resolved;
}
