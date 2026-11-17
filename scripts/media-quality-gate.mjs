/** Reusable, source-agnostic MP4 quality gate for all current renderers.
 * Verifies stream profile, full decode, frozen frame count/duration/audio and
 * exact output digest. Full-black intervals are logged as review warnings,
 * never mistaken for a universal artistic failure.
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

const sha=(buf)=>createHash('sha256').update(buf).digest('hex');
const command=(name,args)=>{
 const v=spawnSync(name,args,{encoding:'utf8',maxBuffer:32*1024*1024});
 if(v.error||v.status!==0)throw Error('FILM_GATE_EXEC_FAILED '+name+' '+String(v.stderr||v.error));
 return v.stdout+'\n'+v.stderr;
};
export async function inspectVideo(file,{frames,voice=false,fps=24,width=1920,height=1080}={}){
 if(!file||!Number.isSafeInteger(frames)||frames<=0||fps!==24||
    !Number.isSafeInteger(width)||width<=0||!Number.isSafeInteger(height)||height<=0)
  throw Error('FILM_GATE_PROFILE_INVALID');
 const media=JSON.parse(command('ffprobe',['-v','error','-count_frames',
  '-show_streams','-show_format','-of','json',file]).trim());
 const stream=media.streams.find(x=>x.codec_type==='video');
 const audio=media.streams.filter(x=>x.codec_type==='audio');
 if(!stream||stream.width!==width||stream.height!==height||
    stream.avg_frame_rate!=='24/1'||Number(stream.nb_read_frames)!==frames)
  throw Error('FILM_GATE_VIDEO_PROFILE');
 if(audio.length!==(voice?1:0)||
    (voice&&(audio[0].sample_rate!=='48000'||!Number.isSafeInteger(Number(audio[0].sample_rate)))))
  throw Error('FILM_GATE_AUDIO_PROFILE');
 const duration=Number(media.format.duration);
 if(!Number.isFinite(duration)||Math.abs(duration-frames/fps)>1/fps+.01)
  throw Error('FILM_GATE_DURATION');
 // Every decoded frame and every audio sample must be readable: NOT merely
 // ffprobe success, existence, screenshot hash or MPEG header presence.
 const diagnostic=command('ffmpeg',['-hide_banner','-nostats','-xerror','-nostdin',
   '-threads','1','-i',file,'-vf','blackdetect=d=0.08:pix_th=0.98',
   '-threads','1','-f','null','-']);
 const warnings=diagnostic.split('\n')
  .filter(x=>x.includes('black_start:'))
  .map(x=>({code:'POSSIBLE_BLACK_INTERVAL',detail:x.trim().slice(0,280)}));
 return {schemaVersion:'film-media-gate/1',
  status:'PASS_TECHNICAL_ONLY',source:path.basename(file),
  sha256:sha(await readFile(file)),frames,fps,width,height,voice,duration,
  decoder:'ffmpeg -xerror full audiovisual decode',warnings,
  limits:['Does not evaluate character identity, emotion, style or beauty',
    'Black frames may be intentional scene transitions; logged, not auto-rejected',
    'No claim of lip-sync or natural synthesized voice quality']};
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname;
if(direct){
 const [file,number,mode]=process.argv.slice(2);
 if(mode!=='silent'&&mode!=='voiced')throw Error('FILM_GATE_MODE_INVALID');
 const report=await inspectVideo(file,{frames:Number(number),voice:mode==='voiced'});
 await writeFile(file+'.film-quality.json',JSON.stringify(report,null,2)+'\n');
 console.log('FILM_MEDIA_GATE_PASS '+JSON.stringify(report));
}
