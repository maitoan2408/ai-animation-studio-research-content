import { add, subtract, rotate, elbow } from './math.js';
import { sprite, type ActorPose, type ArtPack, type Marker, type Point, type Sprite } from './types.js';

/** Assemble an authored cutout puppet. Every part transform is absolute so
 * re-evaluating a frame never integrates previous frames or clock state. */
export function actorSprites(pack: ArtPack, pose: ActorPose): {sprites: Sprite[]; markers: Marker[]} {
  const items: Sprite[] = [], markers: Marker[] = [];
  const a = pose.character, hip = add([0, -258], pose.hipOffset ?? [0, 0]);
  const torsoAngle = pose.torsoAngle ?? 0;
  const atTorso = (local: Point) => add(hip, rotate(local, torsoAngle));
  const profile=pose.view==='profile';
  const torsoId=`${a}/torso${pose.view==='front'?'-front':profile?'-profile':''}`;
  const torso=pack.assets.find(x=>x.id===torsoId);
  if(!torso) throw new Error(`TORSO_MISSING: ${torsoId}`);
  const torsoAnchor=(name:string)=>atTorso(subtract(torso.anchors[name]!,torso.pivot));
  const localSprite = (id: string, asset: string, p: Point, z: number, rotation = 0) => {
    items.push(sprite(`${pose.id}.${id}`, asset, p[0], p[1], z, rotation));
  };
  const mark = (id: string, point: Point, kind: Marker['kind'] = 'joint', z = 4) =>
    markers.push({id: `${pose.id}.${id}`, point, kind, z});
  const bone = (id: string, asset: string, from: Point, to: Point, z: number) =>
    localSprite(id, `${a}/${asset}`, from, z, Math.atan2(to[1]-from[1], to[0]-from[0])*180/Math.PI-90);
  const leg = (side: string, start: Point, ankle: Point, z: number) => {
    const knee = elbow(start, ankle, 115, 115, 1);
    bone(`${side}-thigh`, 'thigh', start, knee, z);
    bone(`${side}-shin`, 'shin', knee, ankle, z + .1);
    localSprite(`${side}-boot`, `${a}/boot`, ankle, z+.2);
    mark(`${side}-sole`, add(ankle, [0,29]), 'ground', z+.2);
  };
  leg('left', add(hip, [-30,0]), pose.leftAnkle ?? [-35,-29], 1);
  leg('right', add(hip,[30,0]), pose.rightAnkle ?? [48,-29], 2);
  const arm = (side: 'left' | 'right', shoulder: Point, wrist: Point, z: number) => {
    const joint = elbow(shoulder,wrist,105,98,side === 'right' ? 1 : -1);
    bone(`${side}-upper`, 'upper-arm', shoulder,joint,z);
    bone(`${side}-forearm`, 'forearm',joint,wrist,z+.1);
    const hand = side === 'right' ? pose.rightHand ?? 'open' : pose.leftHand ?? 'open';
    const handAngle=(side==='right'?pose.rightHandAngle:pose.leftHandAngle) ?? (hand==='open'?180:0);
    localSprite(`${side}-hand`,`${a}/hand-${hand}`,wrist,z+.2,handAngle);
    const handSprite=items[items.length-1]!;
    if(hand==='open'&&side==='right') handSprite.scaleX=-1;
    const handAsset=pack.assets.find(x=>x.id===handSprite.asset)!;
    const offset=subtract(handAsset.anchors.grip!,handAsset.pivot);
    mark(`${side}-grip`,add(wrist,rotate([offset[0]*handSprite.scaleX,offset[1]],handAngle)),'contact',z+.2);
    mark(`${side}-wrist`,wrist,'joint',z+.2);
  };
  const restWrist=(x:number)=>atTorso([x,47]);
  arm('left',torsoAnchor('leftShoulder'),pose.leftWrist ?? restWrist(profile?-62:-99),2.5);
  localSprite('torso',torsoId,hip,3,torsoAngle);
  const neck = torsoAnchor('neck');
  const headId = `${a}/head-${pose.view ?? 'quarter'}-${pose.mood ?? 'neutral'}`;
  const headAsset = pack.assets.find(x=>x.id===headId);
  if (!headAsset?.anchors.mouth) throw new Error(`MISSING_HEAD_ANCHOR: ${headId}`);
  const headAngle = torsoAngle + (pose.headAngle ?? 0);
  localSprite('head',headId,neck,4,headAngle);
  const mouth = add(neck,rotate(subtract(headAsset.anchors.mouth,headAsset.pivot),headAngle));
  localSprite('mouth',`mouth/${pose.mouth ?? 'rest'}`,mouth,4.1,headAngle);
  if(pose.view==='profile') items[items.length-1]!.scaleX=.65;
  arm('right',torsoAnchor('rightShoulder'),pose.rightWrist ?? restWrist(profile?75:108),5);
  const scale = pose.scale ?? 1, facing = pose.facing;
  const world = (p: Point): Point => [pose.x + p[0]*scale*facing, pose.floor+p[1]*scale];
  return {
    sprites: items.map(s=>{const p=world([s.x,s.y]);return {...s,x:p[0],y:p[1],rotation:s.rotation*facing,scaleX:s.scaleX*scale*facing,scaleY:s.scaleY*scale};}),
    markers: markers.map(m=>({...m,point:world(m.point)})),
  };
}
