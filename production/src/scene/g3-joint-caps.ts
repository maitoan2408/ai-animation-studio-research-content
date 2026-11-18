/** G3 opt-in paper-cut joint cap geometry. Source-driven, not actor/prop hardcoded.
 * The rest of the studio continues to render the original pinned SVG art.
 */
import {anchorPoint} from '../scene/geometry.js';
import type {ArtPack,SceneFrame,Point} from '../scene/types.js';
export type JointCap={
 id:string;x:number;y:number;z:number;radius:number;sourceAsset:string;
};
export type JointCapIssue={code:string;id:string;detail:string};
const eq=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const finite=(n:number)=>Number.isFinite(n);
export function deriveG3JointCaps(scene:SceneFrame,pack:ArtPack,actorIds:readonly string[]):JointCap[]{
 const result:JointCap[]=[];
 for(const actorId of actorIds){
  for(const side of ['left','right'] as const){
   for(const [a,b,kind] of [['upper','forearm','elbow'],['thigh','shin','knee']] as const){
    const first=scene.sprites.find(s=>s.id===actorId+'.'+side+'-'+a);
    const second=scene.sprites.find(s=>s.id===actorId+'.'+side+'-'+b);
    if(!first||!second)throw Error('G3_JOINT_SOURCE_MISSING '+actorId+' '+side+' '+kind);
    const art1=pack.assets.find(x=>x.id===first.asset);
    const art2=pack.assets.find(x=>x.id===second.asset);
    if(!art1||!art2||!art1.anchors.end)throw Error('G3_JOINT_ASSET_MISSING');
    const joint=anchorPoint(pack,first,'end'),start:Point=[second.x,second.y];
    if(eq(joint,start)>0.001)throw Error('G3_JOINT_SEAM_DISCONNECTED '+actorId+' '+kind);
    const radius=Math.min(art1.width*Math.abs(first.scaleX),art2.width*Math.abs(second.scaleX))*
      (kind==='knee'?.33:.32);
    result.push({id:actorId+'.'+side+'-'+kind,
      x:joint[0],y:joint[1],z:Math.max(first.z,second.z)+.001,
      radius,sourceAsset:first.asset});
   }
  }
 }
 return result;
}
export function auditG3JointCaps(scene:SceneFrame,pack:ArtPack,actorIds:readonly string[]):JointCapIssue[]{
 const issues:JointCapIssue[]=[],expected=deriveG3JointCaps(scene,pack,actorIds);
 const actual=scene.jointCaps??[];
 const byId=new Map(actual.map(c=>[c.id,c]));
 if(byId.size!==actual.length)issues.push({code:'G3_JOINT_DUPLICATE',id:'jointCaps',detail:'duplicate IDs'});
 for(const e of expected){
  const cap=byId.get(e.id);
  if(!cap){issues.push({code:'G3_JOINT_CAP_MISSING',id:e.id,detail:'expected joint cap missing'});continue;}
  if(![cap.x,cap.y,cap.z,cap.radius].every(finite)||cap.radius<=0||
     eq([cap.x,cap.y],[e.x,e.y])>.001||
     Math.abs(cap.z-e.z)>.001||Math.abs(cap.radius-e.radius)>.001||
     cap.sourceAsset!==e.sourceAsset)
    issues.push({code:'G3_JOINT_CAP_MISALIGNED',id:e.id,detail:'actual asset/pivot geometry mismatch'});
 }
 if(actual.length!==expected.length)
  issues.push({code:'G3_JOINT_COUNT',id:'jointCaps',detail:String(actual.length)+' vs '+expected.length});
 return issues;
}
