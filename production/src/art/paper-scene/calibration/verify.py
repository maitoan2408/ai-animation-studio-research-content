"""Verify neutral four-swatch image pairs; not a whole-scene parity gate."""
import json,sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB')
if im.size!=(400,200):raise SystemExit('CALIBRATION_DIMENSIONS')
pairs=[]
for y in (25,75,125,175):
 a=im.getpixel((100,y));b=im.getpixel((300,y));delta=max(abs(x-z) for x,z in zip(a,b));pairs.append({'basic':a,'lambert':b,'maxChannelDifference':delta})
if max(r['maxChannelDifference'] for r in pairs)>1:raise SystemExit('CALIBRATION_PARITY '+json.dumps(pairs))
print(json.dumps({'status':'PASS_BOUNDED_SWATCHES','pairs':pairs,'scope':'Only opaque no-texture plane with ambient pi; not F2 whole-scene parity'}))
