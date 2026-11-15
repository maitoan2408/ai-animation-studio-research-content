"""Bounded geometric diagnosis of current depth-lit directional shadow separation.

Uses scene order and the fixed light/camera of browser.ts; ignores alpha, filtering,
receiver geometry, material and occlusion. This is not a physical or visual gate.
"""
import json,math,sys
from pathlib import Path

def analyze(frame):
 sprites=sorted(frame['sprites'],key=lambda s:s['z'])
 ground=[i for i,s in enumerate(sprites) if s['id']=='ground']
 if len(ground)!=1:raise ValueError('DEPTH_GROUND')
 g=ground[0];zoom=frame['camera']['zoom'];scale=zoom/3
 if not math.isfinite(zoom) or zoom<=0:raise ValueError('DEPTH_CAMERA')
 rows=[]
 for i,s in enumerate(sprites):
  if not s['asset'].startswith(('mai/','an/','mouth/','props/')):continue
  dz=(i-g)*6;dx=.4*dz*scale;dy=.5*dz*scale
  rows.append({'id':s['id'],'order':i,'depthAboveGround':dz,'predictedOffsetPx640':[round(dx,3),round(dy,3)],'predictedDistancePx640':round(math.hypot(dx,dy),3)})
 return {'status':'OBSERVATION_ONLY','groundOrder':g,'cameraZoom':zoom,'depthSpacing':6,'lightDirection':[-400,500,1000],
  'foregroundCount':len(rows),'maxPredictedDistancePx640':max((x['predictedDistancePx640'] for x in rows),default=0),
  'rows':rows,'scope':'directional planar geometry only, no alpha, finite shadow camera, material, occlusion, contact or creative assessment'}
if __name__=='__main__':
 data=json.loads(Path(sys.argv[1]).read_text());n=int(sys.argv[2]);report=analyze(data['frames'][n]);Path(sys.argv[3]).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
