import {anchorPoint} from '../../scene/geometry.js';
import type {ArtPack,SceneFrame} from '../../scene/types.js';
const feet=['mai.left-boot','mai.right-boot','an.left-boot','an.right-boot'];
export function contactPoints(pack:ArtPack,frame:SceneFrame,groundY:number):Map<string,[number,number]> {
 if(!Number.isFinite(groundY))throw Error('PAPER_CONTACT_GROUND');
 const result=new Map<string,[number,number]>();
 for(const id of feet){
  const sprites=frame.sprites.filter(s=>s.id===id);if(sprites.length!==1)throw Error(`PAPER_CONTACT_SPRITE ${id}`);
  const [x,y]=anchorPoint(pack,sprites[0]!,'sole');
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(y-groundY)>1)throw Error(`PAPER_CONTACT_GAP ${id}`);
  result.set(id,[x,groundY]);
 }return result;
}
