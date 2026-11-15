import { actorSprites } from './rig.js';
import { background } from './benchmark.js';
import { sprite, type ActorPose, type ArtPack, type SceneFrame } from './types.js';

/** The validated data contract is shared structurally with src/animation-ir.ts.
 * Production does not depend on the Studio root node_modules install. */
type Camera = {x:number;y:number;zoom:number};
type Actor = {
  id:string;model:'mai'|'an';x:number;floor:number;facing:1|-1;
  view:'front'|'quarter'|'profile';mood:'neutral'|'worried'|'happy'|'blink';
  headStart:number;headEnd:number;
};
type Prop = {
  id:string;asset:string;assetSha256:string;x:number;y:number;z:number;
  scale:number;anchor:string;ownerId?:string;
};
type ProductionScene = {camera:{from:Camera;to:Camera};actors:Actor[];props:Prop[]};
export type StageShotTimeline = {
  schemaVersion:'animation-ir/1';
  stage:{width:1920;height:1080;yAxis:'down';units:'stage-px'};
  timeline:{fps:24;totalFrames:number};
  artPack?:{id:string;version:string};
  characters?:Array<{id:string;rigId:string;artPackageId:string;actions:string[]}>;
  shots:Array<{
    id:string;interval:{startFrame:number;endFrame:number};
    action?:{name:string;actorId:string};
    camera:{kind:'static'|'pan'};
    production?:ProductionScene;
  }>;
};
const ok=(x:number)=>Number.isFinite(x);
const interpolate=(a:number,b:number,t:number)=>a+(b-a)*t;

/** A real IR->SceneFrame evaluator using verified puppet assets, not benchmarks.
 * Fail closed on missing production data, art hashes or unsupported actors.
 * Every frame is evaluated independently for seek/replay determinism.
 */
export function toProductionFrame(ir:StageShotTimeline,index:number,pack:ArtPack):{
  shotId:string;localFrame:number;frame:SceneFrame;
} {
  if(ir.schemaVersion!=='animation-ir/1'||ir.stage.width!==1920||
     ir.stage.height!==1080||ir.stage.yAxis!=='down'||
     ir.stage.units!=='stage-px'||ir.timeline.fps!==24)
    throw Error('IR_UNSUPPORTED_STAGE');
  if(!ir.artPack||ir.artPack.version!==pack.version||ir.artPack.id!==pack.version)
    throw Error('IR_ART_PACK_VERSION_MISMATCH');
  if(!Number.isSafeInteger(index)||index<0||index>=ir.timeline.totalFrames)
    throw RangeError('IR_FRAME_OUT_OF_RANGE');
  let next=0;
  for(const shot of ir.shots) {
    if(!Number.isSafeInteger(shot.interval.startFrame)||!Number.isSafeInteger(shot.interval.endFrame)||
       shot.interval.startFrame!==next||shot.interval.endFrame<=next)
      throw Error('IR_INVALID_SHOT_INTERVAL');
    next=shot.interval.endFrame;
    if(!shot.production)throw Error('IR_PRODUCTION_SCENE_MISSING');
  }
  if(next!==ir.timeline.totalFrames)throw Error('IR_TOTAL_FRAMES_MISMATCH');
  const shot=ir.shots.find(s=>index>=s.interval.startFrame&&index<s.interval.endFrame);
  if(!shot||!shot.production)throw Error('IR_SHOT_NOT_FOUND');
  const p=shot.production;
  const localFrame=index-shot.interval.startFrame;
  const t=localFrame/Math.max(1,shot.interval.endFrame-shot.interval.startFrame-1);
  const {from,to}=p.camera;
  if(![from.x,from.y,from.zoom,to.x,to.y,to.zoom].every(ok)||
     from.zoom<=0||to.zoom<=0||from.zoom>8||to.zoom>8)
    throw Error('IR_CAMERA_INVALID');
  if(shot.camera.kind==='static'&&
     (from.x!==to.x||from.y!==to.y||from.zoom!==to.zoom))
    throw Error('IR_STATIC_CAMERA_MOVES');
  // World center is (960,540), not (0,0) as in the previous incorrect adapter.
  const camera={
    x:interpolate(from.x,to.x,t),y:interpolate(from.y,to.y,t),
    zoom:interpolate(from.zoom,to.zoom,t),
  };
  const sprites=background(camera),markers:SceneFrame['markers']=[];
  const actors=new Set<string>();
  for(const a of p.actors){
    if(actors.has(a.id))throw Error('IR_DUPLICATE_ACTOR');
    actors.add(a.id);
    const binding=ir.characters?.find(x=>x.id===a.id);
    if(!binding||binding.rigId!=='production-cutout-1'||
       binding.artPackageId!==pack.version||binding.id!==a.model)
      throw Error('IR_ACTOR_RIG_BINDING');
    if(![a.x,a.floor,a.headStart,a.headEnd].every(ok)||
       a.headStart< -45||a.headStart>45||a.headEnd< -45||a.headEnd>45||
       ![1,-1].includes(a.facing))
      throw Error('IR_ACTOR_TRANSFORM_INVALID');
    const pose:ActorPose={
      id:a.id,character:a.model,x:a.x,floor:a.floor,facing:a.facing,
      view:a.view,mood:a.mood,headAngle:interpolate(a.headStart,a.headEnd,t),
    };
    const result=actorSprites(pack,pose);
    sprites.push(...result.sprites);markers.push(...result.markers);
  }
  const propIds=new Set<string>();
  for(const item of p.props){
    if(propIds.has(item.id))throw Error('IR_DUPLICATE_PROP');
    propIds.add(item.id);
    if(item.ownerId&&!actors.has(item.ownerId))throw Error('IR_PROP_OWNER_UNKNOWN');
    if(!item.asset.startsWith('props/'))throw Error('IR_PROP_ASSET_TYPE');
    const asset=pack.assets.find(a=>a.id===item.asset);
    if(!asset||asset.sha256!==item.assetSha256||!asset.anchors[item.anchor])
      throw Error('IR_PROP_ASSET_ANCHOR_HASH');
    if(![item.x,item.y,item.z,item.scale].every(ok)||item.scale<=0||item.scale>4)
      throw Error('IR_PROP_TRANSFORM');
    sprites.push(sprite(item.id,item.asset,item.x,item.y,item.z,0,item.scale));
    markers.push({id:item.id+'.'+item.anchor,point:[
      item.x+(asset.anchors[item.anchor]![0]-asset.pivot[0])*item.scale,
      item.y+(asset.anchors[item.anchor]![1]-asset.pivot[1])*item.scale,
    ],z:item.z,kind:'contact'});
  }
  return {shotId:shot.id,localFrame,frame:{sprites,markers,camera}};
}
