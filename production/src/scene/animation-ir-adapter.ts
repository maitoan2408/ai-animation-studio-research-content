import { parseAnimationIR, shotAtFrame, type AnimationIR } from '../../../src/animation-ir.js';
import type { SceneFrame } from './types.js';

/** Contract bridge, not an art renderer. Empty sprites/markers are intentional. */
export function toProductionFrame(value:AnimationIR,index:number):{
  shotId:string;localFrame:number;frame:SceneFrame;
} {
  const ir=parseAnimationIR(value);
  const {shot,localFrame}=shotAtFrame(ir,index);
  const length=shot.interval.endFrame-shot.interval.startFrame;
  const progress=localFrame/Math.max(1,length-1);
  // Legacy 640-wide pan moves 35 units; production 1920-wide stage is x3.
  const x=shot.camera.kind==='pan'?progress*105:0;
  return {shotId:shot.id,localFrame,frame:{
    sprites:[],markers:[],camera:{x,y:0,zoom:1},
  }};
}
