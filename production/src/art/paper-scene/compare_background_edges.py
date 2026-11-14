"""Compare two side materials against same flat frame in a fixed background ROI."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
from verify_comparison import verify

def compare(a,b):
 a,b=Path(a),Path(b); va,vb=verify(a),verify(b)
 ra,rb=json.loads((a/'report.json').read_text()),json.loads((b/'report.json').read_text())
 if ra['inputSha256']!=rb['inputSha256'] or ra['contourSha256']!=rb['contourSha256'] or va['flatSha256']!=vb['flatSha256']:raise ValueError('BACKGROUND_COMPARE_MISMATCH')
 roi=(0,100,500,800)
 with Image.open(a/'flat.png') as flat,Image.open(a/'volume.png') as one,Image.open(b/'volume.png') as two:
  ref=flat.convert('RGB').crop(roi);da=ImageChops.difference(ref,one.convert('RGB').crop(roi));db=ImageChops.difference(ref,two.convert('RGB').crop(roi))
  return {'status':'OBSERVATION_ONLY','roi':roi,'plainSideMeanRgbDifference':ImageStat.Stat(da).mean,
    'texturedSideMeanRgbDifference':ImageStat.Stat(db).mean,'inputSha256':ra['inputSha256'],
    'scope':'Difference to flat reference in one ROI only; no color, shadow or art approval.'}
if __name__=='__main__':
 if len(sys.argv)!=3:raise SystemExit('usage: compare_background_edges.py PLAIN TEXTURED')
 print(json.dumps(compare(*sys.argv[1:])))
