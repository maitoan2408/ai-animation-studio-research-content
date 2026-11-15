"""Measure S05 life preview pixel changes within Mai's per-frame boxes only."""
import hashlib,json,sys
from pathlib import Path
import numpy as np
from PIL import Image
from edge_motion_scope import box_for,count_scope

def sha(b):return hashlib.sha256(b).hexdigest()
def analyze(base,candidate,base_source,candidate_source):
 base,candidate=Path(base),Path(candidate);ra=json.loads((base/'report.json').read_text());rb=json.loads((candidate/'report.json').read_text())
 ba=Path(base_source).read_bytes();bb=Path(candidate_source).read_bytes();a=json.loads(ba);b=json.loads(bb)
 for k in ('contourSha256','width','height','fps','frames','coverage'):
  if ra[k]!=rb[k]:raise ValueError('LIFE_SCOPE_BINDING '+k)
 if (ra['width'],ra['height'],ra['frames'],rb['look'])!=(640,360,192,'basic') or (ra.get('look') != 'basic' and not (ra.get('look') is None and ra['sourceSha256']=='48368a9146dfb4d9a7e15c85adbf22341ebb4e3714d899fb06711e9203cbabdc' and ra['videoSha256']=='6082615cb56576b89c65e31b551d9e3f2725a723f150469cbea6c2926fc6b6b2')) or ra['sourceSha256']!=sha(ba) or rb['sourceSha256']!=sha(bb):raise ValueError('LIFE_SCOPE_SOURCE')
 if sha((base/'preview.mp4').read_bytes())!=ra['videoSha256'] or sha((candidate/'preview.mp4').read_bytes())!=rb['videoSha256']:raise ValueError('LIFE_SCOPE_VIDEO_HASH')
 if b['edit']['qualityCandidate']!='f3-hero-life' or a['pack']!=b['pack'] or len(a['frames'])!=192 or len(b['frames'])!=192 or len(ra['frameSha256'])!=192 or len(rb['frameSha256'])!=192:raise ValueError('LIFE_SCOPE_PACK')
 assets={x['id']:x for x in a['pack']['assets']};inside=outside=changed_frames=0
 for i,(f,g) in enumerate(zip(a['frames'],b['frames'])):
  if f['camera']!=g['camera'] or [x for x in f['sprites'] if not x['id'].startswith('mai.')]!=[x for x in g['sprites'] if not x['id'].startswith('mai.')]:raise ValueError('LIFE_SCOPE_NON_MAI')
  boxes=[]
  for frame in (f,g):
   for sprite in frame['sprites']:
    if sprite['id'].startswith('mai.'):
     x0,y0,x1,y1=box_for(sprite,assets[sprite['asset']],frame['camera'])
     if x0<x1 and y0<y1:boxes.append((x0,y0,x1,y1))
  aa=(base/'frames'/f'{i:04}.png').read_bytes();bb=(candidate/'frames'/f'{i:04}.png').read_bytes()
  if sha(aa)!=ra['frameSha256'][i] or sha(bb)!=rb['frameSha256'][i]:raise ValueError('LIFE_SCOPE_FRAME_HASH')
  from io import BytesIO
  x=np.asarray(Image.open(BytesIO(aa)).convert('RGB'));y=np.asarray(Image.open(BytesIO(bb)).convert('RGB'))
  within,leak=count_scope(x,y,boxes);inside+=within;outside+=leak;changed_frames+=bool(within or leak)
 result={'status':'PASS_ACTOR_BOX_SCOPE' if outside==0 and changed_frames>0 else 'FAIL_ACTOR_BOX_SCOPE','frames':192,'changedFrames':changed_frames,'insidePixels':inside,'outsidePixels':outside,'marginPreviewPixels':4,'baseSourceSha256':ra['sourceSha256'],'candidateSourceSha256':rb['sourceSha256'],'scope':'Actor bounding boxes and hashes only; not art, collision, flicker, or pixel-accurate mask proof'}
 if result['status']!='PASS_ACTOR_BOX_SCOPE':raise ValueError('LIFE_SCOPE_LEAK '+json.dumps(result))
 return result
if __name__=='__main__':
 if len(sys.argv)!=5:raise SystemExit('usage: life_motion_scope.py BASE CANDIDATE BASE_SOURCE CANDIDATE_SOURCE')
 print(json.dumps(analyze(*sys.argv[1:]),indent=2))
