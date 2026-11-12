"""Verify every decoded picture and PCM placement of an assembled Q2 sequence.
Expected: all1152 decoded frame hashes match selected clips in order; PCM timeline
matches exact shot offsets; encoded AAC transport lag <=2000 samples (one24fps
frame). AAC error is measured, not treated as a listening/quality score.
"""
from pathlib import Path
import hashlib,json,subprocess,sys,wave
import numpy as np
from assemble import scene_pcm,ROOT,FRAMES,RATE,FPS


def frame_hashes(file):
    output=subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(file),'-map','0:v:0','-f','framemd5','-'],text=True)
    return [line.rsplit(',',1)[1].strip() for line in output.splitlines() if line and not line.startswith('#')]


out=Path(sys.argv[1]);result=json.loads((out/'result.json').read_text())
expected=[];pcm=bytearray(result['frames']*RATE//FPS*4)
for item in result['timeline']:
    take=Path(item['take']);shot=item['shot']
    expected.extend(frame_hashes(take/'delivery.mp4'))
    if shot=='S01':
        e=json.loads((take/'inputs.json').read_text())['edit']
        voice=ROOT/('artifacts/Q2/edit-R1/voice' if e.get('voiceTake')=='R1' else 'artifacts/Q1/draft-3/voice')/'scene.wav'
        segment=scene_pcm(voice,FRAMES[shot]);offset=item['startFrame']*RATE//FPS*4;pcm[offset:offset+len(segment)]=segment
actual=frame_hashes(out/'delivery.mp4')
if actual!=expected or len(actual)!=1152:raise RuntimeError('SEQUENCE_FRAME_ORDER_OR_PIXELS')
with wave.open(str(out/'timeline.wav')) as wav:
    got=wav.readframes(wav.getnframes())
if got!=pcm:raise RuntimeError('SEQUENCE_PCM_PLACEMENT')
ref=np.frombuffer(pcm,dtype='<i2').reshape(-1,2).astype(float)/32768
encoded=subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(out/'delivery.mp4'),'-map','0:a:0','-f','f32le','-acodec','pcm_f32le','-'])
decoded=np.frombuffer(encoded,dtype='<f4').reshape(-1,2)
nonzero=np.flatnonzero(np.abs(ref[:,0])>.0001)
if not len(nonzero):raise RuntimeError('VOICE_SILENT')
start=max(0,int(nonzero[0])-400);end=min(len(ref),int(nonzero[-1])+401);pad=2000
lo=max(0,start-pad);hi=min(len(decoded),end+pad)
x=decoded[lo:hi,0];y=ref[start:end,0];size=1<<(len(x)+len(y)-2).bit_length()
correlation=np.fft.irfft(np.fft.rfft(x,size)*np.fft.rfft(y[::-1],size),size)[:len(x)+len(y)-1]
lag=int(np.argmax(correlation))-(len(y)-1)+lo-start
if abs(lag)>2000:raise RuntimeError('AUDIO_TRANSPORT_SYNC')
error=float(np.sqrt(np.mean((decoded[start+lag:end+lag,0]-y)**2)))
report={'status':'PASS_TECHNICAL','decodedFramesCompared':len(actual),'allFramePixelsExact':True,'pcmPlacementExact':True,'aacLagSamples':lag,'aacLagFrames':lag/2000,'aacRMSError':error,'deliverySha256':hashlib.sha256((out/'delivery.mp4').read_bytes()).hexdigest(),'scope':'Decode/order/transport only. No perception, loudness or artistic approval.'}
(out/'verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'output':str(out),**report}))
