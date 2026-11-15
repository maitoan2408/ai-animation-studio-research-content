"""Observe signed RGB changes in fixed image regions, not receiver correctness."""
import json,sys
from pathlib import Path
import numpy as np
from PIL import Image

def measure(off,on,regions):
 a=np.asarray(Image.open(off).convert('RGB'),dtype='int16');b=np.asarray(Image.open(on).convert('RGB'),dtype='int16')
 if a.shape!=(360,640,3) or b.shape!=a.shape:raise ValueError('SHADOW_REGION_SIZE')
 out={}
 for name,box in regions.items():
  if len(box)!=4 or not(0<=box[0]<box[2]<=640 and 0<=box[1]<box[3]<=360):raise ValueError('SHADOW_REGION_BOX')
  x0,y0,x1,y1=box;d=(b[y0:y1,x0:x1]-a[y0:y1,x0:x1]).mean(axis=2)
  out[name]={'box':box,'darkerPixels':int((d < -2).sum()),'brighterPixels':int((d > 2).sum()),'unchangedPixels':int((d==0).sum()),'meanRgbDelta':float(d.mean())}
 return {'status':'OBSERVATION_ONLY','regions':out,'scope':'signed 8-bit RGB on/off in fixed crops; no proof that shadow belongs to intended receiver, contact, color or art'}
if __name__=='__main__':
 if len(sys.argv)!=5:raise SystemExit('usage: shadow_regions.py OFF ON REGIONS_JSON OUTPUT_JSON')
 r=measure(sys.argv[1],sys.argv[2],json.loads(Path(sys.argv[3]).read_text()));Path(sys.argv[4]).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
