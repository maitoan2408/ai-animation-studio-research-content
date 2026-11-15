"""Conservative actor/actor sprite rectangle overlap, not 3D collision."""
import hashlib, json, math, sys
from pathlib import Path

def bounds(sprite, asset):
 values=[sprite['x'],sprite['y'],sprite['rotation'],sprite['scaleX'],sprite['scaleY'],asset['width'],asset['height'],*asset['pivot']]
 if not all(isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v) for v in values) or sprite['scaleX']==0 or sprite['scaleY']==0 or asset['width']<=0 or asset['height']<=0:raise ValueError('FALL_ACTOR_TRANSFORM')
 angle=math.radians(sprite['rotation']); c,s=math.cos(angle),math.sin(angle); out=[]
 for x,y in [(0,0),(asset['width'],0),(0,asset['height']),(asset['width'],asset['height'])]:
  x=(x-asset['pivot'][0])*sprite['scaleX']; y=(y-asset['pivot'][1])*sprite['scaleY']
  out.append((sprite['x']+c*x-s*y,sprite['y']+s*x+c*y))
 return min(x for x,y in out),min(y for x,y in out),max(x for x,y in out),max(y for x,y in out)
def overlap(a,b):return a[0]<b[2] and b[0]<a[2] and a[1]<b[3] and b[1]<a[3]
def observe(data):
 if data['edit']['qualityCandidate']!='f3-fall-fixture' or len(data['frames'])!=192:raise ValueError('FALL_ACTOR_SOURCE')
 assets={x['id']:x for x in data['pack']['assets']}; hits=[]
 for n in range(73):
  sprites=data['frames'][n]['sprites']
  groups=[[s for s in sprites if s['id'].startswith(prefix) and not s['id'].endswith(('.paper-shadow','.contact-shadow'))] for prefix in ('mai.','an.')]
  if not all(groups):raise ValueError('FALL_ACTOR_MISSING')
  for a in groups[0]:
   ab=bounds(a,assets[a['asset']])
   for b in groups[1]:
    if overlap(ab,bounds(b,assets[b['asset']])):hits.append({'frame':n,'first':a['id'],'second':b['id']})
 return {'status':'OBSERVATION_ONLY','frames':73,'bboxOverlaps':hits,'limits':['Bounding rectangles are conservative, not opaque-pixel or 3D contact','Only two named actors, shadow sprites excluded','Does not evaluate dynamics or acting']}
if __name__=='__main__':
 if len(sys.argv)!=2:raise SystemExit('usage: fall_actor_bounds.py S05.json')
 raw=Path(sys.argv[1]).read_bytes(); result=observe(json.loads(raw)); result['sourceSha256']=hashlib.sha256(raw).hexdigest()
 print(json.dumps(result,indent=2))
