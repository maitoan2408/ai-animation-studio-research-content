/**
 * G2: opt-in, data-only, hand-independent art/IK contract.
 * Accepts any compatible production-cutout-1 character kit and any project
 * native asset with a named contact anchor; never assumes a particular cup,
 * character ID, side, or a positional code path. Legacy M3 remains unchanged.
 */
import {actorSprites} from '../scene/rig.js';
import {anchorPoint} from '../scene/geometry.js';
import {sprite,type ArtPack,type ActorPose,type SceneFrame,type Sprite} from '../scene/types.js';
import {auditFrame,type ContactContract,type FrameContract,type SpriteContract,type GroundContract} from '../qa/general-scene-quality.js';

export type HandSide='left'|'right';
export type ContactProject={
  schemaVersion:'general-contact/1';
  actor:{id:string;model:string;rigId:'production-cutout-1';x:number;floor:number;facing:1|-1;scale:number};
  object:{id:string;asset:string;sha256:string;x:number;y:number;scale:number;anchor:string};
  hand:HandSide;
  camera:{x:number;y:number;zoom:number};
};
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,a:string[])=>Object.keys(v).sort().join('|')===a.slice().sort().join('|');
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
const validId=(x:unknown):x is string=>typeof x==='string'&&/^[a-z][a-z0-9-]{1,38}$/.test(x);
const asset=(pack:ArtPack,name:string)=>pack.assets.find(a=>a.id===name);
export function validateGeneralContact(raw:unknown,pack:ArtPack):ContactProject{
  if(!obj(raw)||!keys(raw,['schemaVersion','actor','object','hand','camera'])||
     raw.schemaVersion!=='general-contact/1'||!obj(raw.actor)||!obj(raw.object)||!obj(raw.camera)||
     !keys(raw.actor,['id','model','rigId','x','floor','facing','scale'])||
     !keys(raw.object,['id','asset','sha256','x','y','scale','anchor'])||
     !keys(raw.camera,['x','y','zoom']))throw Error('GENERAL_CONTACT_SCHEMA');
  const a=raw.actor,o=raw.object,c=raw.camera,h=raw.hand;
  if(!validId(a.id)||!validId(a.model)||a.rigId!=='production-cutout-1'||
     !finite(a.x)||!finite(a.floor)||!finite(a.scale)||a.scale<=0||a.scale>2||
     a.facing!==1&&a.facing!==-1||
     !validId(o.id)||o.id===a.id||typeof o.asset!=='string'||typeof o.sha256!=='string'||
     !finite(o.x)||!finite(o.y)||!finite(o.scale)||o.scale<=0||o.scale>2||
     !validId(o.anchor)||h!=='left'&&h!=='right'||
     !finite(c.x)||!finite(c.y)||!finite(c.zoom)||c.zoom<=0||c.zoom>4)
    throw Error('GENERAL_CONTACT_PARAMETER');
  const model=a.model as string,side=h as HandSide;
  for(const part of ['torso','thigh','shin','boot','upper-arm','forearm',
    'head-quarter-neutral','hand-grip','hand-open','hand-grip-front']){
    const item=asset(pack,model+'/'+part);
    if(!item||!/^[0-9a-f]{64}$/.test(item.sha256))throw Error('GENERAL_RIG_ASSET: '+part);
  }
  const prop=asset(pack,o.asset);
  if(!prop||prop.sha256!==o.sha256||prop.category!=='prop'||
     !prop.anchors[o.anchor as string])throw Error('GENERAL_PROP_ANCHOR_OR_HASH');
  if(!asset(pack,model+'/hand-grip')!.anchors.grip||
     !asset(pack,model+'/hand-grip-front')!.anchors.grip)throw Error('GENERAL_HAND_CONTACT_ASSETS');
  // A grasp across the body may be deliberately authored later, but this
  // version refuses unsupported cross-body cinematography rather than silently
  // claiming it is natural. World-space test respects mirrored characters.
  const placed=sprite(o.id as string,o.asset,o.x as number,o.y as number,5.22,0,o.scale as number);
  const grip=anchorPoint(pack,placed,o.anchor as string);
  if((grip[0]-(a.x as number))*(a.facing as number)*(side==='right'?1:-1)<20)
    throw Error('GENERAL_CONTACT_WRONG_SIDE');
  return raw as ContactProject;
}
/** Authored requirements for the supported rig, independent of sampled sprites
 * and markers. A release removes the declared grip but not the prop or feet.
 * World bounds describe the stage, not the deliberately cropped camera viewport. */
