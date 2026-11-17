/**
 * M6 deterministic geometry/kinematics critic for supported M3 clip projects.
 * Descriptive diagnostics do not certify creative quality or human approval.
 */
import {sampleM3,m3TotalFrames,validateM3,type M3Project} from './character-library.js';
import {sampleM6,type M6Quality,m6DefaultQuality} from './m6-quality.js';
import type {ArtPack,Point} from '../scene/types.js';
import {anchorPoint} from '../scene/geometry.js';
import {auditFrame} from '../qa/general-scene-quality.js';

type Issue=Readonly<{
  code:string;severity:'error'|'warning';frame:number;measured:number;
  expected:string;evidence:string;
}>;
type Sample=Readonly<{
  frame:number;clip:string;rootX:number;headDegrees:number;torsoDegrees:number;
  plantedSoles:string[];heldGripPixels:number|null;camera:string;
}>;
const diff=(a:number[],rate:number):number[]=>
  a.slice(1).map((v,i)=>(v-a[i]!)*rate);
const maxAbs=(v:number[]):number=>Math.max(0,...v.map(Math.abs));
const dist=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const clipFor=(p:M3Project,f:number)=>{
  let i=f;
  for(const [index,clip]of p.clips.entries()){
    if(i<clip.frames)return {index,clip,local:i};
    i-=clip.frames;
  }
  throw Error('M6_CRITIC_CLIP_RANGE');
};
export function evaluateM6(
  raw:unknown,pack:ArtPack,mode:'baseline'|'enhanced',
  controls:M6Quality=m6DefaultQuality,
){
  if(mode!=='baseline'&&mode!=='enhanced')throw Error('M6_CRITIC_MODE');
  const project=validateM3(raw,pack);
  const frames=m3TotalFrames(project);
  const issues:Issue[]=[];
  const samples:Sample[]=[];
  const stance=new Map<string,Point>();
  let plantedSamples=0,heldGripSamples=0,maxPlantedDrift=0,maxGripError=0;
  let cameraChanges=0;
  let previousFrame:import('../scene/types.js').SceneFrame|undefined;
  // Visual staging is independent from a mathematically valid IK reach.
  // This actor's supported pick-place is right-hand-only; putting the cup
  // across the body by the open LEFT hand created the visibly broken M6
  // stress film, even though all artificial grip markers read zero pixels.
  const firstPick=project.clips.findIndex(c=>c.action==='pick-place');
  if(firstPick>=0&&project.prop){
    const prior=project.clips.slice(0,firstPick);
    const actorX=project.character.xStart+prior.filter(c=>c.action==='walk-stop').length*120;
    const offset=project.prop.x-actorX;
    if(offset<35)issues.push({code:'M6_CROSS_BODY_PROP_STAGING',severity:'error',
      frame:prior.reduce((sum,c)=>sum+c.frames,0),measured:offset,
      expected:'right-hand cup staged at least 35 stage px right of actor root',
      evidence:'project/prop/x / right-hand only pick-place'});
  }
  for(let f=0;f<frames;f++){
    const sample=mode==='enhanced'?sampleM6(project,f,pack,controls):sampleM3(project,f,pack);
    // Reusable engine-level QA runs on the actual evaluated frame, not on
    // synthetic marker-only evidence. This also catches unrecognized art,
    // duplicate instances and nonfinite transforms for every M6 film.
    const contacts=sample.contact.grip&&project.prop?[{
      id:project.character.id+'-held-prop',
      holderId:project.character.id+'.right-hand',propId:project.prop.id,
      holderAnchor:'grip',propAnchor:'grip',rearId:project.character.id+'.right-hand',
      frontId:project.character.id+'.right-grip-front',tolerancePx:.001,
    }]:[];
    for(const problem of auditFrame(sample.frame,pack,{frame:f,contacts},previousFrame))
      issues.push({code:problem.code,severity:'error',frame:f,measured:NaN,
        expected:problem.detail,evidence:problem.subject});
    previousFrame=sample.frame;
    const {index,clip,local}=clipFor(project,f);
    const camera=JSON.stringify(sample.frame.camera);
    if(camera!=='{"x":960,"y":540,"zoom":1}')cameraChanges++;
    for(const side of sample.contact.planted){
      const id=project.character.id+'.'+side+'-sole';
      const marker=sample.frame.markers.find(x=>x.id===id);
      if(!marker)throw Error('M6_CRITIC_SOLE_MISSING: '+f);
      const half=clip.action==='walk-stop'?(clip.frames-25)/2:0;
      const phase=clip.action==='walk-stop'?
        local<half?'first':local<half*2?'second':'settled':'standing';
      const key=index+':'+phase+':'+side;
      const initial=stance.get(key);
      if(!initial)stance.set(key,[...marker.point]);
      else {
        const value=dist(initial,marker.point);
        maxPlantedDrift=Math.max(maxPlantedDrift,value);
        if(value>.001)issues.push({code:'M6_SOLE_SLIP',severity:'error',frame:f,
          measured:value,expected:'world planted-sole drift <= 0.001 stage px',
          evidence:'markers/'+id});
      }
      plantedSamples++;
    }
    if(sample.contact.grip){
      const value=sample.contact.gripError;
      if(value===null||!Number.isFinite(value))throw Error('M6_CRITIC_GRIP_MISSING');
      maxGripError=Math.max(maxGripError,value);
      heldGripSamples++;
      if(value>.001)issues.push({code:'M6_GRIP_DRIFT',severity:'error',frame:f,
        measured:value,expected:'grip/contact difference <= 0.001 stage px',
        evidence:'contacts/'+project.prop?.id});
    }
    if(mode==='enhanced'&&sample.contact.grip&&project.prop){
      const cup=sample.frame.sprites.find(s=>s.id===project.prop!.id);
      const hand=sample.frame.sprites.find(s=>s.id===project.character.id+'.right-hand');
      const forearm=sample.frame.sprites.find(s=>s.id===project.character.id+'.right-forearm');
      const front=sample.frame.sprites.find(s=>s.id===project.character.id+'.right-grip-front');
      if(!cup||!hand||!forearm||!front||
         !(forearm.z<hand.z&&hand.z<cup.z&&cup.z<front.z))
        issues.push({code:'M6_GRIP_VISIBLE_LAYER_ORDER',severity:'error',frame:f,
          measured:cup?.z??NaN,expected:'forearm < rear palm < cup handle < separate finger art',
          evidence:'sprites/'+project.prop.id+' / '+project.character.id+'.right-hand'});
      else{
        const handAnchor=anchorPoint(pack,hand,'grip');
        const fingerAnchor=anchorPoint(pack,front,'grip');
        const cupAnchor=anchorPoint(pack,cup,'grip');
        const difference=Math.max(
          Math.hypot(handAnchor[0]-cupAnchor[0],handAnchor[1]-cupAnchor[1]),
          Math.hypot(fingerAnchor[0]-cupAnchor[0],fingerAnchor[1]-cupAnchor[1]));
        if(difference>.001)
          issues.push({code:'M6_VISIBLE_GRIP_OFFSET',severity:'error',frame:f,
            measured:difference,
            expected:'real palm + foreground finger SVG anchors coincide with the handle',
            evidence:'asset anchor points, not synthetic rig marker'});
      }
    }
    const pose=sample.pose;
    if(![pose.x,pose.headAngle??0,pose.torsoAngle??0].every(Number.isFinite))
      issues.push({code:'M6_NONFINITE_TRANSFORM',severity:'error',frame:f,
        measured:NaN,expected:'finite authored transforms',evidence:'pose'});
    samples.push({frame:f,clip:sample.action,rootX:pose.x,
      headDegrees:pose.headAngle??0,torsoDegrees:pose.torsoAngle??0,
      plantedSoles:[...sample.contact.planted],heldGripPixels:sample.contact.gripError,camera});
  }
  const x=samples.map(s=>s.rootX),h=samples.map(s=>s.headDegrees);
  return {
    schemaVersion:'m6-critic/1',mode,projectFrames:frames,
    artPack:pack.version,
    metrics:{
      plantedSamples,heldGripSamples,maxPlantedDriftPixels:maxPlantedDrift,
      maxGripErrorPixels:maxGripError,cameraChanges,
      maxRootSpeedPixelsPerSecond:maxAbs(diff(x,24)),
      maxRootAccelerationPixelsPerSecondSquared:maxAbs(diff(diff(x,24),24)),
      maxRootJerkPixelsPerSecondCubed:maxAbs(diff(diff(diff(x,24),24),24)),
      maxHeadAngularSpeedDegPerSecond:maxAbs(diff(h,24)),
      maxHeadAngularAccelerationDegPerSecondSquared:maxAbs(diff(diff(h,24),24)),
    },
    issues,samples,
    scope:[
      'Measures actual M3/M6 authored poses and stage-space contacts, not anatomy or aesthetic quality',
      'No automatic artistic PASS and no inference of emotional realism',
      'Root M2 Director, production voice, lip-sync and cloth/hair not evaluated here',
      'Root speed/jerk are descriptive; no unapproved aesthetic thresholds',
    ],
  };
}
