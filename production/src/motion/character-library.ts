/**
 * M3 reusable, data-only character package + bounded action-track evaluator.
 * Reuses the real audited cutout rig and versioned art pack. No generated JS.
 * World space is 1920x1080, y down; all positions are independent of history.
 */
import {actorSprites} from '../scene/rig.js';
import {background} from '../scene/benchmark.js';
import {anchorPoint} from '../scene/geometry.js';
import {smooth, mix} from '../scene/math.js';
import {sprite, type ActorPose, type ArtPack, type Point, type SceneFrame, type Sprite} from '../scene/types.js';
import {sampleAction} from './actions.js';

export const m3Actions=['walk-stop','turn-head','wave','pick-place'] as const;
export type M3Action=(typeof m3Actions)[number];
export type M3Clip={action:M3Action;frames:number};
export type M3Character={
  id:string;model:'mai'|'an';rigId:'production-cutout-1';
  artPackId:string;capabilities:M3Action[];
  xStart:number;floor:number;facing:1|-1;
};
export type M3Project={
  schemaVersion:'character-motion/1';
  character:M3Character;
  clips:M3Clip[];
  prop:{id:string;asset:'props/cup';sha256:string;x:number;y:number;scale:number};
};
export type M3Sample={
  action:M3Action;localFrame:number;pose:ActorPose;
  frame:SceneFrame;contact:{planted:string[];grip:boolean;gripError:number|null};
};
const exact=(o:object,keys:string[])=>Object.keys(o).sort().join('|')===keys.slice().sort().join('|');
const validNumber=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const isObj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const canonicalActions=()=>[...m3Actions];
const base=(c:M3Character,x:number):ActorPose=>({
  id:c.id,character:c.model,x,floor:c.floor,facing:c.facing,view:'quarter',
  leftAnkle:[-35,-29],rightAnkle:[48,-29],rightElbowBend:-1,
  rightWrist:[96,-220],rightHandAngle:180,
});
/** Fail closed: an instance ID may be new; its compatible artwork/rig must exist. */
export function validateM3(value:unknown,pack:ArtPack):M3Project{
  if(!isObj(value)||!exact(value,['schemaVersion','character','clips','prop'])||
     value.schemaVersion!=='character-motion/1'||!isObj(value.character)||
     !exact(value.character,['id','model','rigId','artPackId','capabilities','xStart','floor','facing']))
    throw Error('M3_PROJECT_INVALID');
  const c=value.character;
  if(typeof c.id!=='string'||!/^[a-z][a-z0-9-]{2,32}$/.test(c.id)||
     !['mai','an'].includes(String(c.model))||c.rigId!=='production-cutout-1'||
     c.artPackId!==pack.version||!Array.isArray(c.capabilities)||
     c.capabilities.length!==m3Actions.length||
     !m3Actions.every(a=>c.capabilities.includes(a))||
     !validNumber(c.xStart)||c.xStart<350||c.xStart>1250||
     !validNumber(c.floor)||c.floor<780||c.floor>950||
     c.facing!==1)
    throw Error('M3_CHARACTER_RIG_OR_CAPABILITIES');
  for(const part of ['torso','head-quarter-neutral','hand-grip','boot','thigh','shin','upper-arm','forearm']){
    if(!pack.assets.some(a=>a.id===c.model+'/'+part&&/^[a-f0-9]{64}$/.test(a.sha256)))
      throw Error('M3_CHARACTER_ART_MISSING: '+part);
  }
  if(!Array.isArray(value.clips)||value.clips.length<1||value.clips.length>12)
    throw Error('M3_CLIPS_INVALID');
  let total=0;
  for(const item of value.clips){
    if(!isObj(item)||!exact(item,['action','frames'])||
       !m3Actions.includes(item.action as M3Action)||
       !Number.isSafeInteger(item.frames))throw Error('M3_ACTION_UNSUPPORTED');
    const f=item.frames as number;
    if(item.action==='walk-stop'?(f<49||f>185||(f-25)%2!==0):
       item.action==='pick-place'?(f<73||f>241||(f-1)%4!==0):
       (f<25||f>241||(f-1)%4!==0))
      throw Error('M3_ACTION_DURATION');
    total+=f;
  }
  if(total>5760)throw Error('M3_TIMELINE_TOO_LONG');
  const p=value.prop;
  if(!isObj(p)||!exact(p,['id','asset','sha256','x','y','scale'])||
     typeof p.id!=='string'||!/^[a-z][a-z0-9-]{2,32}$/.test(p.id)||
     p.id===c.id||p.asset!=='props/cup'||
     !validNumber(p.x)||p.x<500||p.x>1500||
     !validNumber(p.y)||p.y<450||p.y>850||
     !validNumber(p.scale)||p.scale<.3||p.scale>1.5||
     typeof p.sha256!=='string')throw Error('M3_PROP_INVALID');
  const art=pack.assets.find(a=>a.id===p.asset);
  if(!art||art.sha256!==p.sha256||!art.anchors.grip||
     !pack.assets.find(a=>a.id===c.model+'/hand-grip')?.anchors.grip)
    throw Error('M3_PROP_HASH_OR_ANCHOR');
  return value as M3Project;
}
export function makeM3Showcase(pack:ArtPack,id='guest-01',model:'mai'|'an'='an'):M3Project{
  const asset=pack.assets.find(a=>a.id==='props/cup');
  if(!asset)throw Error('M3_CUP_MISSING');
  return validateM3({
    schemaVersion:'character-motion/1',
    character:{id,model,rigId:'production-cutout-1',artPackId:pack.version,
      capabilities:canonicalActions(),xStart:720,floor:860,facing:1},
    clips:[{action:'walk-stop',frames:73},{action:'turn-head',frames:49},
      {action:'wave',frames:49},{action:'pick-place',frames:97}],
    prop:{id:'cup-m3',asset:'props/cup',sha256:asset.sha256,x:960,y:631,scale:.7},
  },pack);
}
export const m3TotalFrames=(p:M3Project)=>p.clips.reduce((sum,c)=>sum+c.frames,0);

