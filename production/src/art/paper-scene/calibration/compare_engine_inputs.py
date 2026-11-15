"""Check pinned animation runtime source/lock hashes across evidence snapshots.

Explicit dependency list reflects animate.ts and its browser imports, not whole repo.
"""
import json,sys
from pathlib import Path
FILES=('production/package.json','production/package-lock.json',
 'production/src/art/paper-scene/animate.ts','production/src/art/paper-scene/animation-browser.ts',
 'production/src/art/paper-scene/paper-bump.ts','production/src/art/paper-scene/edge-alpha.ts',
 'production/src/art/paper-scene/contour-body.ts','production/src/art/paper-scene/depth.ts',
 'production/src/art/paper-scene/coverage.ts','production/src/art/paper-silhouette/shapes.ts',
 'production/src/scene/geometry.ts','production/src/scene/math.ts')

def compare(a,b):
 def index(x):
  rows=x.get('files');
  if not isinstance(rows,list):raise ValueError('ENGINE_INPUTS_FORMAT')
  result={}
  for item in rows:
   path=item['path']
   if path in result:raise ValueError('ENGINE_INPUTS_DUPLICATE '+path)
   result[path]=item['sha256']
  return result
 left,right=index(a),index(b)
 for path in FILES:
  if path not in left or path not in right or left[path]!=right[path]:raise ValueError('ENGINE_INPUT_MISMATCH '+path)
 return {'status':'PASS_ENGINE_INPUT_HASHES','files':len(FILES),'scope':'explicit animation runtime source and production dependency lock only; does not establish identical OS, Chromium or artistic quality'}
if __name__=='__main__':
 if len(sys.argv)!=3:raise SystemExit('usage: compare_engine_inputs.py FIRST_INPUTS SECOND_INPUTS')
 print(json.dumps(compare(json.loads(Path(sys.argv[1]).read_text()),json.loads(Path(sys.argv[2]).read_text()))))
