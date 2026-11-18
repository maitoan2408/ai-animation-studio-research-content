/** Opt-in G3 performance pass: deterministic acting over immutable authored grip/Rapier playback.
 * No scene/model/hand names. Never retargets the held object, physics, camera or sole.
 * Trust boundary must verify canonical source and art digests before accepting a plan.
 */
import {actorSprites} from '../scene/rig.js';
import {anchorPoint} from '../scene/geometry.js';
import {auditFrame} from '../qa/general-scene-quality.js';
import {generalFilmFrameContract} from './general-timeline.js';
import {sampleGeneralPlayback,type GeneralPlayback,type GeneralRelease} from './general-playback.js';
import type {ActorPose,ArtPack,Point,SceneFrame,Sprite} from '../scene/types.js';

export type G3BeatKind='prepare'|'act'|'recover';
export type G3PerformanceBeat={
 kind:G3BeatKind;start:number;peak:number;end:number;
 torsoDeg:number;hipX:number;hipY:number;headDeg:number;freeHandDx:number;freeHandDy:number;
};
export type G3PerformanceTrack={actorId:string;beats:G3PerformanceBeat[]};
export type G3PerformancePlan={
 schemaVersion:'g3-performance/1';playbackSha256:string;artSha256:string;
 tracks:G3PerformanceTrack[];
};
export type G3PerformanceSample=ReturnType<typeof sampleGeneralPlayback>&{
 gains:ReadonlyArray<{actorId:string;requested:number;applied:number;kind:G3BeatKind}>;
};

const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const exact=(x:Record<string,unknown>,keys:string[])=>Object.keys(x).sort().join('|')===keys.sort().join('|');
const sha=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v);
const number=(v:unknown,limit:number)=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=limit;
const interval=(x:unknown):x is number=>Number.isSafeInteger(x)&&Number(x)>=0;
/** Call from trusted Node renderer/server with independently computed SHA256(JSON.stringify(playback/pack)).
 * Browser rechecks schema and timeline against values pinned by the trusted server. */
export function validateG3Performance(raw:unknown,playback:GeneralPlayback,pack:ArtPack,
 expected:{playbackSha256:string;artSha256:string}):G3PerformancePlan{
 if(!obj(raw)||!exact(raw,['schemaVersion','playbackSha256','artSha256','tracks'])||
    raw.schemaVersion!=='g3-performance/1'||!sha(raw.playbackSha256)||!sha(raw.artSha256)||
    raw.playbackSha256!==expected.playbackSha256||raw.artSha256!==expected.artSha256||
    !Array.isArray(raw.tracks)||raw.tracks.length<1||raw.tracks.length>playback.film.tracks.length)
   throw Error('G3_PERFORMANCE_SOURCE_OR_SCHEMA');
 const used=new Set<string>();
 for(const track of raw.tracks){
  if(!obj(track)||!exact(track,['actorId','beats'])||typeof track.actorId!=='string'||
     used.has(track.actorId)||!Array.isArray(track.beats)||track.beats.length!==3)
    throw Error('G3_PERFORMANCE_TRACK');
  used.add(track.actorId);
  if(!playback.film.tracks.some(x=>x.contact.actor.id===track.actorId))
    throw Error('G3_PERFORMANCE_ACTOR_UNKNOWN');
  const release=playback.releases.find(x=>x.actorId===track.actorId);
  if(!release)throw Error('G3_PERFORMANCE_RELEASE_REQUIRED');
  let previousEnd=-1;
  const phases:G3BeatKind[]=['prepare','act','recover'];
  for(const [n,beat] of track.beats.entries()){
    if(!obj(beat)||!exact(beat,['kind','start','peak','end','torsoDeg','hipX','hipY',
        'headDeg','freeHandDx','freeHandDy'])||beat.kind!==phases[n]||
       !interval(beat.start)||!interval(beat.peak)||!interval(beat.end)||
       !(Number(beat.start)<Number(beat.peak)&&Number(beat.peak)<Number(beat.end))||
       Number(beat.start)<previousEnd||Number(beat.end)>=playback.film.frames||
       !number(beat.torsoDeg,5)||!number(beat.hipX,8)||!number(beat.hipY,8)||
       !number(beat.headDeg,8)||!number(beat.freeHandDx,16)||
       !number(beat.freeHandDy,10))
      throw Error('G3_PERFORMANCE_BEAT_INVALID');
    if((n<2&&Number(beat.end)>=release.frame)||
       (n===2&&Number(beat.start)<release.frame))
      throw Error('G3_PERFORMANCE_RELEASE_BOUNDARY');
    previousEnd=Number(beat.end);
  }
 }
 return raw as G3PerformancePlan;
}
const smooth=(t:number)=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};
function weight(b:G3PerformanceBeat,frame:number){
 if(frame<=b.start||frame>=b.end)return 0;
 return frame<=b.peak?smooth((frame-b.start)/(b.peak-b.start)):
   smooth((b.end-frame)/(b.end-b.peak));
}
const dist=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const point=(frame:SceneFrame,id:string):Point=>{
 const p=frame.markers.find(m=>m.id===id);
 if(!p)throw Error('G3_PERFORMANCE_MARKER_MISSING '+id);
 return p.point;
};
const part=(frame:SceneFrame,id:string):Sprite=>{
 const s=frame.sprites.find(s=>s.id===id);
 if(!s)throw Error('G3_PERFORMANCE_PART_MISSING '+id);
 return s;
};
/** Pure arbitrary frame seeking; only rebuild actor art from the baseline world's exact wrist goals.
 * A deterministic IK search backs off optional acting; it cannot change held grip/soles/physics.
 */
