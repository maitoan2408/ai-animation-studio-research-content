import {readFileSync} from 'node:fs';
import {makeM3Showcase} from '../src/motion/character-library.js';
import type {ArtPack} from '../src/scene/types.js';
import type {PhysicsProject} from '../src/physics/m4.js';
export const m4Pack=JSON.parse(readFileSync(new URL('../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
export function m4Fixture(tailFrames=96):PhysicsProject {
 const motion=makeM3Showcase(m4Pack,'audit-m4','an');
 motion.clips=[{action:'pick-place',frames:73}];motion.character.xStart=840;
 return {schemaVersion:'physics-m4/1',motion,tailFrames,gravityMps2:9.81,
  prop:{id:motion.prop!.id,pixelsPerMeter:200,massKg:.6,halfExtentsM:[.15,.13],
  linearDamping:.1,angularDamping:.65,friction:.02,restitution:.2,floorStageY:632,
  velocityStagePxPerSecond:[95,-30],angularVelocityDegPerSecond:40}};
}
