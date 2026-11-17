/**
 * M6 bounded quality pass for the audited M3 cutout rig.
 * Pure random-access evaluation: no live physics, timers, hidden scene ID,
 * mutable pose cache, new artwork or implicit contact ownership.
 *
 * Only the supported M3 clip family is enhanced. A held hand/cup and planted
 * soles retain their authored world targets. This does not imply generic
 * retargeting or an automatically approved artistic result.
 */
import {actorSprites} from '../scene/rig.js';
import {gripSide} from './grip-planner.js';
import {anchorPoint} from '../scene/geometry.js';
import {validateM3,sampleM3,type M3Project,type M3Sample} from './character-library.js';
import type {ArtPack,ActorPose,Point} from '../scene/types.js';

export type M6Quality = Readonly<{
  schemaVersion:'quality-motion/1';
  leanDegrees:number;bouncePixels:number;armFollowPixels:number;
  headFollowDegrees:number;settleDegrees:number;
}>;
export const m6DefaultQuality:M6Quality=Object.freeze({
  schemaVersion:'quality-motion/1',leanDegrees:2.2,bouncePixels:3,
  armFollowPixels:13,headFollowDegrees:4,settleDegrees:1.8,
});
const parameters:Readonly<Record<Exclude<keyof M6Quality,'schemaVersion'>,number>>={
  leanDegrees:5,bouncePixels:6,armFollowPixels:24,
  headFollowDegrees:8,settleDegrees:4,
};
export function parseM6Quality(raw:unknown):M6Quality{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('M6_QUALITY_SCHEMA');
  const o=raw as Record<string,unknown>;
  if(Object.keys(o).sort().join('|')!==['schemaVersion',...Object.keys(parameters)].sort().join('|')||
     o.schemaVersion!=='quality-motion/1')throw Error('M6_QUALITY_SCHEMA');
  for(const [key,limit] of Object.entries(parameters)){
    const value=o[key];
    if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>limit)
      throw Error('M6_QUALITY_PARAMETER: '+key);
  }
  return Object.freeze({...o}) as M6Quality;
}
const wave=(t:number)=>Math.sin(Math.PI*Math.max(0,Math.min(1,t)))**2;
const shifted=(v:Point|undefined,dx:number,dy:number):Point|undefined=>
  v?[v[0]+dx,v[1]+dy]:undefined;

function clipAt(project:M3Project,frame:number){
  let local=frame;
  for(const clip of project.clips){
    if(local<clip.frames)return {clip,local};
    local-=clip.frames;
  }
  throw RangeError('M6_FRAME_OUT_OF_RANGE');
}
function enhancePose(base:ActorPose,clip:M3Project['clips'][number],f:number,q:M6Quality):ActorPose{
  const pose:ActorPose={...base};
  const t=f/(clip.frames-1);
  if(clip.action==='walk-stop'){
    const travel=clip.frames-25;
    if(f<travel){
      const half=travel/2;
      const u=(f%half)/half;
      const weight=wave(u),sign=f<half?1:-1;
      // During swing: small vertical compression and counter-rotated gaze.
      // Absolute ankles/soles remain authored world coordinates.
      pose.hipOffset=[base.hipOffset?.[0]??0,(base.hipOffset?.[1]??0)+q.bouncePixels*weight];
      pose.torsoAngle=sign*q.leanDegrees*weight;
      pose.headAngle=-sign*q.headFollowDegrees*.45*weight;
      pose.rightWrist=shifted(base.rightWrist,sign*q.armFollowPixels*weight,-2*weight);
      pose.leftWrist=shifted(base.leftWrist,-sign*q.armFollowPixels*weight,2*weight);
    }else{
      const settling=wave((f-travel)/24);
      pose.torsoAngle=-q.settleDegrees*settling;
      pose.headAngle=q.settleDegrees*settling*.8;
    }
  }else if(clip.action==='turn-head'){
    const emphasis=wave(t);
    pose.headAngle=(base.headAngle??0)+q.headFollowDegrees*emphasis;
    pose.torsoAngle=-q.leanDegrees*.45*emphasis;
  }else if(clip.action==='wave'){
    const emphasis=wave(t);
    pose.torsoAngle=q.leanDegrees*.6*emphasis;
    pose.headAngle=-(q.headFollowDegrees*.65)*emphasis;
    // The original waving wrist stays fixed: this layer adds deliberate
    // gaze/body acting rather than a second procedural swing in the hand.
  }else if(clip.action==='pick-place'){
    const attention=wave(t);
    pose.headAngle=(base.headAngle??0)+q.headFollowDegrees*.8*attention;
    pose.torsoAngle=q.leanDegrees*.4*attention;
    // Do not touch wrists, hand angles or the prop. M3 owns grip/contact.
  }
  return pose;
}

