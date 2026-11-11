from pathlib import Path
import json
import subprocess
import numpy as np

root=Path(__file__).resolve().parents[1]
results=[]
for backend in ['hyperframes','remotion']:
    suffix='-strict' if backend=='hyperframes' else ''
    paths=[root/f'out/{backend}-study-w{w}{suffix}.mp4' for w in [1,2]]
    frames=[]
    for p in paths:
        raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map','0:v:0','-f','rawvideo','-pix_fmt','rgb24','-'])
        frames.append(np.frombuffer(raw,dtype=np.uint8).reshape((-1,360,640,3)))
    count_ok=len(frames[0])==len(frames[1])==240
    diff=np.abs(frames[0].astype(np.int16)-frames[1].astype(np.int16))
    means=diff.mean(axis=(1,2,3))
    fractions=(diff.max(axis=3)>16).mean(axis=(1,2))
    # Predefined decoded-image threshold; encoding paths may differ with worker count.
    passed=bool(count_ok and np.all(means<=1) and np.all(fractions<=.001))
    results.append({'backend':backend,'frames':len(frames[0]),'identical_frames':int((means==0).sum()),
      'max_frame_mean_channel_error':float(means.max()),'max_pixel_fraction_above_16':float(fractions.max()),
      'thresholds':{'frame_mean_channel_error_lte':1,'pixel_fraction_above_16_lte':.001},'pass':passed})
(root/'evidence/concurrency-qc.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
if any(not x['pass'] for x in results):raise SystemExit(1)
