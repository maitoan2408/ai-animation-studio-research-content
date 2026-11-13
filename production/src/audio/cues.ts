/** Editable cue proposal from model-predicted IPA spans. This is NOT a verified
 * alignment or an emotion recognizer. Manual corrections can replace these cues. */
import type {Cue} from '../scene/benchmark.js';
export function phonemeCues(timings:{phoneme:string;start:number;end:number}[],startFrame=48,fps=24):Cue[]{
 let previous:Cue['mouth']='rest';
 return timings.filter(t=>t.end>t.start).map(t=>{
  const p=t.phoneme;
  const mouth:Cue['mouth']=/[ˈˌː]/u.test(p)?previous:/[mpb]/u.test(p)?'M':/[fv]/u.test(p)?'F':/[uʊoɔw]/u.test(p)?'O':/[aɑæʌ]/u.test(p)?'A':/[ieɛɪəɜ]/u.test(p)?'E':/\s|[.,!?]/u.test(p)?'rest':'E';
  previous=mouth;return {start:startFrame+t.start*fps,end:startFrame+t.end*fps,mouth};
 });
}
