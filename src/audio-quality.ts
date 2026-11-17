/** Source-agnostic 48 kHz 16-bit mono audio diagnostics for M6 review.
 * This is not subjective voice quality or an EBU R128 integrated LUFS meter.
 * No rewrite of the PCM, timestamps or accepted Studio mix occurs.
 */
import {pcmFromWav,SAMPLE_RATE,SAMPLES_PER_FRAME} from './audio.js';
export type AudioQualityIssue={code:'AUDIO_DIGITAL_CLIP'|'AUDIO_LONG_SILENCE';severity:'warning';frame:number;measured:number;expected:string};
export type AudioQualityReport={
  schemaVersion:'audio-quality/1';sampleRate:48000;frames:number;
  peakDbFS:number|null;rmsDbFS:number|null;clippedSamples:number;
  silentFrames:number;maxConsecutiveSilentFrames:number;issues:AudioQualityIssue[];
  limits:string[];
};
export function analyzeAudioWav(wav:Buffer):AudioQualityReport{
  const samples=pcmFromWav(wav);
  if(samples.length===0||samples.length%(SAMPLES_PER_FRAME*2)!==0)
    throw Error('AUDIO_QUALITY_FRAME_ALIGNMENT');
  const frames=samples.length/(SAMPLES_PER_FRAME*2);
  let max=0,total=0,clipped=0,silent=0,longest=0,consecutive=0;
  const issues:AudioQualityIssue[]=[];
  for(let f=0;f<frames;f++){
    let energy=0;
    for(let n=0;n<SAMPLES_PER_FRAME;n++){
      const sample=samples.readInt16LE((f*SAMPLES_PER_FRAME+n)*2);
      const abs=Math.abs(sample);
      max=Math.max(max,abs);total+=sample*sample;energy+=sample*sample;
      if(abs>=32767)clipped++;
    }
    const rms=Math.sqrt(energy/SAMPLES_PER_FRAME);
    if(rms<32.768){
      silent++;consecutive++;
      longest=Math.max(longest,consecutive);
    }else{
      if(consecutive>=24)issues.push({code:'AUDIO_LONG_SILENCE',severity:'warning',
        frame:f-consecutive,measured:consecutive,expected:'investigate gaps >=24 frames'});
      consecutive=0;
    }
  }
  if(consecutive>=24)issues.push({code:'AUDIO_LONG_SILENCE',severity:'warning',
    frame:frames-consecutive,measured:consecutive,expected:'investigate gaps >=24 frames'});
  if(clipped>0)issues.push({code:'AUDIO_DIGITAL_CLIP',severity:'warning',
    frame:0,measured:clipped,expected:'0 saturated PCM samples; audit gain staging'});
  const db=(value:number)=>value===0?null:20*Math.log10(value/32768);
  return {schemaVersion:'audio-quality/1',sampleRate:SAMPLE_RATE,frames,
    peakDbFS:db(max),rmsDbFS:db(Math.sqrt(total/(frames*SAMPLES_PER_FRAME))),
    clippedSamples:clipped,silentFrames:silent,maxConsecutiveSilentFrames:longest,
    issues,limits:['Peak and frame energy are PCM diagnostics, not integrated LUFS or true peak',
      'Digital sample clipping and long silence are warnings requiring review, not automatic artistic scores',
      'eSpeak remains draft voice; analysis cannot certify naturalness or phoneme alignment']};
}
