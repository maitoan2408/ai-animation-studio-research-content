/**
 * G3-only, reusable planted-recovery rest scoring. All distances are measured
 * against source-native sprite art, torso and thigh geometry; no character IDs,
 * shot coordinates, prop names, frames or theme-specific constants.
 *
 * This is an articulated-body heuristic, not alpha/pixel art acceptance:
 * native A/B playback and pixel-level review remain mandatory.
 */
import {spriteBounds} from './geometry.js';
import type {ArtPack,Point,Sprite} from './types.js';

type Side='left'|'right';
type Box=ReturnType<typeof spriteBounds>;
const hit=(a:Box,b:Box)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*
  Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
const source=(sprites:readonly Sprite[],id:string)=>{
 const s=sprites.find(x=>x.id===id);
 if(!s)throw Error('G3_REST_ART_PART_MISSING '+id);
 return s;
};
const length=(pack:ArtPack,s:Sprite)=>{
 const a=pack.assets.find(x=>x.id===s.asset);
 const end=a?.anchors.end;
 if(!a||!end)throw Error('G3_REST_LINK_METADATA '+s.asset);
 return Math.hypot((end[0]-a.pivot[0])*s.scaleX,
   (end[1]-a.pivot[1])*s.scaleY);
};
/** Lower is better. It scores the entire resting arm, not just the palm.
 * The desired lateral offset from the shoulder is proportional to the native
 * upper+lower arm length and therefore scales/mirrors across compatible rigs.
 */
export function scoreG3RestPose(pack:ArtPack,sprites:readonly Sprite[],
 actorId:string,side:Side,nominalRest:Point,yshift:number):number{
 const p=actorId+'.';
 const palm=source(sprites,p+side+'-hand');
 const forearm=source(sprites,p+side+'-forearm');
 const upper=source(sprites,p+side+'-upper');
 const torso=source(sprites,p+'torso');
 const thighs=[source(sprites,p+'left-thigh'),source(sprites,p+'right-thigh')];
 const handBox=spriteBounds(pack,palm),foreBox=spriteBounds(pack,forearm);
 const torsoBox=spriteBounds(pack,torso);
 const legBoxes=thighs.map(t=>spriteBounds(pack,t));
 const area=(b:Box)=>(b.right-b.left)*(b.bottom-b.top);
 const handArea=area(handBox),foreArea=area(foreBox);
 if(!(handArea>0&&foreArea>0))throw Error('G3_REST_ART_BOUNDS');
 const handThigh=legBoxes.reduce((n,b)=>n+hit(handBox,b),0)/handArea;
 const foreThigh=legBoxes.reduce((n,b)=>n+hit(foreBox,b),0)/foreArea;
 const handTorso=hit(handBox,torsoBox)/handArea;
 const axis=Math.sign(upper.x-torso.x);
 if(axis===0)throw Error('G3_REST_SHOULDER_SIDE_UNDEFINED');
 const span=length(pack,upper)+length(pack,forearm);
 // Avoid a wrist that turns inward across its own shoulder and hip; also
 // avoid excessive outward extension. Keep a forgiving natural droop range.
 const lateral=(palm.x-upper.x)*axis;
 const inward=Math.max(0,span*.20-lateral)/span;
 const outward=Math.max(0,lateral-span*.42)/span;
 const deviation=Math.hypot(palm.x-nominalRest[0],palm.y-nominalRest[1])/span;
 // Hand/thigh contact is a readability blocker; forearm/body intersections
 // and overextended shoulders carry smaller independent penalties.
 return 12*handThigh+3*foreThigh+2*handTorso+5*inward+2*outward+
   .09*deviation+.003*Math.abs(yshift);
}