/** Exactly two alternating planted-foot intervals; step size is independent of
 * retiming. Swing ankle rises above floor; a planted world-space sole never drifts.
 * The final 24 frames settle into the neutral pose before the next action. */
function walkStop(c:M3Character,startX:number,f:number,frames:number):{pose:ActorPose;planted:string[]}{
  const move=frames-25,half=move/2;
  const phase=f<half?0:f<move?1:2;
  const u=phase===2?1:(f-phase*half)/half;
  const travel=phase===2?120:phase*60+60*smooth(u);
  const x=startX+travel;
  const left=phase===0?startX-35+120*smooth(u):startX+85;
  const right=phase===0?startX+48:phase===1?startX+48+120*smooth(u):startX+168;
  const lift=phase===2?0:22*Math.sin(Math.PI*u)**2;
  const settling=phase===2?smooth((f-move)/24):0;
  const sway=phase===2?0:Math.sin(Math.PI*u)*4;
  const pose=base(c,x);
  pose.leftAnkle=[left-x,-29-(phase===0?lift:0)];
  pose.rightAnkle=[right-x,-29-(phase===1?lift:0)];
  pose.hipOffset=[0,12*(1-settling)];
  pose.rightWrist=[96+sway,-220];
  pose.leftWrist=[-99-sway,-211];
  // Start/stop have the same rig configuration as the bounded standing actions.
  if(phase===2&&settling===1){delete pose.hipOffset;delete pose.leftWrist;}
  return {pose,planted:phase===0?['right']:phase===1?['left']:['left','right']};
}
function cupSprite(p:M3Project,y:number):Sprite{
  return sprite(p.prop.id,p.prop.asset,p.prop.x,y,6,0,p.prop.scale);
}
function wristAtCup(pack:ArtPack,prop:Sprite,pose:ActorPose):Point{
  const hand=pack.assets.find(a=>a.id===pose.character+'/hand-grip');
  if(!hand?.anchors.grip)throw Error('M3_HAND_ANCHOR_MISSING');
  const grip=anchorPoint(pack,prop,'grip');
  const off:[number,number]=[hand.anchors.grip[0]-hand.pivot[0],hand.anchors.grip[1]-hand.pivot[1]];
  return [(grip[0]-pose.x)/pose.facing-off[0],grip[1]-pose.floor-off[1]];
}
function pickPlace(pack:ArtPack,p:M3Project,x:number,f:number,frames:number):{
  pose:ActorPose;prop:Sprite;grip:boolean
}{
  const c=p.character,pose=base(c,x);
  const duration=frames-1,t=f/duration;
  // Fixed normalized beats permit whole-clip retiming without any prior-frame state.
  const reach=smooth(Math.min(1,t/.25));
  const lift=smooth(Math.max(0,Math.min(1,(t-.25)/.22)));
  const lower=smooth(Math.max(0,Math.min(1,(t-.63)/.22)));
  const held=t>=.25&&t<.85;
  const prop=cupSprite(p,p.prop.y-66*(lift-lower));
  const target=wristAtCup(pack,prop,pose);
  const release=smooth(Math.max(0,Math.min(1,(t-.85)/.15)));
  const weight=reach*(1-release);
  pose.rightWrist=[mix(96,target[0],weight),mix(-220,target[1],weight)];
  pose.rightHand=held?'grip':'open';
  pose.rightHandAngle=180*(1-weight);
  pose.headAngle=6*Math.sin(Math.PI*t)**2;
  return {pose,prop,grip:held};
}
/** Random-access sample. New instance IDs are mapped to the reused verified rig;
 * unsupported actions, mismatched art, impossible IK and stale hashes reject. */