/**
 * The M3 project validator proves the original target is reachable, not that an
 * additive M6 shoulder lean will remain reachable. Fit the *optional quality*
 * movement to the existing validated rig instead of stretching bones, moving a
 * held prop or allowing a new render-time IK exception.
 *
 * The original pose is a verified feasible point (sampleM3 assembled it). If
 * the requested quality envelope violates either two-link arm, use a bounded
 * deterministic bisection in [0,1] for the strongest feasible enhancement.
 * Both the chosen pose and rig are produced at the same absolute frame.
 */
function rigSafeQuality(
  original:ActorPose,clip:M3Project['clips'][number],frame:number,
  q:M6Quality,pack:ArtPack,
):{pose:ActorPose;rig:ReturnType<typeof actorSprites>}{
  const ik=(error:unknown)=>error instanceof Error&&error.message.startsWith('IK_UNREACHABLE:');
  const at=(gain:number)=>{
    const quality:M6Quality={
      schemaVersion:'quality-motion/1',
      leanDegrees:q.leanDegrees*gain,
      bouncePixels:q.bouncePixels*gain,
      armFollowPixels:q.armFollowPixels*gain,
      // Head turn does not change arm reach: never disable it when a
      // near-limit shoulder causes the optional torso quality to back off.
      // This prevents sudden head-angle snaps in short M6 edge clips.
      headFollowDegrees:q.headFollowDegrees,
      settleDegrees:q.settleDegrees*gain,
    };
    const pose=enhancePose(original,clip,frame,quality);
    return {pose,rig:actorSprites(pack,pose)};
  };
  try{return at(1);}
  catch(error){if(!ik(error))throw error;}
  let low=0,high=1;
  // Baseline was already successfully assembled by sampleM3.
  let safe=at(0);
  for(let iteration=0;iteration<14;iteration++){
    const factor=(low+high)/2;
    try{
      safe=at(factor);
      low=factor;
    }catch(error){
      if(!ik(error))throw error;
      high=factor;
    }
  }
  return safe;
}

/** Same camera, prop, timeline and art as M3. Rebuild only this actor's sprites. */
export function sampleM6(
  raw:unknown,frame:number,pack:ArtPack,quality:unknown=m6DefaultQuality,
):M3Sample{
  const project=validateM3(raw,pack);
  const q=parseM6Quality(quality);
  const baseline=sampleM3(project,frame,pack);
  const {clip,local}=clipAt(project,frame);
  const {pose,rig:actor}=rigSafeQuality(baseline.pose,clip,local,q,pack);
  const prefix=project.character.id+'.';
  const frameOut={
    camera:{...baseline.frame.camera},
    // M3 now owns the actual three-layer grip. M6 never silently alters
    // object depth: this preserves identical objects, art and staging in A/B.
    sprites:[...baseline.frame.sprites.filter(s=>!s.id.startsWith(prefix)),...actor.sprites],
    markers:[...baseline.frame.markers.filter(m=>!m.id.startsWith(prefix)),...actor.markers],
  };
  const prop=project.prop&&frameOut.sprites.find(s=>s.id===project.prop!.id);
  const side=gripSide(project.prop?.hand);
  const grip=frameOut.markers.find(m=>m.id===prefix+side+'-grip');
  const contactError=baseline.contact.grip
    ? (!prop||!grip ? Infinity : Math.hypot(
        ...((()=>{const target=anchorPoint(pack,prop,'grip');return [
          grip.point[0]-target[0],grip.point[1]-target[1]] as Point;})())
      ))
    : null;
  if(contactError!==null&&(!Number.isFinite(contactError)||contactError>.001))
    throw Error('M6_GRIP_CONTACT_REGRESSION: '+frame);
  // Fail closed if an improvement moves a deliberately planted sole.
  for(const side of baseline.contact.planted){
    const id=prefix+side+'-sole';
    const before=baseline.frame.markers.find(m=>m.id===id)?.point;
    const after=frameOut.markers.find(m=>m.id===id)?.point;
    if(!before||!after||Math.hypot(before[0]-after[0],before[1]-after[1])>.001)
      throw Error('M6_PLANTED_SOLE_REGRESSION: '+frame+':'+side);
  }
  return {...baseline,pose,frame:frameOut,contact:{...baseline.contact,gripError:contactError}};
}
