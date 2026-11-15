"""Confirm edge-preview changes stay inside transformed prop bounds over S05.

This checks raster locality, not collision, physical correctness or artistic quality.
Both previews must independently pass verify_animation first.
"""
import hashlib,json,math,sys
from pathlib import Path
import numpy as np
from PIL import Image

def box_for(sprite,asset,camera,width=640,height=360,margin=4):
 zoom=camera['zoom'];scale=zoom*width/1920;angle=math.radians(sprite['rotation']);c=math.cos(angle);s=math.sin(angle);corners=[]
 for x in (0,asset['width']):
  for y in (0,asset['height']):
   dx=(x-asset['pivot'][0])*sprite['scaleX'];dy=(y-asset['pivot'][1])*sprite['scaleY']
   sx=sprite['x']+c*dx-s*dy;sy=sprite['y']+s*dx+c*dy
   corners.append((width/2+(sx-camera['x'])*scale,height/2+(sy-camera['y'])*scale))
 return (max(0,math.floor(min(p[0] for p in corners))-margin),max(0,math.floor(min(p[1] for p in corners))-margin),
         min(width,math.ceil(max(p[0] for p in corners))+margin),min(height,math.ceil(max(p[1] for p in corners))+margin))

def count_scope(original,modified,boxes):
 if original.shape!=modified.shape or original.ndim!=3 or original.shape[2]!=3:raise ValueError('EDGE_MOTION_SIZE')
 height,width=original.shape[:2];allowed=np.zeros((height,width),dtype=bool)
 for x0,y0,x1,y1 in boxes:
  if not (0<=x0<x1<=width and 0<=y0<y1<=height):raise ValueError('EDGE_MOTION_BOX')
  allowed[y0:y1,x0:x1]=True
 changed=np.any(original!=modified,axis=2)
 return int((changed&allowed).sum()),int((changed&~allowed).sum())

def analyze(base,candidate,source):
 base,candidate,source=Path(base),Path(candidate),Path(source);raw=source.read_bytes();data=json.loads(raw)
 a=json.loads((base/'report.json').read_text());b=json.loads((candidate/'report.json').read_text())
 for key in ('sourceSha256','contourSha256','width','height','fps','frames','coverage'):
  if a.get(key)!=b.get(key):raise ValueError('EDGE_MOTION_BINDING '+key)
 if b.get('look')!='edge-alpha' or a['sourceSha256']!=hashlib.sha256(raw).hexdigest() or (a['width'],a['height'],a['frames'])!=(640,360,192):raise ValueError('EDGE_MOTION_SOURCE')
 assets={x['id']:x for x in data['pack']['assets']};changed_frames=changed_inside=changed_outside=0;max_outside=0
 for i,frame in enumerate(data['frames']):
  original=np.asarray(Image.open(base/'frames'/f'{i:04}.png').convert('RGB'));modified=np.asarray(Image.open(candidate/'frames'/f'{i:04}.png').convert('RGB'))
  if original.shape!=(360,640,3) or modified.shape!=original.shape:raise ValueError('EDGE_MOTION_SIZE')
  props=[s for s in frame['sprites'] if s['asset'].startswith('props/')]
  if not props:raise ValueError('EDGE_MOTION_PROP')
  boxes=[box_for(item,assets[item['asset']],frame['camera']) for item in props]
  inside,outside=count_scope(original,modified,boxes);changed_frames+=bool(inside or outside);changed_inside+=inside;changed_outside+=outside;max_outside=max(max_outside,outside)
 result={'status':'PASS_EDGE_LOCALITY' if changed_outside==0 and changed_frames>0 else 'FAIL_EDGE_LOCALITY','frames':192,'changedFrames':changed_frames,'changedInside':changed_inside,'changedOutside':changed_outside,'maxOutsidePerFrame':max_outside,'marginPx':4,'sourceSha256':a['sourceSha256'],'candidateVideoSha256':b['videoSha256'],'scope':'640x360 per-frame bounding-box locality only; alpha increase, joint gaps, color, shadow and artistic quality require separate checks'}
 if result['status']!='PASS_EDGE_LOCALITY':raise ValueError('EDGE_MOTION_LOCALITY '+json.dumps(result))
 return result
if __name__=='__main__':
 if len(sys.argv)!=4:raise SystemExit('usage: edge_motion_scope.py BASE_PREVIEW EDGE_PREVIEW SOURCE_JSON')
 print(json.dumps(analyze(*sys.argv[1:])))
