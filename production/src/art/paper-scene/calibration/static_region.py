"""Compare a fixed crop of every encoded source PNG to frame 0.

A nonzero result can be motion, occlusion or flicker; investigation is required.
Zero only proves the selected crop, not the entire image or motion.
"""
import json,sys
from pathlib import Path
import numpy as np
from PIL import Image
folder=Path(sys.argv[1]);box=tuple(map(int,sys.argv[2:6]));files=sorted((folder/'frames').glob('*.png'))
if len(files)!=192 or len(box)!=4 or not(0<=box[0]<box[2]<=640 and 0<=box[1]<box[3]<=360):raise SystemExit('STATIC_REGION_INPUT')
base=np.asarray(Image.open(files[0]).convert('RGB').crop(box));max_delta=0;changed_frames=0;changed_pixels=0
for file in files[1:]:
 a=np.asarray(Image.open(file).convert('RGB').crop(box));d=np.abs(a.astype('int16')-base.astype('int16'))
 changed=int(np.any(d,axis=2).sum());changed_frames+=changed>0;changed_pixels+=changed;max_delta=max(max_delta,int(d.max()))
print(json.dumps({'status':'OBSERVATION_ONLY','box':box,'frames':192,'changedFrames':changed_frames,'totalChangedPixels':changed_pixels,'maxChannelDelta':max_delta,'scope':'fixed crop vs frame 0; change can be movement, occlusion or flicker, equality does not validate full shot'}))
