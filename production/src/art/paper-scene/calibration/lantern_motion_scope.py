"""Check 192-frame point-light off/on raster locality against configured radius.

A radius envelope is necessary but not sufficient for physically correct light.
"""
import hashlib,json,math,sys
from pathlib import Path
import numpy as np
from PIL import Image

def count_scope(off,on,cx,cy,radius):
 if off.shape!=on.shape or off.ndim!=3 or off.shape[2]!=3:raise ValueError('LANTERN_MOTION_SIZE')
 height,width=off.shape[:2];yy,xx=np.ogrid[:height,:width];within=(xx-cx)**2+(yy-cy)**2<=radius**2
 changed=np.any(off!=on,axis=2);return int((changed&within).sum()),int((changed&~within).sum()),int(((off<255)&(on==255)&within[:,:,None]).sum())

def analyze(off,on,source):
 off,on,source=Path(off),Path(on),Path(source);raw=source.read_bytes();data=json.loads(raw);a=json.loads((off/'report.json').read_text());b=json.loads((on/'report.json').read_text())
 for key in ('sourceSha256','contourSha256','width','height','fps','frames','coverage','look'):
  if a.get(key)!=b.get(key):raise ValueError('LANTERN_MOTION_BINDING '+key)
 if a.get('look')!='lamp-light' or a.get('lanternIntensity')!=0 or not isinstance(b.get('lanternIntensity'),(int,float)) or not 0<b['lanternIntensity']<=1 or a['sourceSha256']!=hashlib.sha256(raw).hexdigest() or (a['width'],a['height'],a['frames'])!=(640,360,192):raise ValueError('LANTERN_MOTION_SOURCE')
 assets={x['id']:x for x in data['pack']['assets']};changed_frames=inside=outside=clipped=frames_with_255=max_255=0
 for i,frame in enumerate(data['frames']):
  before=np.asarray(Image.open(off/'frames'/f'{i:04}.png').convert('RGB'));after=np.asarray(Image.open(on/'frames'/f'{i:04}.png').convert('RGB'))
  lamps=[s for s in frame['sprites'] if s['id']=='lamp']
  if len(lamps)!=1:raise ValueError('LANTERN_MOTION_LAMP')
  lamp=lamps[0];asset=assets[lamp['asset']];x,y=asset['anchors']['light'];dx=(x-asset['pivot'][0])*lamp['scaleX'];dy=(y-asset['pivot'][1])*lamp['scaleY'];angle=math.radians(lamp['rotation']);c=math.cos(angle);s=math.sin(angle)
  x=lamp['x']+c*dx-s*dy;y=lamp['y']+s*dx+c*dy;camera=frame['camera'];scale=camera['zoom']/3
  cx=320+(x-camera['x'])*scale;cy=180+(y-camera['y'])*scale
  count,leak,saturation=count_scope(before,after,cx,cy,650*scale+4);inside+=count;outside+=leak;clipped+=saturation;frames_with_255+=bool(saturation);max_255=max(max_255,saturation);changed_frames+=bool(count or leak)
 result={'status':'PASS_LIGHT_RADIUS_SCOPE' if changed_frames>0 and outside==0 else 'FAIL_LIGHT_RADIUS_SCOPE','frames':192,'changedFrames':changed_frames,'changedInside':inside,'changedOutside':outside,'newly255Channels':clipped,'framesWithNew255':frames_with_255,'maxNew255PerFrame':max_255,'onIntensity':b['lanternIntensity'],'radiusStagePx':650,'marginPreviewPx':4,'onVideoSha256':b['videoSha256'],'scope':'preview radius envelope and channel-255 counts; reaching 255 can result from quantization and does not alone prove linear clipping; not a color, shadow or artistic gate'}
 if result['status']!='PASS_LIGHT_RADIUS_SCOPE':raise ValueError('LANTERN_MOTION_SCOPE '+json.dumps(result))
 return result
if __name__=='__main__':
 if len(sys.argv)!=4:raise SystemExit('usage: lantern_motion_scope.py OFF_PREVIEW ON_PREVIEW SOURCE_JSON')
 print(json.dumps(analyze(*sys.argv[1:])))
