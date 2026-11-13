import { actorSprites } from '../scene/rig.js';
import { sprite, type ArtPack, type SceneFrame } from '../scene/types.js';
import { anchorPoint } from '../scene/geometry.js';

/** Q1 contact styleframe. Kept as data/geometry shared by preview and tests. */
export function contactLayout(pack: ArtPack): SceneFrame {
  const cup=sprite('cup','props/cup',908,631,5.2,0,.7);
  const grip=anchorPoint(pack,cup,'grip');
  const hand=pack.assets.find(a=>a.id==='mai/hand-grip')!;
  const offset=[hand.anchors.grip![0]-hand.pivot[0],hand.anchors.grip![1]-hand.pivot[1]];
  const actor=actorSprites(pack,{id:'mai',character:'mai',x:760,floor:860,facing:1,
    rightWrist:[grip[0]-760-offset[0]!,grip[1]-860-offset[1]!],rightHand:'grip',headAngle:9});
  return {sprites:[...actor.sprites,sprite('bench','props/workbench',1100,860,-1),
    cup],markers:actor.markers,camera:{x:940,y:620,zoom:1.55}};
}
