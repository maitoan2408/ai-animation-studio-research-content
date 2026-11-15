/** Explicit bounded reuse of the authored S02 walking fixture; no retime claim. */
import { walkPose } from '../scene/benchmark.js';
import type { ActorPose } from '../scene/types.js';
export function sampleWalk(frame: number): ActorPose {
  if (!Number.isSafeInteger(frame) || frame < 0 || frame >= 192) throw Error('WALK_FRAME_INVALID');
  return walkPose(frame);
}
