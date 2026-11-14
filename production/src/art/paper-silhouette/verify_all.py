"""Decode and verify every development texture and source hash; no approval."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[3]
def sha(data):return hashlib.sha256(data).hexdigest()
def verify(path):
    raw=path.read_bytes(); doc=json.loads(raw); art=(ROOT/'assets/lantern-polish-1/manifest.json').read_bytes()
    assets=json.loads(art)['assets']; expected={a['id']:a for a in assets};rows=doc['textures']; ids=[t['id'] for t in rows]
    if len(set(ids))!=len(ids) or set(ids)!=set(expected):raise ValueError('ALL_TEXTURE_COVERAGE')
    for t in rows:
        a=expected[t['id']];source=(ROOT/'assets/lantern-polish-1'/a['file']).read_bytes()
        if sha(source)!=a['sha256'] or t['sourceSha256']!=a['sha256']:raise ValueError('ALL_TEXTURE_SOURCE_HASH')
        file=(ROOT/'out/art-q1'/t['file']).resolve(); image=file.read_bytes()
        if sha(image)!=t['sha256']:raise ValueError('ALL_TEXTURE_HASH')
        with Image.open(file) as img:
            img.load()
            if img.format!='PNG' or img.size!=(t['width'],t['height']) or (img.mode!='RGBA' and not (img.mode=='RGB' and a['category']=='background')):raise ValueError('ALL_TEXTURE_DECODE')
    return {'status':'PASS_DEVELOPMENT_TEXTURES','count':len(rows),'manifestSha256':sha(raw),
       'artManifestSha256':sha(art),'scope':'Hash and decode only, not color equivalence or artistic approval.'}
if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('usage: verify_all.py TEXTURES_JSON')
    print(json.dumps(verify(Path(sys.argv[1]))))
