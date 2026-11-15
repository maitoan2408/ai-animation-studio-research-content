"""Exercise actual S05 textures/transforms with an injected overlap; no publish."""
import importlib.util
import json
import sys
import tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('alpha_overlap',ROOT/'src/continuity/alpha_overlap.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
source=Path(sys.argv[1]); data=json.loads(source.read_text())
frame=data['frames'][80];sprites={s['id']:s for s in frame['sprites']}
lamp=sprites['lamp'];torso=sprites['mai.torso']
lamp['x'],lamp['y']=torso['x'],torso['y']
with tempfile.TemporaryDirectory() as folder:
    altered=Path(folder)/'S05.json';altered.write_text(json.dumps(data))
    result=module.inspect(altered)
    hits=[row for row in result['overlap']['mai.torso'] if row['frame']==80]
    if len(hits)!=1 or hits[0]['pixels']<=0: raise RuntimeError('INJECTION_NOT_DETECTED')
    print(json.dumps({'status':'PASS_INJECTED_OVERLAP_DETECTED','frame':80,'pixels':hits[0]['pixels'],
       'inputSha256':module.sha(source.read_bytes()),'mutatedSha256':result['sourceSha256'],
       'scope':'Projected alpha only; not a physical penetration test.'}))
