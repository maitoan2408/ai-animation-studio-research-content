/** Pure frame authoring for the six locked benchmark shots. No wall clock,
 * random generator, prior-frame integration or DOM. Source is editable blocking,
 * not an inference model and not yet a production planner. */
import { actorSprites } from './rig.js';
import { anchorPoint } from './geometry.js';
import { mix, mixPoint, smooth, rotate, add } from './math.js';
import { sprite, type ActorPose, type ArtPack, type Point, type SceneFrame, type Sprite } from './types.js';

export const shotFrames={S01:192,S02:192,S03:240,S04:192,S05:192,S06:144} as const;
export type ShotId=keyof typeof shotFrames;
export type Cue={start:number;end:number;mouth:NonNullable<ActorPose['mouth']>};
export type Edit={propAccent?:boolean;cameraAmplitude?:number;reactionDelay?:number;eyeLine?:number;cues?:Cue[]};
const beat=(f:number,a:number,b:number)=>smooth((f-a)/(b-a));
const floor=860;
const rest=(x:number,angle=0,hip:Point=[0,0]):Point=>add(add([0,-258],hip),rotate([x,47],angle));
export function background(camera:SceneFrame['camera']):Sprite[]{
  // Authored multiplane parallax with an orthographic lens. No free 3D orbit.
  return [sprite('sky','background/sky',960,540,-600),sprite('village','background/village',960,540,-400),
    sprite('workshop','background/workshop',960,540,-200),sprite('ground','background/ground',960,540,-10),
    sprite('tree-left','background/tree-left',30,500,50),sprite('tree-right','background/tree-right',1890,500,51,0,-1,1),
    sprite('grass','background/foreground-grass',800,1110,60)].map(s=>({...s,x:s.x-(camera.x-960)*s.z/2000}));
}
function wristFor(pack:ArtPack,prop:Sprite,actor:ActorPose):Point{
  const grip=anchorPoint(pack,prop,'grip'),scale=actor.scale??1;
  // Grip drawing angle=0. Native hand grip is [14,-17] from wrist pivot.
  return [(grip[0]-actor.x)/(scale*actor.facing)-14,(grip[1]-actor.floor)/scale+17];
}
function mouthAt(f:number,cues:Cue[]):NonNullable<ActorPose['mouth']>{
  return cues.find(c=>f>=c.start&&f<c.end)?.mouth??'rest';
}
export function walkPose(f:number):ActorPose{
  const t=Math.max(0,Math.min(120,f-12)),step=Math.min(4,Math.floor(t/24)),u=t===120?1:(t%24)/24;
  let left=605,right=688;
  for(let i=0;i<step;i++){if(i%2===0)left+=136;else right+=136;}
  const swing=Math.sin(Math.PI*u)*34,travel=smooth(u)*136;
  if(step%2===0)left+=travel;else right+=travel;
  const x=640+68*(step+u),hipY=f<12?mix(0,24,beat(f,0,12)):f<132?24:mix(24,12,beat(f,132,155));
  return {id:'mai',character:'mai',x,floor,facing:1,view:f<140?'profile':f<152?'quarter':'front',
    hipOffset:[0,hipY],torsoAngle:f>=12&&f<132?2*Math.sin(t*Math.PI/24):0,headAngle:f<132?-2:mix(-2,4,beat(f,132,155)),
    leftAnkle:[left-x,-29-(step%2===0&&f>=12&&f<132?swing:0)],
    rightAnkle:[right-x,-29-(step%2===1&&f>=12&&f<132?swing:0)],mood:f>155?'happy':'neutral'};
}
export function benchmarkFrame(pack:ArtPack,shot:ShotId,f:number,edit:Edit={}):SceneFrame{
  if(!Number.isInteger(f)||f<0||f>=shotFrames[shot])throw Error(`FRAME_OUT_OF_RANGE ${shot}:${f}`);
  let camera={x:960,y:540,zoom:1};const actors:ActorPose[]=[],props:Sprite[]=[];
  const mai:ActorPose={id:'mai',character:'mai',x:760,floor,facing:1,view:'quarter'};
  if(shot==='S01'){
    camera={x:795,y:430,zoom:2.35};
    actors.push({...mai,torsoAngle:mix(0,-2,beat(f,24,47)),headAngle:mix(-4,2,beat(f,24,47))+(edit.eyeLine??0),
      mood:f>=22&&f<=25?'blink':f<28?'neutral':f<130?'worried':'happy',mouth:mouthAt(f,edit.cues??[])});
    props.push(sprite('lamp','props/lantern-dark',1100,667,6,0,.65));
  }else if(shot==='S02'){
    const p=walkPose(f);actors.push(p);camera={x:850+(p.x-640)*.16,y:550,zoom:1.1};
  }else if(shot==='S03'){
    camera={x:930,y:585,zoom:1.45};
    const lift=beat(f,72,107),place=beat(f,144,179),cupX=mix(mix(908,903,lift),930,place),cupY=mix(mix(631,543,lift),631,place);
    const cup=sprite('cup','props/cup',cupX,cupY,6,0,.7);
    // R1 uses an explicitly different authored prop asset; no color filter magic.
    if(edit.propAccent)cup.asset='props/cup-accent';
    const angle=mix(mix(0,5,beat(f,24,60)),9,place),hip:Point=[0,2*beat(f,24,60)];
    const target=wristFor(pack,cup,mai),neutral=rest(108,angle,hip);
    let wrist=mixPoint(neutral,target,beat(f,24,60));
    if(f>=180)wrist=mixPoint(target,neutral,beat(f,180,203));
    actors.push({...mai,torsoAngle:angle,hipOffset:hip,headAngle:mix(0,9,beat(f,12,40)),
      rightWrist:wrist,rightHand:f>=60&&f<180?'grip':'open',rightHandAngle:f<60?mix(180,0,beat(f,24,60)):f<180?0:mix(0,180,beat(f,180,203)),
      mood:f>110?'happy':'neutral'});
    props.push(sprite('bench','props/workbench',1060,floor,-1,0,1.2),cup);
  }else if(shot==='S04'){
    const t=beat(f,24,143),amplitude=edit.cameraAmplitude??1;
    camera={x:mix(880,1040,t*amplitude),y:540,zoom:mix(1,1.08,t)};
    actors.push({...mai,mood:'happy'}, {id:'an',character:'an',x:1370,floor,facing:-1,mood:'neutral',scale:.96});
    props.push(sprite('bench','props/workbench',1100,floor,-1),sprite('lamp','props/lantern-lit',1100,669,6,0,.65));
  }else if(shot==='S05'){
    camera={x:955,y:570,zoom:1.35};mai.x=770;
    const an:ActorPose={id:'an',character:'an',x:1140,floor,facing:-1,view:'quarter'};
    const offer=beat(f,24,71),receive=beat(f,108,143),grip:Point=[mix(mix(900,927,offer),1030,receive),mix(565,580,receive)];
    const lamp=sprite('lamp','props/lantern-lit',grip[0],grip[1]+186*.6,6,0,.6);
    const maiGrip=wristFor(pack,lamp,mai),anGrip=wristFor(pack,lamp,an);
    // On release the giver returns from the transfer pose, not the moving prop.
    const releaseLamp=sprite('lamp','props/lantern-lit',927,565+186*.6,6,0,.6);
    actors.push({...mai,rightWrist:f<=107?maiGrip:mixPoint(wristFor(pack,releaseLamp,mai),rest(108),beat(f,108,143)),
      rightHand:f<=107?'grip':'open',rightHandAngle:f<=107?0:mix(0,180,beat(f,108,143)),
      headAngle:f<144?2:mix(2,-3,beat(f,144+(edit.reactionDelay??0),167+(edit.reactionDelay??0))),mood:f>=144+(edit.reactionDelay??0)?'happy':'neutral'},
      {...an,rightWrist:f<72?mixPoint(rest(108),anGrip,beat(f,36,72)):anGrip,rightHand:f<72?'open':'grip',
      rightHandAngle:f<72?mix(180,0,beat(f,36,72)):0,headAngle:mix(5,-2,beat(f,12,35)),mood:f>155?'happy':'neutral'});
    props.push(lamp);
  }else{
    camera={x:900,y:550,zoom:1.3};const anticipate=beat(f,0,23),reach=beat(f,24,59),recover=beat(f,84,119);
    const hip:Point=[0,mix(mix(0,22,anticipate),12,reach)*(1-recover)],angle=mix(mix(0,5,anticipate),-4,reach)*(1-recover);
    const wrist=mixPoint(mixPoint(rest(108,angle,hip),[170,-530],reach),rest(108,angle,hip),recover);
    actors.push({...mai,hipOffset:hip,torsoAngle:angle,headAngle:mix(5,-10,reach)*(1-recover),rightWrist:wrist,
      rightHand:f>=40&&f<110?'point':'open',rightHandAngle:180*(1-reach+reach*recover),mood:f<36?'worried':'happy'});
  }
  const sprites=[...background(camera),...props],markers:SceneFrame['markers']=[];
  for(const actor of actors){const r=actorSprites(pack,actor);sprites.push(...r.sprites);markers.push(...r.markers);}
  // Fingers may sit in front of the prop body; both transforms still share grip.
  for(const s of sprites)if(s.asset.endsWith('/hand-grip'))s.z=7;
  return {sprites,markers,camera};
}
