import { add, subtract, rotate, elbow } from './math.js';
import { sprite, type ActorPose, type ArtPack, type Marker, type Point, type Sprite } from './types.js';

/** Stance of the `production-cutout-1` rig in actor-local units (origin on the
 * floor). Bone lengths are NOT here: they come from each character's own art
 * (pivot -> `end` / `sole` anchors), so differently proportioned kits work. */
export const cutoutStance = {
  hipHeight: 258, hipHalfWidth: 30,
  leftAnkle: [-35, -29] as Point, rightAnkle: [48, -29] as Point,
  /** Relaxed arm: the wrist hangs this fraction of the arm's own length below
   * the shoulder (elbow slightly bent) and this far out to the side. */
  restReach: .95, restOut: 14, restOutProfile: 0,
} as const;
/** Pivot-to-anchor distance of one art part, in native units. */
export function partLength(pack: ArtPack, assetId: string, anchor = 'end'): number {
  const art = pack.assets.find(x => x.id === assetId);
  const end = art?.anchors[anchor];
  if (!art || !end) throw new Error(`RIG_PART_ANCHOR_MISSING: ${assetId}.${anchor}`);
  return Math.hypot(end[0] - art.pivot[0], end[1] - art.pivot[1]);
}

/** Assemble an authored cutout puppet. Every part transform is absolute so
 * re-evaluating a frame never integrates previous frames or clock state. */
export function actorSprites(pack: ArtPack, pose: ActorPose): {sprites: Sprite[]; markers: Marker[]} {
  if (pose.rightElbowBend !== undefined && pose.rightElbowBend !== 1 && pose.rightElbowBend !== -1) throw Error('RIGHT_ELBOW_BEND_INVALID');
  if (pose.leftElbowBend !== undefined && pose.leftElbowBend !== 1 && pose.leftElbowBend !== -1) throw Error('LEFT_ELBOW_BEND_INVALID');
  const items: Sprite[] = [], markers: Marker[] = [];
  const a = pose.character, st = cutoutStance, hip = add([0, -st.hipHeight], pose.hipOffset ?? [0, 0]);
  const thigh = partLength(pack, `${a}/thigh`), shin = partLength(pack, `${a}/shin`);
  const upperArm = partLength(pack, `${a}/upper-arm`), forearm = partLength(pack, `${a}/forearm`);
  const bootArt = pack.assets.find(x => x.id === `${a}/boot`);
  if (!bootArt?.anchors.sole) throw new Error(`RIG_PART_ANCHOR_MISSING: ${a}/boot.sole`);
  const soleOffset = subtract(bootArt.anchors.sole, bootArt.pivot);
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
    const knee = elbow(start, ankle, thigh, shin, 1);
    bone(`${side}-thigh`, 'thigh', start, knee, z);
    bone(`${side}-shin`, 'shin', knee, ankle, z + .1);
    localSprite(`${side}-boot`, `${a}/boot`, ankle, z+.2);
    mark(`${side}-sole`, add(ankle, soleOffset), 'ground', z+.2);
  };
  leg('left', add(hip, [-st.hipHalfWidth,0]), pose.leftAnkle ?? st.leftAnkle, 1);
  leg('right', add(hip,[st.hipHalfWidth,0]), pose.rightAnkle ?? st.rightAnkle, 2);
  const arm = (side: 'left' | 'right', shoulder: Point, wrist: Point, z: number) => {
    const joint = elbow(shoulder,wrist,upperArm,forearm,side === 'right' ? pose.rightElbowBend ?? 1 : pose.leftElbowBend ?? -1);
    bone(`${side}-upper`, 'upper-arm', shoulder,joint,z);
    bone(`${side}-forearm`, 'forearm',joint,wrist,z+.1);
    // A resting hand is relaxed: the half-open drawing when the pack has one.
    const relaxed = pack.assets.some(x => x.id === `${a}/hand-half`) ? 'half' as const : 'open' as const;
    const hand = side === 'right' ? pose.rightHand ?? relaxed : pose.leftHand ?? relaxed;
    const handAngle=(side==='right'?pose.rightHandAngle:pose.leftHandAngle) ?? (hand==='open'?180:0);
    const layeredGrip=hand==='grip'&&(pose.layeredGripSide===side||
      (pose.layeredGripSide===undefined&&(pose.layeredGrip===side||(side==='right'&&pose.layeredGrip===true))));
    localSprite(`${side}-hand`,`${a}/hand-${hand}`,wrist,
      z+(layeredGrip ? 0.15 : 0.2),handAngle);
    const handSprite=items[items.length-1]!;
    // M3's side-valued contract mirrors its left grip; general-contact/1
    // explicitly selects an unmirrored grip with layeredGripSide.
    const mirrorLeftGrip=layeredGrip&&side==='left'&&pose.layeredGripSide===undefined&&pose.layeredGrip==='left';
    if((hand==='open'&&side==='right')||mirrorLeftGrip) handSprite.scaleX=-1;
    const handAsset=pack.assets.find(x=>x.id===handSprite.asset)!;
    const offset=subtract(handAsset.anchors.grip!,handAsset.pivot);
    mark(`${side}-grip`,add(wrist,rotate([offset[0]*handSprite.scaleX,offset[1]],handAngle)),'contact',z+.2);
    if(layeredGrip){
      // This real SVG overlays only curved fingertips: mug handle is
      // visible between the rear palm and front fingers, not hidden
      // behind a single opaque fist as in the original M3 implementation.
      localSprite(`${side}-grip-front`,`${a}/hand-grip-front`,wrist,z+0.35,handAngle);
      if(mirrorLeftGrip)items[items.length-1]!.scaleX=-1;
    }
    mark(`${side}-wrist`,wrist,'joint',z+.2);
  };
  const restWrist=(shoulder:Point,side:-1|1)=>add(shoulder,
    rotate([side*(profile?st.restOutProfile:st.restOut),(upperArm+forearm)*st.restReach],torsoAngle));
  arm('left',torsoAnchor('leftShoulder'),pose.leftWrist ?? restWrist(torsoAnchor('leftShoulder'),-1),
    pose.layeredGripSide==='left'?5:2.5);
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
  arm('right',torsoAnchor('rightShoulder'),pose.rightWrist ?? restWrist(torsoAnchor('rightShoulder'),1),
    pose.layeredGripSide==='left'?2.5:5);
  const scale = pose.scale ?? 1, facing = pose.facing;
  const world = (p: Point): Point => [pose.x + p[0]*scale*facing, pose.floor+p[1]*scale];
  return {
    sprites: items.map(s=>{const p=world([s.x,s.y]);return {...s,x:p[0],y:p[1],rotation:s.rotation*facing,scaleX:s.scaleX*scale*facing,scaleY:s.scaleY*scale};}),
    markers: markers.map(m=>({...m,point:world(m.point)})),
  };
}
