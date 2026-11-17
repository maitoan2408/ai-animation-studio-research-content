/**
 * Reusable, asset-backed two-hand grip planner for the supported 2.5D cutout rig.
 * No object-name tests, scene ID, mutable cache or frame history.
 * Reject unsupported rig/art geometry at authoring time rather than claiming
 * a numerically aligned marker is a believable grasp.
 */
import type {ArtPack,Point} from '../scene/types.js';

export type GripSide='left'|'right';
export type GripSpec=Readonly<{
  actorModel:'mai'|'an';actorX:number;actorFloor:number;actorFacing:1|-1;
  propAsset:string;propX:number;propY:number;propScale:number;
  side:GripSide;lift:number;
}>;
export type GripPlan=Readonly<{
  side:GripSide;wrist:Point;shoulder:Point;
  distance:number;maxReach:number;
  layers:{forearm:number;palm:number;prop:number;fingers:number};
}>;
const finite=(n:number)=>Number.isFinite(n);
export function gripSide(value:unknown):GripSide {
 if(value!==undefined&&value!=='left'&&value!=='right')
   throw Error('CONTACT_SIDE_UNSUPPORTED');
 return value==='left'?'left':'right'; // original M3 project contract
}
export function gripDepth(side:GripSide){
 const arm=side==='right'?5:2.5;
 return {forearm:arm+.1,palm:arm+.15,prop:arm+.22,fingers:arm+.35};
}
/** Resolve the actual asset pivots and anchors into local wrist IK targets.
 * Works for any project art-pack `prop` with a named grip anchor; does not
 * imply arbitrary rigid-body physics, semantic gesture design or retargeting.
 */
export function planGrip(pack:ArtPack,spec:GripSpec):GripPlan {
 const {actorModel,actorX,actorFloor,actorFacing,propAsset,propX,propY,
   propScale,side,lift}=spec;
 if(![actorX,actorFloor,propX,propY,propScale,lift].every(finite)||
    propScale<=0||lift<0||(actorFacing!==1&&actorFacing!==-1))
   throw Error('CONTACT_NONFINITE_OR_BOUNDS');
 const torso=pack.assets.find(a=>a.id===actorModel+'/torso');
 const hand=pack.assets.find(a=>a.id===actorModel+'/hand-grip');
 const front=pack.assets.find(a=>a.id===actorModel+'/hand-grip-front');
 const object=pack.assets.find(a=>a.id===propAsset);
 const shoulder=torso?.anchors[side+'Shoulder'],finger=front?.anchors.grip;
 if(!torso||!shoulder||!hand?.anchors.grip||!front||!finger||
   !object||object.category!=='prop'||!object.anchors.grip)
   throw Error('CONTACT_ASSET_OR_ANCHOR_UNAVAILABLE');
 const sx=shoulder[0]-torso.pivot[0];
 const sy=-258+shoulder[1]-torso.pivot[1];
 const hx=hand.anchors.grip[0]-hand.pivot[0];
 const hy=hand.anchors.grip[1]-hand.pivot[1];
 const ox=(object.anchors.grip[0]-object.pivot[0])*propScale;
 const oy=(object.anchors.grip[1]-object.pivot[1])*propScale;
 const wrist:Point=[(propX+ox-actorX)/actorFacing-(side==='left'?-hx:hx),
   propY+oy-lift-actorFloor-hy];
 const shoulderLocal:Point=[sx,sy];
 const dx=wrist[0]-sx,dy=wrist[1]-sy;
 // In the production cutout shoulders and hands are side-specific. Across-body
 // grabs may be mathematically reachable yet visibly pass through the torso.
 if(side==='right'?dx<12:dx>-12)
   throw Error(side==='right'?'M3_RIGHT_HAND_PROP_STAGING':'M3_LEFT_HAND_PROP_STAGING');
 const distance=Math.hypot(dx,dy),maxReach=105+98;
 if(distance>maxReach+1e-6||distance<105-98-1e-6)
   throw Error('M3_PICK_IK_UNREACHABLE: reach='+distance.toFixed(3));
 return {side,wrist,shoulder:shoulderLocal,distance,maxReach,layers:gripDepth(side)};
}
