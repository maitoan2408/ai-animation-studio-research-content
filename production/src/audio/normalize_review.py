"""Explicit review-delivery gain stage, preserving pictures and source PCM.
Target locked in Q0: -16 LUFS +/-1, true peak <=-1dBTP. Measure PCM, choose a
single linear gain with0.3dB peak reserve, encode once to AAC, then remeasure
actual delivery. If a limiter would be needed, fail clearly instead of silently
changing dynamics. These sparse benchmark stems are not the Q5 pilot sound mix.
"""
from pathlib import Path
import hashlib,json,math,subprocess,sys,uuid

ROOT=Path(__file__).resolve().parents[2]
TARGET_I,TARGET_TP=-16.,-1.


def digest(file):return hashlib.sha256(file.read_bytes()).hexdigest()


def measure(file):
    result=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(file),'-vn','-af','loudnorm=I=-16:TP=-1:LRA=7:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
    start=result.stderr.rfind('{');end=result.stderr.rfind('}')
    data=json.loads(result.stderr[start:end+1])
    return {k:float(data[k]) for k in ['input_i','input_tp','input_lra','input_thresh']},result.stderr


def proposed_gain(integrated,peak):
    if not math.isfinite(integrated) or not math.isfinite(peak):raise ValueError('NONFINITE_OR_SILENT_AUDIO')
    gain=min(TARGET_I-integrated,TARGET_TP-.3-peak)
    if abs(integrated+gain-TARGET_I)>1:raise ValueError('LIMITER_REQUIRED_NOT_AUTOMATICALLY_APPLIED')
    return gain


def normalize(directory):
    source=Path(directory).resolve();result=json.loads((source/'result.json').read_text());verified=json.loads((source/'verification.json').read_text())
    if verified.get('status')!='PASS_TECHNICAL':raise ValueError('SEQUENCE_NOT_VERIFIED')
    if digest(source/'timeline.wav')!=result['pcmSha256'] or digest(source/'picture.mp4')!=result['pictureSha256']:raise ValueError('NORMALIZE_INPUT_HASH')
    output=ROOT/'out/normalized'/f'{result["revision"]}-{uuid.uuid4().hex}';output.mkdir(parents=True)
    (output/'request.json').write_text(json.dumps({'source':str(source),'targetLUFS':TARGET_I,'toleranceLU':1,'maxTruePeak':TARGET_TP,'status':'RUNNING'},indent=2))
    before,log=measure(source/'timeline.wav');(output/'input-measure.log').write_text(log);gain=proposed_gain(before['input_i'],before['input_tp'])
    argv=['ffmpeg','-v','error','-nostdin','-i',str(source/'picture.mp4'),'-i',str(source/'timeline.wav'),'-map','0:v','-map','1:a','-c:v','copy','-af',f'volume={gain:.8f}dB','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t',str(result['durationSeconds']),'-movflags','+faststart',str(output/'delivery.mp4')]
    (output/'command.json').write_text(json.dumps(argv,indent=2));subprocess.run(argv,check=True)
    after,log=measure(output/'delivery.mp4');(output/'output-measure.log').write_text(log)
    if abs(after['input_i']-TARGET_I)>1 or after['input_tp']>TARGET_TP:raise ValueError('ENCODED_LOUDNESS_OR_TRUEPEAK_FAILED')
    def picture_hash(file):return hashlib.sha256(subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-map','0:v','-c:v','copy','-f','h264','-'])).hexdigest()
    if picture_hash(source/'picture.mp4')!=picture_hash(output/'delivery.mp4'):raise ValueError('PICTURE_CHANGED_DURING_AUDIO_GAIN')
    subprocess.run(['ffmpeg','-v','error','-nostdin','-i',str(output/'delivery.mp4'),'-f','null','-'],check=True)
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(output/'delivery.mp4')]))
    v=next(s for s in probe['streams'] if s['codec_type']=='video');a=next(s for s in probe['streams'] if s['codec_type']=='audio')
    if (v['nb_read_frames'],a['sample_rate'],a['channels'],a['duration'])!=('1152','48000',2,'48.000000'):raise ValueError('NORMALIZED_PROFILE')
    report={'status':'PASS_TECHNICAL','revision':result['revision'],'gainDb':gain,'inputPCM':before,'encodedDelivery':after,'sourcePCMSha256':result['pcmSha256'],'sourcePictureSha256':result['pictureSha256'],'deliverySha256':digest(output/'delivery.mp4'),'pictureStreamUnchanged':True,'probe':probe,'scope':'Sparse benchmark voice gain only; listening, perceptual cues and full pilot stems remain unapproved.'}
    (output/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'output':str(output),'status':report['status'],'gainDb':gain,'encodedDelivery':after}))


if __name__=='__main__':normalize(sys.argv[1])
