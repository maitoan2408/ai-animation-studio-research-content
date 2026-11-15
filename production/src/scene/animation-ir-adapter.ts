import type { SceneFrame } from './types.js';

/** Minimal structural contract for normalized IR. No root app dependency. */
export type StageShotTimeline = {
  schemaVersion: 'animation-ir/1';
  stage: { width: 1920; height: 1080; yAxis: 'down'; units: 'stage-px' };
  timeline: { fps: 24; totalFrames: number };
  shots: Array<{
    id: string;
    interval: { startFrame: number; endFrame: number };
    camera: { kind: 'static' | 'pan' };
  }>;
};

/**
 * Workbench data bridge: camera + timeline only.
 * Does not invent art, actor sprites, or physics contacts.
 */
export function toProductionFrame(value:StageShotTimeline,index:number):{
  shotId:string;localFrame:number;frame:SceneFrame;
} {
  if(value.schemaVersion!=='animation-ir/1' || value.stage.width!==1920 ||
     value.stage.height!==1080 || value.stage.yAxis!=='down' ||
     value.stage.units!=='stage-px' || value.timeline.fps!==24)
    throw new Error('IR_UNSUPPORTED_STAGE');
  if(!Number.isSafeInteger(index)||index<0||index>=value.timeline.totalFrames)
    throw new RangeError('IR_FRAME_OUT_OF_RANGE');
  let next=0;
  for(const s of value.shots) {
    if(s.interval.startFrame!==next||s.interval.endFrame<=next ||
       !Number.isSafeInteger(s.interval.endFrame))
      throw new Error('IR_INVALID_SHOT_INTERVAL');
    next=s.interval.endFrame;
  }
  if(next!==value.timeline.totalFrames)
    throw new Error('IR_TOTAL_FRAMES_MISMATCH');
  const shot=value.shots.find(s=>index>=s.interval.startFrame&&index<s.interval.endFrame);
  if(!shot)throw new Error('IR_SHOT_NOT_FOUND');
  const localFrame=index-shot.interval.startFrame;
  const length=shot.interval.endFrame-shot.interval.startFrame;
  const progress=localFrame/Math.max(1,length-1);
  const x=shot.camera.kind==='pan'?progress*105:0;
  return {shotId:shot.id,localFrame,frame:{
    sprites:[],markers:[],camera:{x,y:0,zoom:1},
  }};
}
