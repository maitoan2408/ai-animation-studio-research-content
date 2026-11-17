/**
 * General scene-graph QA contract. Independent of actor names, prop types,
 * action vocabulary, camera and art pack. Call on EVERY frame of any backend.
 * Explicit authored contact relations are required: never infer artistic
 * correctness from the mere existence of an anchor or a passing CI run.
 */
import {anchorPoint} from '../scene/geometry.js';
import type {ArtPack,SceneFrame,Point,Sprite} from '../scene/types.js';

export type QualityIssue={code:string;frame:number;subject:string;detail:string};
export type ContactContract={
  id:string; holderId:string; propId:string;
  holderAnchor:string; propAnchor:string;
  /** In a layered grasp, draw prop after rear palm and before fingers. */
  rearId?:string; frontId?:string;
  tolerancePx?:number;
};
export type FrameContract={frame:number;contacts?:ContactContract[]};
export type QualityPolicy={
  maxCameraDeltaPx?:number;maxCameraZoomRatio?:number;
  maxSpriteJumpPx?:number;maxRotationDeltaDegrees?:number;
};
const finite=(v:number)=>Number.isFinite(v);
const dist=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const index=(sprites:Sprite[])=>new Map(sprites.map(s=>[s.id,s]));
export function auditFrame(
  scene:SceneFrame,pack:ArtPack,contract:FrameContract,
  previous?:SceneFrame,policy:QualityPolicy={},
):QualityIssue[]{
  const issues:QualityIssue[]=[];
  const fail=(code:string,subject:string,detail:string)=>
    issues.push({code,frame:contract.frame,subject,detail});
  const known=new Set(pack.assets.map(a=>a.id));
  const ids=new Set<string>();
  for(const s of scene.sprites){
    if(ids.has(s.id))fail('QA_DUPLICATE_SPRITE',s.id,'duplicate instance ID');
    ids.add(s.id);
    if(!known.has(s.asset))fail('QA_UNKNOWN_ART',s.id,s.asset);
    if(![s.x,s.y,s.z,s.rotation,s.scaleX,s.scaleY,s.opacity].every(finite))
      fail('QA_NONFINITE_SPRITE',s.id,'invalid transform or alpha');
    if(s.opacity<0||s.opacity>1)fail('QA_ALPHA_RANGE',s.id,String(s.opacity));
    if(s.scaleX===0||s.scaleY===0)fail('QA_ZERO_SCALE',s.id,'zero-area sprite');
  }
  if(![scene.camera.x,scene.camera.y,scene.camera.zoom].every(finite)||
     scene.camera.zoom<=0)fail('QA_CAMERA_INVALID','camera','non-finite or non-positive zoom');
  const byId=index(scene.sprites);
  for(const c of contract.contacts??[]){
    const holder=byId.get(c.holderId),prop=byId.get(c.propId);
    if(!holder||!prop){fail('QA_CONTACT_SPRITE_MISSING',c.id,'holder/prop absent');continue;}
    try{
      const a=anchorPoint(pack,holder,c.holderAnchor),b=anchorPoint(pack,prop,c.propAnchor);
      if(dist(a,b)>(c.tolerancePx??1))
        fail('QA_CONTACT_MISALIGNED',c.id,dist(a,b).toFixed(3)+'px');
    }catch(e){fail('QA_CONTACT_ANCHOR_MISSING',c.id,String(e));}
    if(c.rearId||c.frontId){
      const rear=c.rearId?byId.get(c.rearId):undefined;
      const front=c.frontId?byId.get(c.frontId):undefined;
      if((c.rearId&&!rear)||(c.frontId&&!front))
        fail('QA_OCCLUSION_PART_MISSING',c.id,'required layer absent');
      else if((rear&&!(rear.z<prop.z))||(front&&!(prop.z<front.z)))
        fail('QA_OCCLUSION_ORDER',c.id,'rear < prop < front required');
    }
  }
  if(previous){
    const old=index(previous.sprites);
    const maxJump=policy.maxSpriteJumpPx??Number.POSITIVE_INFINITY;
    const maxRotation=policy.maxRotationDeltaDegrees??Number.POSITIVE_INFINITY;
    for(const s of scene.sprites){
      const before=old.get(s.id);if(!before)continue;
      if(dist([s.x,s.y],[before.x,before.y])>maxJump)
        fail('QA_SPRITE_TELEPORT',s.id,'frame-to-frame displacement exceeds policy');
      const turn=Math.abs(((s.rotation-before.rotation+540)%360)-180);
      if(turn>maxRotation)fail('QA_ROTATION_SNAP',s.id,'rotation exceeds policy');
    }
    const delta=dist([scene.camera.x,scene.camera.y],[previous.camera.x,previous.camera.y]);
    if(delta>(policy.maxCameraDeltaPx??Number.POSITIVE_INFINITY))
      fail('QA_CAMERA_JUMP','camera',delta.toFixed(3)+'px');
    const ratio=scene.camera.zoom/previous.camera.zoom;
    const limit=policy.maxCameraZoomRatio??Number.POSITIVE_INFINITY;
    if(finite(ratio)&&(ratio>limit||ratio<1/limit))
      fail('QA_CAMERA_ZOOM_SNAP','camera',String(ratio));
  }
  return issues;
}
export function auditSequence(
  scenes:readonly SceneFrame[],pack:ArtPack,
  contracts:readonly FrameContract[]=[],policy:QualityPolicy={},
):{status:'PASS'|'FAIL';issues:QualityIssue[];frames:number}{
  const issues:QualityIssue[]=[];
  for(let i=0;i<scenes.length;i++){
    const c=contracts.find(x=>x.frame===i)??{frame:i};
    issues.push(...auditFrame(scenes[i]!,pack,c,i>0?scenes[i-1]:undefined,policy));
  }
  return {status:issues.length?'FAIL':'PASS',issues,frames:scenes.length};
}
