/** Fixed authored S03 reach/lift/place clip; no new retime or general prop API. */
import { benchmarkFrame } from '../scene/benchmark.js';
import type { ArtPack, SceneFrame } from '../scene/types.js';
export function sampleCupActions(pack: ArtPack, frame: number): SceneFrame {
  if (!Number.isSafeInteger(frame) || frame < 0 || frame >= 240) throw Error('CUP_ACTION_FRAME_INVALID');
  return benchmarkFrame(pack, 'S03', frame, { polish: true });
}
