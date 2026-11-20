/** Opt-in G3 arm/torso depth continuity for supported planted grasp/release rigs.
 * The *interacting* arm remains in the same visual depth band after handoff.
 * We derive both bands from the actual native rig each frame: no fixed z,
 * actor names, prop IDs, timestamps or texture colors enter the algorithm.
 *
 * This resolves one proven release-time painter-order inversion. It is NOT
 * a substitute for alpha/silhouette-level joint or garment seam inspection.
 */
import type {SceneFrame,Sprite} from './types.js';

export type G3ArmSide='left'|'right';
export type G3DepthIssue={code:string;id:string;detail:string};
const other=(side:G3ArmSide):G3ArmSide=>side==='left'?'right':'left';
const armParts=['upper','forearm','hand','grip-front'] as const;
const id=(actorId:string,side:G3ArmSide,part:string)=>actorId+'.'+side+'-'+part;
const item=(frame:SceneFrame,spriteId:string):Sprite=>{
 const result=frame.sprites.find(s=>s.id===spriteId);
 if(!result)throw Error('G3_ARM_DEPTH_SOURCE_MISSING '+spriteId);
 if(!Number.isFinite(result.z))throw Error('G3_ARM_DEPTH_NONFINITE '+spriteId);
 return result;
};
const armIds=(actorId:string,side:G3ArmSide)=>
 new Set(armParts.map(p=>id(actorId,side,p)));

/** Strict structural QA: contact-side arm in front of torso, other behind.
 * These are cutout rig capability boundaries, not a universal 3D visibility
 * claim. A cross-body shot requires an explicit new capability, not fallback.
 */
export function auditG3ArmDepth(frame:SceneFrame,actorId:string,
 frontSide:G3ArmSide):G3DepthIssue[]{
 const issues:G3DepthIssue[]=[];
 const near=id(actorId,frontSide,'upper'),far=id(actorId,other(frontSide),'upper');
 let torso:Sprite,front:Sprite,rear:Sprite;
 try{
  torso=item(frame,actorId+'.torso');front=item(frame,near);rear=item(frame,far);
 }catch(e){
  return [{code:'G3_ARM_DEPTH_SOURCE_MISSING',id:actorId,detail:String(e)}];
 }
 if(!(rear.z<torso.z&&torso.z<front.z))
  issues.push({code:'G3_ARM_TORSO_OCCLUSION',id:actorId,
    detail:'expected rear upper < torso < contact upper'});
 for(const side of [frontSide,other(frontSide)]){
  try{
   const upper=item(frame,id(actorId,side,'upper'));
   const forearm=item(frame,id(actorId,side,'forearm'));
   const hand=item(frame,id(actorId,side,'hand'));
   if(!(upper.z<forearm.z&&forearm.z<hand.z))
    issues.push({code:'G3_ARM_SEGMENT_ORDER',id:actorId+'.'+side,
      detail:'upper < forearm < hand required'});
  }catch(e){
   issues.push({code:'G3_ARM_DEPTH_SOURCE_MISSING',id:actorId+'.'+side,
     detail:String(e)});
  }
 }
 return issues;
}

/** A pure no-op while the declared arm already occupies the front band.
 * Following release, the default rig may restore an unrelated right-front
 * painter order even though neither arm crosses the body. Swap the two
 * existing complete arm depth bands as a unit; keep intra-limb offsets,
 * transformed art, grip positions, physics, feet and scene assets untouched.
 */
export function resolveG3ArmDepth(scene:SceneFrame,actorId:string,
 frontSide:G3ArmSide):SceneFrame{
 const torso=item(scene,actorId+'.torso');
 const front=item(scene,id(actorId,frontSide,'upper'));
 const backSide=other(frontSide),back=item(scene,id(actorId,backSide,'upper'));
 const asExpected=back.z<torso.z&&torso.z<front.z;
 if(asExpected){
  const issues=auditG3ArmDepth(scene,actorId,frontSide);
  if(issues.length)throw Error('G3_ARM_DEPTH_INVALID '+JSON.stringify(issues));
  return scene;
 }
 if(!(front.z<torso.z&&torso.z<back.z))
  throw Error('G3_ARM_DEPTH_CAPABILITY_UNSUPPORTED '+actorId);
 const frontGroup=armIds(actorId,frontSide);
 const backGroup=armIds(actorId,backSide);
 const forward=back.z-front.z,backward=front.z-back.z;
 const resolved:SceneFrame={...scene,
  sprites:scene.sprites.map(s=>{
   if(frontGroup.has(s.id))return {...s,z:s.z+forward};
   if(backGroup.has(s.id))return {...s,z:s.z+backward};
   return s;
  })};
 const issues=auditG3ArmDepth(resolved,actorId,frontSide);
 if(issues.length)throw Error('G3_ARM_DEPTH_INVALID '+JSON.stringify(issues));
 return resolved;
}
