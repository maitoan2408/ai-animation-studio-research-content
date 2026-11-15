/** Two explicit development clips. They do not replace the authored S05 hero. */
import type { ActorPose } from '../scene/types.js';
import { sampleScalarClip } from './clip.js';
export type ActionSpec = Readonly<{ action: 'turn-head' | 'wave'; duration: number; intensity: number; onTwos: boolean }>;
/** End frame is inclusive; a return phase brings the rig to its start pose.
 * Fixed floor and ankle targets are part of this fixture's contact contract. */
export function sampleAction(spec: ActionSpec, frame: number): ActorPose {
  if (!spec || typeof spec !== 'object' || Object.keys(spec).sort().join(',') !== 'action,duration,intensity,onTwos' ||
      !['turn-head', 'wave'].includes(spec.action) || !Number.isSafeInteger(spec.duration) || spec.duration < 24 || spec.duration > 240 || spec.duration % 4 !== 0 ||
      !Number.isFinite(spec.intensity) || spec.intensity < 0 || spec.intensity > 1 || typeof spec.onTwos !== 'boolean') throw Error('ACTION_SPEC_INVALID');
  if (!Number.isSafeInteger(frame) || frame < 0 || frame > spec.duration) throw Error('ACTION_FRAME_INVALID');
  const f = spec.onTwos && frame < spec.duration ? frame - frame % 2 : frame;
  const half = spec.duration / 2, local = f <= half ? f : spec.duration - f;
  const envelope = sampleScalarClip({ duration: half, start: 0, end: 1, anticipation: .2, actionEnd: .75, anticipationAmount: spec.action === 'wave' ? .03 : .08, overshootAmount: .06 }, local).value * spec.intensity;
  const pose: ActorPose = { id: 'mai', character: 'mai', x: 760, floor: 860, facing: 1, view: 'quarter', leftAnkle: [-35,-29], rightAnkle: [48,-29] };
  if (spec.action === 'turn-head') pose.headAngle = 18 * envelope;
  else { pose.rightElbowBend = -1; pose.rightWrist = [96 + 44 * envelope, -220 - 250 * envelope]; pose.rightHandAngle = 180 - 180 * envelope; }
  return pose;
}
