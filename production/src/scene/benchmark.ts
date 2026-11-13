/** Pure frame authoring for the six locked benchmark shots. No wall clock,
 * random generator, prior-frame integration or DOM. Source is editable blocking,
 * not an inference model and not yet a production planner. */
import { actorSprites } from './rig.js';
import { anchorPoint, assetPoint } from './geometry.js';
import {polishFrame} from './polish.js';
import { mix, mixPoint, smooth, rotate, add } from './math.js';
import { sprite, type ActorPose, type ArtPack, type Point, type SceneFrame, type Sprite } from './types.js';

export const shotFrames={S01:192,S02:192,S03:240,S04:192,S05:192,S06:144} as const;
export type ShotId=keyof typeof shotFrames;
export type Cue={start:number;end:number;mouth:NonNullable<ActorPose['mouth']>};
export type Edit={polish?:boolean;propAccent?:boolean;cameraAmplitude?:number;reactionDelay?:number;eyeLine?:number;concernStartsAt?:number;cues?:Cue[];voiceTake?:'R1';separateHandoffGrips?:boolean;handoffSecondaryTransform?:{x:number;y:number;rotation:number}};
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
function wristFor(pack:ArtPack,prop:Sprite,actor:ActorPose,contact?:Point):Point{
  const grip=contact??anchorPoint(pack,prop,'grip'),scale=actor.scale??1;
  const hand=pack.assets.find(a=>a.id===`${actor.character}/hand-grip`);
  if(!hand?.anchors.grip)throw Error('HAND_GRIP_METADATA_MISSING');
  const offset:Point=[hand.anchors.grip[0]-hand.pivot[0],hand.anchors.grip[1]-hand.pivot[1]];
  return [(grip[0]-actor.x)/(scale*actor.facing)-offset[0],(grip[1]-actor.floor)/scale-offset[1]];
}
function mouthAt(f:number,cues:Cue[]):NonNullable<ActorPose['mouth']>{
  return cues.find(c=>f>=c.start&&f<c.end)?.mouth??'rest';
}
export function walkPose(f:number):ActorPose{
  const t=Math.max(0,Math.min(120,f-12)),step=Math.min(4,Math.floor(t/24)),u=t===120?1:(t%24)/24;
  let left=605,right=688;
  for(let i=0;i<step;i++){if(i%2===0)left+=136;else right+=136;}
  // Shortened final step stops under the pelvis. Ease-out root keeps incoming
  // velocity continuous, then reduces monotonically during frames 108–131.
  const finalStep=step===4,swing=Math.sin(Math.PI*u)**2*(finalStep?20:34),travel=smooth(u)*(finalStep?34:136);
  if(step%2===0)left+=travel;else right+=travel;
  const x=finalStep?912+34*(2*u-u*u):640+68*(step+u);
  const leftLift=step%2===0&&f>=12&&f<132?swing:0,rightLift=step%2===1&&f>=12&&f<132?swing:0;
  // Lower the pelvis only as required by each leg's current horizontal reach.
  // 228px keeps a 2px bend reserve in the 230px two-bone chain. The old fixed
  // 24px drop passed contact tests but produced a persistent crouch (EX-022).
  const drop=(dx:number,lift:number)=>229-lift-Math.sqrt(228**2-dx**2);
  const walkingDrop=Math.max(4,drop(left-x+30,leftLift),drop(right-x-30,rightLift));
  const hipY=f<12?mix(0,4,beat(f,0,12)):f<132?walkingDrop:mix(4,0,beat(f,132,155));
  const angle=f>=12&&f<132?2*Math.sin(t*Math.PI/24):0;
  const armSwing=f>=12&&f<132?12*Math.sin(t*Math.PI/24)*(finalStep?1-u:1):0;
  const arm=(side:'left'|'right'):Point=>add([0,-258+hipY],rotate(add(side==='right'?[17,-139]:[-21,-139],rotate(side==='right'?[58,186]:[-41,186],side==='right'?-armSwing:armSwing)),angle));
  return {id:'mai',character:'mai',x,floor,facing:1,view:f<140?'profile':f<152?'quarter':'front',
    hipOffset:[0,hipY],torsoAngle:angle,headAngle:f<132?-2:mix(-2,4,beat(f,132,155)),
    rightWrist:f<140?arm('right'):undefined,leftWrist:f<140?arm('left'):undefined,
    rightHandAngle:180+angle-armSwing,leftHandAngle:180+angle+armSwing,
    leftAnkle:[left-x,-29-leftLift],
    rightAnkle:[right-x,-29-rightLift],mood:f>155?'happy':'neutral'};
}
export function benchmarkFrame(pack:ArtPack,shot:ShotId,f:number,edit:Edit={}):SceneFrame{
  if(!Number.isInteger(f)||f<0||f>=shotFrames[shot])throw Error(`FRAME_OUT_OF_RANGE ${shot}:${f}`);
  if(edit.handoffSecondaryTransform){
    const t=edit.handoffSecondaryTransform;
    if(shot!=='S05'||f<108||!edit.separateHandoffGrips||![t.x,t.y,t.rotation].every(Number.isFinite)||Math.abs(t.rotation)>90||Math.abs(t.x)>3840||Math.abs(t.y)>2160)throw Error('SECONDARY_TRANSFORM_RANGE');
  }
  let camera={x:960,y:540,zoom:1};const actors:ActorPose[]=[],props:Sprite[]=[];
  const mai:ActorPose={id:'mai',character:'mai',x:760,floor,facing:1,view:'quarter'};
  if(shot==='S01'){
    camera={x:795,y:430,zoom:2.35};
    actors.push({...mai,torsoAngle:mix(0,-2,beat(f,24,47)),headAngle:mix(-4,2,beat(f,24,47))+(edit.eyeLine??0),
      mood:f>=22&&f<=25?'blink':f<(edit.concernStartsAt??28)?'neutral':f<130?'worried':'happy',mouth:mouthAt(f,edit.cues??[])});
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
    if(edit.handoffSecondaryTransform)Object.assign(lamp,edit.handoffSecondaryTransform);
    // R3 binds each palm to a different drawn side of the existing handle.
    // Coordinates are in lantern SVG space (left/right vertical strokes),
    // transformed through the actual prop; not screen offsets or rig scaling.
    // Legacy takes keep their shared centre anchor when the edit is absent.
    const handoffWrist=(prop:Sprite,actor:ActorPose):Point=>wristFor(pack,prop,actor,
      edit.separateHandoffGrips?assetPoint(pack,prop,actor.id==='mai'?[51,25]:[110,27]):undefined);
    const maiGrip=handoffWrist(lamp,mai),anGrip=handoffWrist(lamp,an);
    // On release the giver returns from the transfer pose, not the moving prop.
    const releaseLamp=sprite('lamp','props/lantern-lit',927,565+186*.6,6,0,.6);
    actors.push({...mai,rightWrist:f<=107?maiGrip:mixPoint(handoffWrist(releaseLamp,mai),rest(108),beat(f,108,143)),
      rightHand:f<=107?'grip':'open',rightHandAngle:f<=107?0:mix(0,180,beat(f,108,143)),
      headAngle:f<144?2:mix(2,-3,beat(f,144,167)),mood:f>=144?'happy':'neutral'},
      {...an,rightWrist:f<72?mixPoint(rest(108),anGrip,beat(f,36,72)):anGrip,rightHand:f<72?'open':'grip',
      rightHandAngle:f<72?mix(180,0,beat(f,36,72)):0,headAngle:mix(5,-2,beat(f,12,35)),mood:f>155+(edit.reactionDelay??0)?'happy':'neutral'});
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
  const frame={sprites,markers,camera};return edit.polish?polishFrame(pack,frame):frame;
}
