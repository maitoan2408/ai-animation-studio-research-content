/** Which drawing a hand shows after it lets go of a prop. With an art pack
 * that has a `<model>/hand-half` (relaxed) drawing, the hand goes from grip to
 * relaxed and stays relaxed, matching the default resting hand of the rig.
 * Packs without that drawing keep the immediate open hand. `halfOpenFrames`
 * still sets the pace of the turn in `releasedHandAngle`. */
import type {ArtPack} from '../scene/types.js';
export type ReleasedHand='half'|'open';
export const halfOpenFrames=(settleFrames=24)=>Math.max(2,Math.round(settleFrames/8));
export function releasedHandState(pack:ArtPack,model:string,framesSinceRelease:number,
 _settleFrames=24):ReleasedHand{
 if(!Number.isSafeInteger(framesSinceRelease)||framesSinceRelease<0)throw Error('HAND_RELEASE_FRAME');
 // With the relaxed drawing the hand opens to it and stays relaxed at rest
 // (a fully spread hand at rest reads as unnatural); otherwise open.
 return relaxedHand(pack,model);
}
/** The drawing a free, resting hand shows: relaxed when the pack has one. */
export const relaxedHand=(pack:ArtPack,model:string):ReleasedHand=>
 pack.assets.some(a=>a.id===model+'/hand-half')?'half':'open';
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
