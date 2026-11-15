"""Observe projected opaque pixels below floor; not 3D collision or approval."""
import hashlib,json,sys
from pathlib import Path
from PIL import Image
from alpha_overlap import projection
ROOT=Path(__file__).resolve().parents[2]
def sha(b):return hashlib.sha256(b).hexdigest()
def observe(source):
 raw=source.read_bytes(); data=json.loads(raw); assets={a['id']:a for a in data['pack']['assets']}; entries={e['id']:e for e in data['textures']['textures']}
 if data['shot']!='S05' or len(data['frames'])!=192 or data['edit']['qualityCandidate']!='f3-fall-fixture':raise ValueError('FALL_OBSERVE_SOURCE')
 images={}; hits=[]
 for frame in range(73):
  for sprite in data['frames'][frame]['sprites']:
   if not sprite['id'].startswith('mai.') or sprite['id'].endswith(('.paper-shadow','.contact-shadow','-boot')):continue
   key=sprite['asset'];asset=assets[key];entry=entries[key]
   if key not in images:
    rawtex=(ROOT/'out/art-q1'/entry['file']).read_bytes()
    if sha(rawtex)!=entry['sha256'] or entry['sourceSha256']!=asset['sha256']:raise ValueError('FALL_OBSERVE_TEXTURE')
    import io
    images[key]=Image.open(io.BytesIO(rawtex)).convert('RGBA')
   mask=projection(sprite,asset,images[key],(0,861,1920,1080))
   count=sum(mask.histogram()[128:])
   if count:hits.append({'frame':frame,'sprite':sprite['id'],'pixels':count})
 return {'status':'OBSERVATION_ONLY','sourceSha256':sha(raw),'frames':73,'alphaThreshold':128,'groundStageY':860,'belowFloorStartsAtY':861,'hits':hits,
  'limits':['Projected 2D alpha pixels, not 3D collision','boots and authored shadows excluded','does not check character-character collision or approved art']}
if __name__=='__main__':
 if len(sys.argv)!=2:raise SystemExit('usage: fall_ground_observe.py S05.json')
 print(json.dumps(observe(Path(sys.argv[1])),indent=2))
