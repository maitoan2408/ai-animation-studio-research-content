"""Validate and retain small crops of six separate native-size experiments."""
import hashlib,importlib.util,json,sys,math,tempfile
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[5]
module=importlib.util.spec_from_file_location('paper_verify',ROOT/'production/src/art/paper-scene/verify_comparison.py');verify=importlib.util.module_from_spec(module);module.loader.exec_module(verify)
REGIONS={'face_mai':('mai.head',),'hand_lantern':('mai.right-hand','an.right-hand','lamp'),'feet_ground':('mai.left-boot','mai.right-boot')}
def region_box(frame,assets,ids,padding=30):
 camera=frame['camera'];points=[]
 for id in ids:
  matches=[s for s in frame['sprites'] if s['id']==id]
  if len(matches)!=1:raise ValueError('ENDPOINT_SPRITE '+id)
  sprite=matches[0];asset=assets[sprite['asset']];angle=math.radians(sprite['rotation']);c=math.cos(angle);s=math.sin(angle)
  for x in (0,asset['width']):
   for y in (0,asset['height']):
    dx=(x-asset['pivot'][0])*sprite['scaleX'];dy=(y-asset['pivot'][1])*sprite['scaleY']
    sx=sprite['x']+c*dx-s*dy;sy=sprite['y']+s*dx+c*dy
    points.append((960+(sx-camera['x'])*camera['zoom'],540+(sy-camera['y'])*camera['zoom']))
 return (max(0,math.floor(min(x for x,y in points))-padding),max(0,math.floor(min(y for x,y in points))-padding),min(1920,math.ceil(max(x for x,y in points))+padding),min(1080,math.ceil(max(y for x,y in points))+padding))
def run(log,source_path,target):
 target=Path(target);target.parent.mkdir(parents=True,exist_ok=True)
 if target.exists() or target.is_symlink():raise ValueError('ENDPOINT_OUTPUT_EXISTS')
 with tempfile.TemporaryDirectory(prefix='.endpoints-',dir=target.parent) as work:
  candidate=Path(work)/'artifact';candidate.mkdir()
  return _build(log,source_path,target,candidate)
def _build(log,source_path,target,candidate):
 records=[];seen=set();source=contour=None
 raw=Path(source_path).read_bytes();data=json.loads(raw);source_hash=hashlib.sha256(raw).hexdigest();assets={a['id']:a for a in data['pack']['assets']}
 for line in Path(log).read_text().splitlines():
  try:r=json.loads(line)
  except json.JSONDecodeError:continue
  if r.get('status')!='PARTIAL_SCENE_EXPERIMENT':continue
  pair=(r.get('look'),r.get('frame'))
  if pair in seen or pair not in {(v,f) for v in ('edge-alpha','bump','lamp-light') for f in (0,191)}:raise ValueError('ENDPOINT_UNEXPECTED')
  seen.add(pair);out=Path(r['output']).resolve()
  if not out.is_relative_to((ROOT/'production/out/paper-scene').resolve()):raise ValueError('ENDPOINT_PATH')
  actual=json.loads((out/'report.json').read_text())
  if r!=actual:raise ValueError('ENDPOINT_REPORT')
  if source is None:source,contour=r['inputSha256'],r['contourSha256']
  if source!=source_hash or (source,contour)!=(r['inputSha256'],r['contourSha256']) or r['coverage']!='physical' or r['shadowMode']!='authored-only':raise ValueError('ENDPOINT_BINDING')
  check=verify.verify(out);image=Image.open(out/'volume.png').convert('RGB');crops={}
  for name,ids in REGIONS.items():
   box=region_box(data['frames'][pair[1]],assets,ids)
   name_out=f'{pair[0]}-{pair[1]:03}-{name}.png';file=candidate/name_out;image.crop(box).save(file,optimize=True)
   crops[name]={'box':box,'spriteIds':ids,'file':name_out,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
  records.append({'look':pair[0],'frame':pair[1],'sourceImageSha256':check['volumeSha256'],'flatImageSha256':check['flatSha256'],'smokeChangedPixels':check['changedPixels'],'crops':crops})
 if len(seen)!=6:raise ValueError('ENDPOINT_MISSING')
 result={'status':'PASS_PROVISIONAL_NATIVE_ENDPOINTS','dimensions':[1920,1080],'sourceSha256':source,'contourSha256':contour,'records':records,'scope':'separate look experiments, frame endpoints only; no combined preset, full 1080 motion, flicker, shadows or artistic approval'}
 (candidate/'report.json').write_text(json.dumps(result,indent=2)+'\n')
 if target.exists() or target.is_symlink():raise ValueError('ENDPOINT_OUTPUT_EXISTS')
 candidate.rename(target);print(json.dumps(result));return result
if __name__=='__main__':
 if len(sys.argv)!=4:raise SystemExit('usage: native_endpoints.py RENDER_STDOUT SOURCE_JSON OUTPUT_DIR')
 run(*sys.argv[1:])