export function sampleM3(raw:unknown,frame:number,pack:ArtPack):M3Sample{
  const p=validateM3(raw,pack);
  if(!Number.isSafeInteger(frame)||frame<0||frame>=m3TotalFrames(p))
    throw RangeError('M3_FRAME_OUT_OF_RANGE');
  let local=frame,startX=p.character.xStart;
  let clip=p.clips[0]!;
  for(const item of p.clips){
    if(local<item.frames){clip=item;break;}
    local-=item.frames;
    if(item.action==='walk-stop')startX+=120;
  }
  let pose:ActorPose;
  let prop=cupSprite(p,p.prop.y);
  let planted=['left','right'];
  let grip=false;
  if(clip.action==='walk-stop'){
    const state=walkStop(p.character,startX,local,clip.frames);
    pose=state.pose;planted=state.planted;
  }else if(clip.action==='pick-place'){
    const state=pickPlace(pack,p,startX,local,clip.frames);
    pose=state.pose;prop=state.prop;grip=state.grip;
  }else{
    const v=sampleAction({action:clip.action,duration:clip.frames-1,intensity:.85,onTwos:false},local);
    pose={...v,id:p.character.id,character:p.character.model,x:startX,floor:p.character.floor,
      facing:p.character.facing};
  }
  const rig=actorSprites(pack,pose);
  const cupAnchor=anchorPoint(pack,prop,'grip');
  const handAnchor=rig.markers.find(m=>m.id===pose.id+'.right-grip');
  if(!handAnchor)throw Error('M3_GRIP_MARKER_MISSING');
  const error=grip?Math.hypot(handAnchor.point[0]-cupAnchor[0],handAnchor.point[1]-cupAnchor[1]):null;
  if(grip&&error!>0.00001)throw Error('M3_GRIP_CONTACT_LOST');
  const camera={x:960,y:540,zoom:1};
  return {
    action:clip.action,localFrame:local,pose,
    frame:{camera,sprites:[...background(camera),sprite('bench','props/workbench',1060,860,-1,0,1.2),prop,...rig.sprites],
      markers:[...rig.markers,{id:p.prop.id+'.grip',point:cupAnchor,z:6,kind:'contact'}]},
    contact:{planted,grip,gripError:error},
  };
}
