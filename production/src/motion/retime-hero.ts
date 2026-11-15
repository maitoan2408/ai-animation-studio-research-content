/** Indexed replay of the fixed baked S05 candidate. Audio and physics are not retimed. */
import {heroFrame} from './hero.js';
import type {ArtPack,SceneFrame} from '../scene/types.js';
import type {HeroInput} from '../physics/hero.js';
import type {BakeEnvelope} from '../physics/bake.js';
const SOURCE_FRAMES=192;
export function sourceFrameFor(duration:number,frame:number):number {
 if(!Number.isSafeInteger(duration)||duration<144||duration>288)throw Error('RETIME_DURATION_INVALID');
 if(!Number.isSafeInteger(frame)||frame<0||frame>=duration)throw Error('RETIME_FRAME_INVALID');
 return Math.floor(frame*(SOURCE_FRAMES-1)/(duration-1));
}
/** Source intervals are integer half-open ranges; boundary is the first output
 * frame whose selected source index enters the interval. */
export function remapSourceInterval(duration:number,start:number,end:number):{start:number;end:number} {
 sourceFrameFor(duration,0);
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end>192||start>=end)throw Error('RETIME_INTERVAL_INVALID');
 const boundary=(f:number)=>f===192?duration:Math.ceil(f*(duration-1)/(SOURCE_FRAMES-1));
 const result={start:boundary(start),end:boundary(end)};
 if(result.start===result.end)throw Error('RETIME_INTERVAL_DROPPED');
 return result;
}
export function retimedHeroFrame(pack:ArtPack,input:HeroInput,bake:BakeEnvelope,duration:number,frame:number):SceneFrame {
 return heroFrame(pack,input,bake,sourceFrameFor(duration,frame));
}