export function sampleG3Performance(playback:GeneralPlayback,plan:G3PerformancePlan,frame:number,
 pack:ArtPack):G3PerformanceSample{
 const base=sampleGeneralPlayback(playback,frame,pack);
 let scene:SceneFrame=base.frame;
 const gains:G3PerformanceSample['gains'][number][]=[];
 for(const track of plan.tracks){
  const beat=track.beats.find(b=>weight(b,frame)>0);
  if(!beat)continue;
  const u=weight(beat,frame);
  const source=playback.film.tracks.find(t=>t.contact.actor.id===track.actorId);
  if(!source)throw Error('G3_PERFORMANCE_ACTOR_UNKNOWN');
  const a=source.contact.actor,side=source.contact.hand,prefix=a.id+'.';
  const held=base.contacts.some(c=>c.propId===source.contact.object.id);
  const release=playback.releases.find(r=>r.actorId===a.id);
  if(!release)throw Error('G3_PERFORMANCE_RELEASE_REQUIRED');
  const local=(p:Point):Point=>[(p[0]-a.x)/(a.scale*a.facing),(p[1]-a.floor)/a.scale];
  const left=point(scene,prefix+'left-wrist'),right=point(scene,prefix+'right-wrist');
  const head=part(scene,prefix+'head').rotation/a.facing;
  const leftHandAngle=part(scene,prefix+'left-hand').rotation/a.facing;
  const rightHandAngle=part(scene,prefix+'right-hand').rotation/a.facing;
  const firstSole=point(scene,prefix+'left-sole'),secondSole=point(scene,prefix+'right-sole');
  const originalProp=part(scene,source.contact.object.id);
  const at=(gain:number)=>{
   const v=u*gain;
   const freeLeft=side==='right';
   const leftGoal:Point=[left[0]+(freeLeft?beat.freeHandDx*a.facing*v:0),
     left[1]+(freeLeft?beat.freeHandDy*v:0)];
   const rightGoal:Point=[right[0]+(!freeLeft?beat.freeHandDx*a.facing*v:0),
     right[1]+(!freeLeft?beat.freeHandDy*v:0)];
   const pose:ActorPose={id:a.id,character:a.model,x:a.x,floor:a.floor,facing:a.facing,
     scale:a.scale,view:'quarter',
     headAngle:head+beat.headDeg*v,torsoAngle:beat.torsoDeg*v,
     hipOffset:[beat.hipX*v,beat.hipY*v],
     leftWrist:local(leftGoal),rightWrist:local(rightGoal),
     leftHand:held&&side==='left'?'grip':'open',
     rightHand:held&&side==='right'?'grip':'open',
     leftHandAngle,rightHandAngle,
     ...(held?{layeredGripSide:side}:{}),
   };
   const rig=actorSprites(pack,pose);
   const seen=rig.sprites.map(s=>s.id);
   const result:SceneFrame={camera:{...scene.camera},
     sprites:scene.sprites.flatMap(s=>{
       if(s.id.startsWith(prefix)){
         if(s.id===seen[0])return rig.sprites;
         return [];
       }
       return [s];
     }),markers:scene.markers.flatMap(m=>{
       if(m.id.startsWith(prefix)){
         if(m.id===prefix+'left-sole')return rig.markers;
         return [];
       }
       return [m];
     })};
   // An actual artist-produced asset anchor and scene-space statement, not just a marker.
   const l=point(result,prefix+'left-sole'),r=point(result,prefix+'right-sole');
   if(dist(l,firstSole)>.001||dist(r,secondSole)>.001)
     throw Error('G3_PERFORMANCE_SOLE_DRIFT');
   const actualProp=part(result,source.contact.object.id);
   if(JSON.stringify(actualProp)!==JSON.stringify(originalProp))
     throw Error('G3_PERFORMANCE_PROP_CHANGED');
   const contract=generalFilmFrameContract(playback.film,pack,frame,
     playback.releases.filter(x=>frame>=x.frame).map(x=>x.actorId));
   const findings=auditFrame(result,pack,contract);
   if(findings.length)throw Error('G3_PERFORMANCE_SCENE_QA '+findings.map(f=>f.code).join(','));
   // Validate real sprite's grip anchor at the exact authored target while held.
   if(held){
     const palm=part(result,prefix+side+'-hand');
     const prop=part(result,source.contact.object.id);
     if(dist(anchorPoint(pack,palm,'grip'),anchorPoint(pack,prop,source.contact.object.anchor))>.001)
       throw Error('G3_PERFORMANCE_GRIP_DRIFT');
   }
   return result;
  };
  let result:SceneFrame,applied=1;
  try{result=at(1);}
  catch(e){
   if(!(e instanceof Error)||!e.message.startsWith('IK_UNREACHABLE'))throw e;
   let low=0,high=1;
   result=scene;
   for(let i=0;i<16;i++){
     const candidate=(low+high)/2;
     try{const next=at(candidate);low=candidate;result=next;}
     catch(x){if(!(x instanceof Error)||!x.message.startsWith('IK_UNREACHABLE'))throw x;high=candidate;}
   }
   applied=low;
  }
  scene=result;
  gains.push({actorId:a.id,requested:u,applied:u*applied,kind:beat.kind});
 }
 return {...base,frame:scene,gains};
}
