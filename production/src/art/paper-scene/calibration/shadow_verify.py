"""Check shadow changes only within a known receiver in the synthetic fixture."""
import json,sys
import numpy as np
from PIL import Image
left=np.asarray(Image.open(sys.argv[1]).convert('RGB'),dtype='int16');right=np.asarray(Image.open(sys.argv[2]).convert('RGB'),dtype='int16')
if left.shape!=(200,400,3) or right.shape!=left.shape:raise SystemExit('SHADOW_FIXTURE_SIZE')
diff=right-left;changed=np.any(diff!=0,axis=2);inside=np.zeros(changed.shape,dtype=bool);inside[30:170,50:350]=True
row={'changedInside':int((changed&inside).sum()),'changedOutside':int((changed&~inside).sum()),'darkenedInside':int(((diff.mean(axis=2)<-1)&inside).sum())}
if row['changedInside']<5 or row['changedOutside']!=0 or row['darkenedInside']<5:raise SystemExit('SHADOW_FIXTURE_FAILED '+json.dumps(row))
print(json.dumps({'status':'PASS_SYNTHETIC_RECEIVER_CONTAINMENT',**row,'scope':'one rectangular receiver, one opaque alpha-test circle; not S05 production or creative approval'}))
