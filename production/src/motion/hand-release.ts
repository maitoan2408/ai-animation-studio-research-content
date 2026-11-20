/** Which drawing a hand shows after it lets go of a prop. With an art pack
 * that has a `<model>/hand-half` drawing, the fingers pass through a half-open
 * pose for the first frames after release (about 1/8 of the settle time, at
 * least 2 frames) instead of snapping from closed to open. Packs without that
 * drawing keep the immediate open hand, so their films are unchanged. */
import type {ArtPack} from '../scene/types.js';
export type ReleasedHand='half'|'open';
export const halfOpenFrames=(settleFrames=24)=>Math.max(2,Math.round(settleFrames/8));
export function releasedHandState(pack:ArtPack,model:string,framesSinceRelease:number,
 settleFrames=24):ReleasedHand{
 if(!Number.isSafeInteger(framesSinceRelease)||framesSinceRelease<0)throw Error('HAND_RELEASE_FRAME');
 if(!pack.assets.some(a=>a.id===model+'/hand-half'))return 'open';
 return framesSinceRelease<halfOpenFrames(settleFrames)?'half':'open';
}
/** Hand rotation after release, 0 = held (grip) angle, 180 = hanging open.
 * With the staged release the hand turns down at a constant 180/(half+5)
 * degrees per frame (22.5 deg at the default settle): about 90 deg when it
 * opens, so it never stands upright over the prop, and always under the
 * renderer's 28 deg/frame continuity limit.
 * `settleProgress` (0..1) is the legacy whole-settle easing kept for packs
 * without the half-open drawing. */
export function releasedHandAngle(pack:ArtPack,model:string,framesSinceRelease:number,
 settleFrames:number,settleProgress:number):number{
 if(!pack.assets.some(a=>a.id===model+'/hand-half'))return 180*settleProgress;
 return 180*Math.min(1,(framesSinceRelease+1)/(halfOpenFrames(settleFrames)+5));
}