export function generalContactFrameContract(p:ContactProject,pack:ArtPack,frame:number,held=true):FrameContract{
 const {actor:a,object:o,hand}=p;
 const prefix=a.id+'.',requiredSprites:SpriteContract[]=[],grounds:GroundContract[]=[];
 const add=(id:string,artId:string,expectedSha?:string)=>{
   const item=asset(pack,artId);if(!item)throw Error('GENERAL_CONTRACT_ASSET: '+artId);
   requiredSprites.push({id,asset:artId,sha256:expectedSha??item.sha256});
 };
 for(const [side,offset] of [['left',-35],['right',48]] as const){
   for(const [part,art] of [['thigh','thigh'],['shin','shin'],['boot','boot'],
     ['upper','upper-arm'],['forearm','forearm']] as const)
     add(prefix+side+'-'+part,a.model+'/'+art);
   add(prefix+side+'-hand',a.model+'/hand-'+(held&&side===hand?'grip':'open'));
   if(held&&side===hand)add(prefix+side+'-grip-front',a.model+'/hand-grip-front');
   // Authoritative planted stance for production-cutout-1; no marker input.
   grounds.push({id:prefix+side+'-sole',spriteId:prefix+side+'-boot',anchor:'sole',
     point:[a.x+offset*a.scale*a.facing,a.floor],tolerancePx:.001});
 }
 add(prefix+'torso',a.model+'/torso');
 add(prefix+'head',a.model+'/head-quarter-neutral');
 add(prefix+'mouth','mouth/rest');
 add(o.id,o.asset,o.sha256);
 const contact:ContactContract={id:a.id+'-'+hand+'-'+o.id,
   holderId:prefix+hand+'-hand',propId:o.id,holderAnchor:'grip',propAnchor:o.anchor,
   rearId:prefix+hand+'-hand',frontId:prefix+hand+'-grip-front',frontAnchor:'grip',
   tolerancePx:.001};
 return {frame,requiredSprites,grounds,contacts:held?[contact]:[],
   bounds:[{id:a.id,spriteIds:requiredSprites.map(r=>r.id),minX:0,minY:0,maxX:1920,maxY:1080}]};
}
export type GeneralGripFrame={
  pose:ActorPose;objectSprite:Sprite;frame:SceneFrame;contact:ContactContract;
};
export function sampleGeneralGrip(raw:unknown,pack:ArtPack):GeneralGripFrame{
  const p=validateGeneralContact(raw,pack);
  const a=p.actor,o=p.object,hand=p.hand;
  const objectSprite=sprite(o.id,o.asset,o.x,o.y,5.22,0,o.scale);
  const target=anchorPoint(pack,objectSprite,o.anchor);
  const handAsset=asset(pack,a.model+'/hand-grip')!;
  const offset=handAsset.anchors.grip!;
  const dx=offset[0]-handAsset.pivot[0],dy=offset[1]-handAsset.pivot[1];
  const wrist:[number,number]=[
    (target[0]-a.x)/(a.scale*a.facing)-dx,
    (target[1]-a.floor)/a.scale-dy,
  ];
  const pose:ActorPose={id:a.id,character:a.model,x:a.x,floor:a.floor,
    facing:a.facing,scale:a.scale,view:'quarter',layeredGripSide:hand,
    ...(hand==='left'?{leftHand:'grip' as const,leftWrist:wrist,leftHandAngle:0}:
      {rightHand:'grip' as const,rightWrist:wrist,rightHandAngle:0})};
  let rig;
  try{rig=actorSprites(pack,pose);}
  catch(e){throw Error('GENERAL_CONTACT_UNREACHABLE: '+String(e));}
  const contact:ContactContract={
    id:a.id+'-'+hand+'-'+o.id,holderId:a.id+'.'+hand+'-hand',propId:o.id,
    holderAnchor:'grip',propAnchor:o.anchor,
    rearId:a.id+'.'+hand+'-hand',frontId:a.id+'.'+hand+'-grip-front',frontAnchor:'grip',
    tolerancePx:.001,
  };
  const frame:SceneFrame={camera:{...p.camera},sprites:[...rig.sprites,objectSprite],markers:rig.markers};
  const result=auditFrame(frame,pack,generalContactFrameContract(p,pack,0));
  if(result.length)throw Error('GENERAL_CONTACT_QA: '+result.map(x=>x.code).join(','));
  return {pose,objectSprite,frame,contact};
}
