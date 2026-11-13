"""Create the shared Q1 spoken fixture using a pinned, local CPU voice model.

Stores native PCM, frame-aligned 48 kHz audio, predicted phoneme spans and source
hashes. Timing is a model prediction, not an independent forced alignment. The
result can be edited as cues in subsequent stages. No API or implicit download.
"""
from pathlib import Path
from dataclasses import asdict
import hashlib
import json
import subprocess
import time
import argparse

import numpy as np
import onnxruntime as ort
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT=Path(__file__).resolve().parents[2]
MODEL=ROOT/'.cache/voice'
REQUEST={'id':'S01','text':'I thought we had lost the light.','voice':'af_heart',
         'speed':1.0,'language':'en-us','model':'kokoro-v1.0.onnx',
         'modelSha256':'beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a',
         'fps':24,'speechStartFrame':48,'slotFrames':192}

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--request',type=Path)
 args=parser.parse_args()
 if args.request:
  patch=json.loads(args.request.read_text())
  if not isinstance(patch,dict) or set(patch)-{'text','speed','voice'}:raise ValueError('UNSUPPORTED_VOICE_PATCH')
  REQUEST.update(patch)
 if not isinstance(REQUEST['text'],str) or not 1<=len(REQUEST['text'])<=500:raise ValueError('INVALID_TEXT')
 if not isinstance(REQUEST['speed'],(int,float)) or not .5<=REQUEST['speed']<=2:raise ValueError('INVALID_SPEED')
 identity=hashlib.sha256(json.dumps(REQUEST,sort_keys=True).encode()).hexdigest()
 out=ROOT/'out/audio'/identity[:16];out.mkdir(parents=True,exist_ok=True)
 model=MODEL/REQUEST['model'];voices=MODEL/'voices-v1.0.bin'
 if hashlib.sha256(model.read_bytes()).hexdigest()!=REQUEST['modelSha256']:
  raise RuntimeError('MODEL_HASH_MISMATCH')
 if hashlib.sha256(voices.read_bytes()).hexdigest()!='bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d':
  raise RuntimeError('VOICES_HASH_MISMATCH')
 options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1
 session=ort.InferenceSession(str(model),sess_options=options,providers=['CPUExecutionProvider'])
 kokoro=Kokoro.from_session(session,str(voices))
 if not kokoro.has_timings:raise RuntimeError('MODEL_HAS_NO_PHONEME_TIMINGS')
 start=time.monotonic()
 samples,rate,timings=kokoro.create_timed(REQUEST['text'],voice=REQUEST['voice'],speed=REQUEST['speed'],lang=REQUEST['language'])
 elapsed=time.monotonic()-start
 if not len(samples) or not np.isfinite(samples).all():raise RuntimeError('INVALID_AUDIO')
 if len(samples)/rate>4.0:raise RuntimeError('VOICE_OVERFLOWS_LOCKED_SPEECH_BEAT')
 last=0.0
 for t in timings:
  if t.start+1/rate<last or t.end<t.start or t.end>len(samples)/rate+1/rate:
   raise RuntimeError(f'INVALID_TIMING {t}')
  last=t.end
 sf.write(out/'native.wav',samples,rate,subtype='PCM_16')
 subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-i',str(out/'native.wav'),
                 '-ar','48000','-ac','1','-c:a','pcm_s16le',str(out/'speech.wav')],check=True)
 # Full 8-second scene WAV: silence around the locked speech beat, no time stretch.
 subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-i',str(out/'speech.wav'),
                 '-af','adelay=2000,apad=whole_dur=8','-t','8','-ar','48000','-ac','1',
                 '-c:a','pcm_s16le',str(out/'scene.wav')],check=True)
 report={'request':REQUEST,'identity':identity,'timingEvidence':'model-predicted phoneme spans; manual correction remains available',
         'nativeSampleRate':rate,'nativeSamples':len(samples),'speechSeconds':len(samples)/rate,
         'elapsedSeconds':elapsed,'peak':float(np.max(np.abs(samples))),
         'timings':[asdict(t) for t in timings],
         'files':{n:hashlib.sha256((out/n).read_bytes()).hexdigest() for n in ['native.wav','speech.wav','scene.wav']}}
 (out/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'output':str(out),'speechSeconds':report['speechSeconds'],'timings':len(timings),'elapsedSeconds':elapsed}))

if __name__=='__main__':main()
