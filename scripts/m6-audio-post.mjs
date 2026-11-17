/** Optional M6 voiced-film mastering. Preserves video stream; never rewrites source. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, rename, access, unlink } from 'node:fs/promises';
import path from 'node:path';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
function command(bin,args){
  const out = spawnSync(bin,args,{encoding:'utf8',maxBuffer:32*1024*1024});
  if(out.error || out.status!==0) throw Error('M6_AUDIO_CMD_FAILED '+bin+' '+(out.stderr||out.error));
  return out.stdout+'\n'+out.stderr;
}
function probe(file){return JSON.parse(command('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',file]).trim());}
function loudnormMeasure(file,target=-16,tp=-1.5,lra=8){
  const logs=command('ffmpeg',['-hide_banner','-nostats','-nostdin','-i',file,'-vn','-af',`loudnorm=I=${target}:TP=${tp}:LRA=${lra}:print_format=json`,'-f','null','-']);
  const start=logs.lastIndexOf('{\n');
  const end=logs.indexOf('}',start);
  if(start<0||end<0)throw Error('M6_AUDIO_LOUDNESS_MEASURE_MISSING');
  const j=JSON.parse(logs.slice(start,end+1));
  for(const k of ['input_i','input_tp','input_lra','input_thresh','target_offset']){
    if(!Number.isFinite(Number(j[k])))throw Error('M6_AUDIO_MEASURE_INVALID '+k);
  }
  return j;
}
function finalLoudness(file){
  const s=command('ffmpeg',['-hide_banner','-nostats','-nostdin','-i',file,'-filter_complex','ebur128=peak=true','-f','null','-']);
  const summary=s.lastIndexOf('Summary:');
  if(summary<0)throw Error('M6_AUDIO_EBUR128_MISSING');
  const text=s.slice(summary);
  const i=/Integrated loudness:[\s\S]*?I:\s*(-?[\d.]+) LUFS/.exec(text);
  const tp=/True peak:[\s\S]*?Peak:\s*(-?[\d.]+) dBFS/.exec(text);
  if(!i||!tp)throw Error('M6_AUDIO_EBUR128_PARSE');
  return {integratedLufs:Number(i[1]),truePeakDbtp:Number(tp[1])};
}
function streamhash(file){
  const s=command('ffmpeg',['-v','error','-nostdin','-i',file,'-map','0:v:0','-c','copy','-f','streamhash','-hash','SHA256','-']);
  const m=/SHA256=([a-fA-F0-9]{64})/.exec(s);
  if(!m)throw Error('M6_VIDEO_STREAM_HASH_MISSING');
  return m[1].toLowerCase();
}
async function main(source,destination){
  if(!source||!destination||!source.endsWith('.mp4')||!destination.endsWith('.mp4')||path.resolve(source)===path.resolve(destination))throw Error('M6_AUDIO_PATH_INVALID');
  try{await access(destination);throw Error('M6_AUDIO_OUTPUT_EXISTS');}catch(e){if(e?.code!=='ENOENT')throw e;}
  const p=probe(source),v=p.streams.find(x=>x.codec_type==='video'),a=p.streams.find(x=>x.codec_type==='audio');
  if(!v||!a||a.sample_rate!=='48000')throw Error('M6_AUDIO_INPUT_PROFILE');
  const input=finalLoudness(source),measurement=loudnormMeasure(source);
  const {input_i,input_tp,input_lra,input_thresh,target_offset}=measurement;
  const filter=`loudnorm=I=-16:TP=-1.5:LRA=8:measured_I=${input_i}:measured_TP=${input_tp}:measured_LRA=${input_lra}:measured_thresh=${input_thresh}:offset=${target_offset}:linear=false`;
  const temp=destination+'.tmp.mp4';
  try{
    command('ffmpeg',['-v','error','-nostdin','-y','-i',source,'-map','0:v:0','-map','0:a:0','-c:v','copy','-af',filter,'-ar','48000','-c:a','aac','-b:a','192k','-movflags','+faststart','-t',String(Number(p.format.duration).toFixed(6)),temp]);
    const next=probe(temp),nv=next.streams.find(x=>x.codec_type==='video'),na=next.streams.find(x=>x.codec_type==='audio');
    if(nv.width!==v.width||nv.height!==v.height||nv.avg_frame_rate!==v.avg_frame_rate||nv.nb_read_frames!==v.nb_read_frames||na.sample_rate!=='48000'||Math.abs(Number(next.format.duration)-Number(p.format.duration))>0.08)throw Error('M6_AUDIO_MEDIA_PROFILE_CHANGED');
    const videoBefore=streamhash(source),videoAfter=streamhash(temp);
    if(videoBefore!==videoAfter)throw Error('M6_AUDIO_VIDEO_BITSTREAM_CHANGED');
    command('ffmpeg',['-v','error','-xerror','-nostdin','-threads','1','-i',temp,'-f','null','-']);
    const output=finalLoudness(temp);
    if(Math.abs(output.integratedLufs+16)>.5||output.truePeakDbtp>-1.0)throw Error('M6_AUDIO_TARGET_NOT_MET '+JSON.stringify(output));
    const sourceSha=sha(await readFile(source)),outSha=sha(await readFile(temp));
    const report={schemaVersion:'m6-audio-quality/1',sourceSha256:sourceSha,outputSha256:outSha,videoBitstreamSha256:videoAfter,source:input,output,target:{integratedLufs:-16,requestedTruePeakDbtp:-1.5,maximumTruePeakDbtp:-1.0},frames:Number(v.nb_read_frames),resolution:[v.width,v.height],fps:v.avg_frame_rate,sampleRate:48000,fullDecode:'PASS',limitations:['Loudness normalization does not make draft eSpeak voice natural','The audio track is AAC reencoded; original MP4 remains unchanged','Human listening and artistic approval are separate']};
    await rename(temp,destination);
    await writeFile(destination+'.quality.json',JSON.stringify(report,null,2)+'\n');
    console.log('M6_AUDIO_QUALITY_PASS '+JSON.stringify({sourceSha,outputSha:outSha,input,output}));
  }finally{await unlink(temp).catch(()=>{});}
}
await main(process.argv[2],process.argv[3]);
