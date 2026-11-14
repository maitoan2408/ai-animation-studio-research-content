"""Compare two verified seekable preview manifests, not creative quality."""
import json,sys
from pathlib import Path

def compare(a,b):
 keys=('sourceSha256','contourSha256','width','height','profile','coverage','look','fps','frames','frameSha256','videoSha256')
 for key in keys:
  if key not in a or key not in b or a[key]!=b[key]:raise ValueError('ANIMATION_REPEAT_MISMATCH '+key)
 if len(a['frameSha256'])!=192:raise ValueError('ANIMATION_REPEAT_COUNT')
 return {'status':'PASS_TWO_IDENTICAL_RUNS','frames':192,'videoSha256':a['videoSha256'],'scope':'same host/browser, source, candidate and settings; not whole-scene flicker or artistic approval'}
if __name__=='__main__':
 if len(sys.argv)!=3:raise SystemExit('usage: compare_runs.py FIRST_REPORT SECOND_REPORT')
 print(json.dumps(compare(json.loads(Path(sys.argv[1]).read_text()),json.loads(Path(sys.argv[2]).read_text()))))
