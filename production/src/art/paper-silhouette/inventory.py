"""Generate development contours from hash-verified local R3 alpha textures."""
import hashlib
import json
import sys
import uuid
from pathlib import Path
from PIL import Image
from trace import trace, reconstruct
ROOT=Path(__file__).resolve().parents[3]
def sha(raw): return hashlib.sha256(raw).hexdigest()
def run(manifest_path, names, art_path=ROOT/'assets/lantern-polish-1/manifest.json'):
    manifest_data=manifest_path.read_bytes();manifest=json.loads(manifest_data)
    textures={t['id']:t for t in manifest['textures']}
    art_data=art_path.read_bytes()
    assets={a['id']:a for a in json.loads(art_data)['assets']}
    rows=[]
    for name in names:
        t=textures[name]; a=assets[name]
        if t['sourceSha256']!=a['sha256']:raise ValueError('SILHOUETTE_SOURCE_HASH')
        png=(ROOT/'out/art-q1'/t['file']).resolve(); raw=png.read_bytes()
        if sha(raw)!=t['sha256']:raise ValueError('SILHOUETTE_TEXTURE_HASH')
        with Image.open(png) as img:
            img.load()
            if img.mode!='RGBA' or img.size!=(t['width'],t['height']):raise ValueError('SILHOUETTE_TEXTURE_FORMAT')
            alpha=img.getchannel('A').resize((a['width'],a['height']),Image.Resampling.BOX)
            mask=bytes(1 if x>=128 else 0 for x in alpha.tobytes())
        loops=trace(mask,a['width'],a['height']); area=sum(x['signedArea'] for x in loops)
        if area!=sum(mask):raise ValueError('SILHOUETTE_AREA_MISMATCH')
        if reconstruct(loops,a['width'],a['height'])!=mask:raise ValueError('SILHOUETTE_MASK_MISMATCH')
        rows.append({'id':name,'textureSha256':t['sha256'],'sourceSha256':a['sha256'],
           'dimensions':[a['width'],a['height']],'pivot':a['pivot'],'maskSha256':sha(mask),
           'filledPixels':sum(mask),'signedArea':area,'loops':loops})
    return {'status':'PARTIAL_DEVELOPMENT_CONTOURS','manifestSha256':sha(manifest_data),
     'artManifestSha256':sha(art_data),'sampling':'BOX to native SVG dimensions; alpha >= 128',
     'assets':rows,'limitations':['Raster-derived binary contour omits translucent edges and subpixel detail.',
     'Exact binary-mask roundtrip does not prove Three hole mapping, shadow or art quality.',
     'Not integrated into renderer and not a replacement for source SVG.']}
if __name__=='__main__':
    if len(sys.argv)<3:raise SystemExit('usage: inventory.py TEXTURES_JSON [--art-manifest FILE] ASSET_ID...')
    art_path=ROOT/'assets/lantern-polish-1/manifest.json'; names=sys.argv[2:]
    if names[0]=='--art-manifest':
        if len(names)<3:raise SystemExit('ART_MANIFEST_AND_ASSETS_REQUIRED')
        art_path=Path(names[1]);names=names[2:]
    result=run(Path(sys.argv[1]),names,art_path); out=ROOT/'out/paper-silhouettes'/uuid.uuid4().hex
    out.mkdir(parents=True);payload=(json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode()
    (out/'contours.json').write_bytes(payload)
    print(json.dumps({'status':result['status'],'output':str(out),'sha256':sha(payload),
        'assets':[{'id':a['id'],'filledPixels':a['filledPixels'],'loops':len(a['loops']),'vertices':sum(len(x['points']) for x in a['loops'])} for a in result['assets']]}))
