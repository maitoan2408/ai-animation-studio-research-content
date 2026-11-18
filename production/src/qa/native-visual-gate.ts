/** Independent data-driven visual preflight for ANY validated native M3 project.
 * No scene-ID constants, pixel benchmark, guessed aesthetic score, or owner PASS.
 * Fails on malformed artwork, missing parts, contact/occlusion or foot drift;
 * surfaces motion continuity as warnings for visual review.
 */
import {sampleM3,validateM3,m3TotalFrames,type M3Project} from '../motion/character-library.js';
import {sampleM6,type M6Quality,m6DefaultQuality} from '../motion/m6-quality.js';
import {gripSide} from '../motion/grip-planner.js';
import {anchorPoint} from '../scene/geometry.js';
import type {ArtPack,Point,Sprite} from '../scene/types.js';

export type VisualFinding=Readonly<{
 code:string;severity:'error'|'warning';frame:number;target:string;detail:string;
}>;
const dist=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const angleDelta=(a:number,b:number)=>Math.abs((b-a+540)%360-180);
function clipFrame(p:M3Project,frame:number){
 let rem=frame;
 for(const [index,c] of p.clips.entries()){
   if(rem<c.frames)return {index,clip:c,local:rem};
   rem-=c.frames;
 }
 throw Error('VISUAL_CLIP_RANGE');
}
/** Strict technical gate + advisory continuity findings, not aesthetic approval. */
export function evaluateNativeVisuals(
 raw:unknown,pack:ArtPack,mode:'baseline'|'enhanced'='baseline',
 quality:M6Quality=m6DefaultQuality,
){
 if(mode!=='baseline'&&mode!=='enhanced')throw Error('VISUAL_MODE_UNSUPPORTED');
 const p=validateM3(raw,pack),total=m3TotalFrames(p);
 const known=new Set(pack.assets.map(a=>a.id));
 const findings:VisualFinding[]=[],stance=new Map<string,Point>();
 let held=0,planted=0,assetChecks=0,layerChecks=0,largestDrift=0;
 let maxSpriteJump=0,maxAngleJump=0;
 let previous=new Map<string,Sprite>();
 const push=(code:string,severity:'error'|'warning',frame:number,target:string,detail:string)=>
   findings.push({code,severity,frame,target,detail});
 for(let frame=0;frame<total;frame++){
  const s=mode==='enhanced'?sampleM6(p,frame,pack,quality):sampleM3(p,frame,pack);
  const seen=new Set<string>();
  const current=new Map<string,Sprite>();
  for(const a of s.frame.sprites){
   if(seen.has(a.id))push('VISUAL_DUPLICATE_SPRITE','error',frame,a.id,'Duplicate render instance');
   seen.add(a.id);current.set(a.id,a);assetChecks++;
   if(!known.has(a.asset)||![a.x,a.y,a.z,a.rotation,a.scaleX,a.scaleY,a.opacity].every(Number.isFinite)||
     a.opacity<0||a.opacity>1||a.scaleX===0||a.scaleY===0)
     push('VISUAL_MISSING_OR_NONFINITE_ART','error',frame,a.id,a.asset);
   const before=previous.get(a.id);
   if(before&&before.asset===a.asset){
     const movement=Math.hypot(before.x-a.x,before.y-a.y);
     const angular=angleDelta(before.rotation,a.rotation);
     maxSpriteJump=Math.max(maxSpriteJump,movement);
     maxAngleJump=Math.max(maxAngleJump,angular);
     // Advisory only: a contact-preserving motion can legitimately swing fast;
     // the reviewer must inspect these exact frames, not tweak a score.
     if(movement>42||angular>60)
       push('VISUAL_MOTION_SPIKE','warning',frame,a.id,
         'translation='+movement.toFixed(2)+'px, rotation='+angular.toFixed(2)+'deg');
   }
  }
  const clip=clipFrame(p,frame);
  for(const side of s.contact.planted){
    const sole=s.frame.markers.find(x=>x.id===p.character.id+'.'+side+'-sole');
    if(!sole){push('VISUAL_MISSING_PLANTED_SOLE','error',frame,side,'Missing sole marker');continue;}
    // Verify the real sole artwork anchor, not merely the authored marker.
    const boot=current.get(p.character.id+'.'+side+'-boot');
    try{
      if(!boot)throw Error('boot sprite absent');
      const actual=anchorPoint(pack,boot,'sole');
      const discrepancy=dist(actual,sole.point);
      if(!Number.isFinite(discrepancy)||discrepancy>.001)
        push('VISUAL_ACTUAL_SOLE_DRIFT','error',frame,boot.id,'real sole vs marker '+discrepancy+'px');
    }catch(e){push('VISUAL_SOLE_ART_MISSING','error',frame,side,String(e));}
    planted++;
    const step=clip.clip.action==='walk-stop'?(clip.clip.frames-25)/2:0;
    const phase=clip.clip.action==='walk-stop'?
       clip.local<step?'first':clip.local<step*2?'second':'settled':'standing';
    const key=clip.index+':'+phase+':'+side;
    const first=stance.get(key);
    if(!first)stance.set(key,[...sole.point]);
    else{
      const drift=dist(sole.point,first);
      largestDrift=Math.max(largestDrift,drift);
      if(drift>.001)push('VISUAL_FOOT_SLIDE','error',frame,side,
        'planted drift '+drift.toFixed(5)+' stage px');
    }
  }
  if(s.contact.grip&&p.prop){
    held++;
    const side=gripSide(p.prop.hand),base=p.character.id+'.';
    const hand=current.get(base+side+'-hand'),
      fingers=current.get(base+side+'-grip-front'),
      arm=current.get(base+side+'-forearm'),
      prop=current.get(p.prop.id);
    if(!hand||!fingers||!arm||!prop){
      push('VISUAL_GRIP_PART_MISSING','error',frame,p.prop.id,'Missing actual grip art');
    }else{
      layerChecks++;
      if(!(arm.z<hand.z&&hand.z<prop.z&&prop.z<fingers.z))
       push('VISUAL_OCCLUSION_ORDER','error',frame,p.prop.id,
         'Expected forearm < rear palm < prop handle < curled fingers');
      try{
       const target=anchorPoint(pack,prop,'grip');
       for(const item of [hand,fingers]){
         const error=dist(anchorPoint(pack,item,'grip'),target);
         if(error>.001)push('VISUAL_REAL_ASSET_GRIP_DRIFT','error',frame,item.id,
           'Actual SVG grip displaced '+error.toFixed(5)+'px');
       }
      }catch(e){
       push('VISUAL_ASSET_ANCHOR_MISSING','error',frame,p.prop.id,String(e));
      }
    }
  }
  if(!s.contact.grip){
    for(const side of ['left','right']){
      if(current.has(p.character.id+'.'+side+'-grip-front'))
        push('VISUAL_FLOATING_FINGERS','error',frame,side,'Gripped hand without prop');
    }
  }
  previous=current;
 }
 const errors=findings.filter(x=>x.severity==='error');
 return {
  schemaVersion:'native-visual-gate/1',mode,status:errors.length?'FAIL':'PASS_TECHNICAL_ONLY',
  frames:total,character:p.character.model,actions:p.clips.map(c=>c.action),
  propAsset:p.prop?.asset??null,gripSide:p.prop?gripSide(p.prop.hand):null,
  metrics:{planted,held,assetChecks,layerChecks,maxPlantedDriftPixels:largestDrift,
    maxSpriteTravelPxPerFrame:maxSpriteJump,maxAngularDeltaDegPerFrame:maxAngleJump,
    errorCount:errors.length,warningCount:findings.length-errors.length},
  findings,
  limits:[
    'Only supported production cutout rig and SHA-pinned art/anchors, not arbitrary characters',
    'Occlusion checks use art layers and anchors; they do not measure silhouette aesthetics',
    'Motion spikes require visual review; PASS does not assert acting naturalness',
    'No semantic understanding of arbitrary scenes, speech, lip-sync, or emotion',
  ],
 };
}
export function requireNativeVisualPass(
 raw:unknown,pack:ArtPack,mode:'baseline'|'enhanced'='baseline',
 quality:M6Quality=m6DefaultQuality,
){
 const result=evaluateNativeVisuals(raw,pack,mode,quality);
 if(result.status!=='PASS_TECHNICAL_ONLY')
  throw Error('VISUAL_PREFLIGHT_REJECTED: '+result.findings.filter(x=>x.severity==='error')
    .slice(0,5).map(x=>x.code+'@'+x.frame).join(','));
 return result;
}
