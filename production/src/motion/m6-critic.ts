/**
 * M6 deterministic geometry/kinematics critic for supported M3 clip projects.
 * Descriptive diagnostics do not certify creative quality or human approval.
 */
import {sampleM3,m3TotalFrames,validateM3,type M3Project} from './character-library.js';
import {sampleM6,type M6Quality,m6DefaultQuality} from './m6-quality.js';
import type {ArtPack,Point} from '../scene/types.js';

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
  for(let f=0;f<frames;f++){
    const sample=mode==='enhanced'?sampleM6(project,f,pack,controls):sampleM3(project,f,pack);
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
