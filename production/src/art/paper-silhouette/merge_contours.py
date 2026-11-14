"""Merge separately traced foreground and background masks, preserving sources."""
import hashlib
import json
import sys
import uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
def sha(data):return hashlib.sha256(data).hexdigest()
def merge(a,b):
    x,y=json.loads(a),json.loads(b)
    for key in ('manifestSha256','artManifestSha256'):
        if x[key]!=y[key]:raise ValueError('CONTOUR_MANIFEST_MISMATCH')
    rows=x['assets']+y['assets'];ids=[r['id'] for r in rows]
    if len(ids)!=len(set(ids)):raise ValueError('CONTOUR_DUPLICATE')
    return {'status':'PARTIAL_DEVELOPMENT_CONTOURS','manifestSha256':x['manifestSha256'],
      'artManifestSha256':x['artManifestSha256'],'sourceContourHashes':[sha(a),sha(b)],
      'sampling':'foreground 4x, background 1x; alpha >= 128','assets':rows,
      'limitations':['Binary masks omit translucent alpha; background 1x can lose subpixel detail.',
        'Asset-level triangulation and physical layering still require independent verification.',
        'Shadow/effect sprites remain flat; no artistic approval.']}
if __name__=='__main__':
    if len(sys.argv)!=3:raise SystemExit('usage: merge_contours.py FOREGROUND BACKGROUND')
    result=merge(Path(sys.argv[1]).read_bytes(),Path(sys.argv[2]).read_bytes());out=ROOT/'out/paper-silhouettes'/uuid.uuid4().hex;out.mkdir(parents=True)
    raw=(json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode();(out/'contours.json').write_bytes(raw)
    print(json.dumps({'status':result['status'],'output':str(out),'sha256':sha(raw),'assets':len(result['assets'])}))
