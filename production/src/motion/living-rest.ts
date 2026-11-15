/** Isolated standing-pose fixture. Never applied during a prop contact. */
import type { ActorPose } from '../scene/types.js';
import { sampleLife } from './life.js';
export function sampleLivingRest(seed: number, frame: number, intensity: number): ActorPose {
 if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) throw Error('LIVING_INTENSITY_INVALID');
 const {breath,blink} = sampleLife(seed,frame);
 return {id:'mai',character:'mai',x:760,floor:860,facing:1,view:'quarter',
  leftAnkle:[-35,-29],rightAnkle:[48,-29],hipOffset:[intensity*(breath-.5),intensity*2*breath],
  headAngle:intensity*.8*(breath-.5),mood:intensity>0 && blink>=.5?'blink':'neutral'};
}
