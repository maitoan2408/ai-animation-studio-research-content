/** Kinematic sit-and-recover spike, not a simulated fall or ground collision. */
import {sampleScalarClip} from './clip.js';
import type {ActorPose} from '../scene/types.js';
export function sampleFallFixture(frame:number):ActorPose {
 if(!Number.isSafeInteger(frame)||frame<0||frame>72)throw Error('FALL_FRAME_INVALID');
 const local=frame<=36?frame:72-frame;
 const t=sampleScalarClip({duration:36,start:0,end:1,anticipation:.2,actionEnd:.8,anticipationAmount:0,overshootAmount:0},local).value;
 return {id:'mai',character:'mai',x:760,floor:860,facing:1,view:'quarter',leftAnkle:[-35,-29],rightAnkle:[48,-29],
  hipOffset:[30*t,145*t],torsoAngle:80*t,headAngle:-10*t,rightWrist:[108,-211],rightHandAngle:180};
}
