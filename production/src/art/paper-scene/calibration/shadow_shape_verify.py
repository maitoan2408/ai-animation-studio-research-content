"""Check a known alpha-test ring casts a ring (including a clear central hole)."""
import json,sys
import numpy as np
from PIL import Image
left=np.asarray(Image.open(sys.argv[1]).convert('RGB'),dtype='int16');right=np.asarray(Image.open(sys.argv[2]).convert('RGB'),dtype='int16')
if left.shape!=(200,400,3) or right.shape!=left.shape:raise SystemExit('SHADOW_SHAPE_SIZE')
d=(left-right).mean(axis=2)
result={'ringMean':float(d[106:115,152:159].mean()),'holeMax':float(d[107:114,169:176].max()),'outsideMax':float(d[20:40,370:390].max())}
if result['ringMean']<5 or result['holeMax']>1 or result['outsideMax']>1:raise SystemExit('SHADOW_ALPHA_HOLE_FAILED '+json.dumps(result))
print(json.dumps({'status':'PASS_SYNTHETIC_ALPHA_HOLE',**result,'scope':'controlled ring and receiver at fixed fixture coordinates; not S05 shadow quality'}))
