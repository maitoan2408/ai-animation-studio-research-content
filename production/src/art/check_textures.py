"""Verify generated textures against their SVG source and transparency contract.
Reads pixels/metadata only; does not rewrite images or accept a missing texture.
Pillow is used in the existing research interpreter, not the production app.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
PACK=ROOT/'assets/lantern-v1'
OUT=ROOT/'out/art-q1'
pack=json.loads((PACK/'manifest.json').read_text())
textures=json.loads((OUT/'textures.json').read_text())
source={a['id']:a for a in pack['assets']}
checks=[]
assert len(textures['textures'])==len(source),'Missing texture record'
for t in textures['textures']:
 a=source[t['id']];p=OUT/t['file']
 assert t['sourceSha256']==a['sha256'],f'Stale raster: {a["id"]}'
 assert hashlib.sha256(p.read_bytes()).hexdigest()==t['sha256']
 with Image.open(p) as im:
  assert im.size==(t['width'],t['height'])
  alpha=im.convert('RGBA').getchannel('A');low,high=alpha.getextrema()
  assert high>0,f'Blank texture: {a["id"]}'
  if a['category'] not in ['background']:
   assert low==0 and high==255,f'Alpha contract failed: {a["id"]}'
  checks.append({'id':a['id'],'size':im.size,'alpha_extrema':[low,high],'status':'PASS'})
report={'status':'PASS','checks':checks,'scope':'Source hashes, PNG dimensions, nonblank and transparent/opaque alpha. Edge/color visual review is separate.'}
(OUT/'texture-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'status':'PASS','textures':len(checks)}))
