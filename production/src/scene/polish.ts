/** Paper-layer and contact shadows. Lighting direction is fixed in stage space,
 * while each silhouette follows its own asset transform. Original character/prop
 * transforms and contact markers remain untouched. */
import {anchorPoint} from './geometry.js';
import {clamp} from './math.js';
import {sprite,type ArtPack,type SceneFrame,type Sprite} from './types.js';
export function polishFrame(pack:ArtPack,frame:SceneFrame):SceneFrame{
 const shadows:Sprite[]=[];
 for(const s of frame.sprites){
  const asset=pack.assets.find(a=>a.id===s.asset);if(!asset)throw Error(`POLISH_ASSET_MISSING ${s.asset}`);
  if(!['background','foreground','mouth','shadow'].includes(asset.category)){
   const id=`shadow/${s.asset}`;if(!pack.assets.some(a=>a.id===id))throw Error(`PAPER_SHADOW_MISSING ${id}`);
   shadows.push({...s,id:`${s.id}.paper-shadow`,asset:id,x:s.x+3,y:s.y+5,z:s.z-.02,opacity:s.opacity*.17});
  }
  if(s.asset.endsWith('/boot')){
   const sole=anchorPoint(pack,s,'sole'),height=Math.max(0,860-sole[1]);
   shadows.push({...sprite(`${s.id}.contact-shadow`,'effects/contact-shadow',sole[0]+16*s.scaleX,863,.5,0,.48*Math.abs(s.scaleX),.45*s.scaleY),opacity:.25*clamp(1-height/65)});
  }
 }
 return {...frame,sprites:[...shadows,...frame.sprites]};
}
