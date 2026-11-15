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
def alpha_mask(img, texture, asset, scale):
    if img.size!=(texture['width'],texture['height']):raise ValueError('SILHOUETTE_TEXTURE_FORMAT')
    if img.mode=='RGBA':alpha=img.getchannel('A')
    elif img.mode=='RGB' and asset['category']=='background':alpha=Image.new('L',img.size,255)
    else:raise ValueError('SILHOUETTE_TEXTURE_FORMAT')
    alpha=alpha.resize((asset['width']*scale,asset['height']*scale),Image.Resampling.BOX)
    return bytes(1 if x>=128 else 0 for x in alpha.tobytes())

def run(manifest_path, names, art_path=ROOT/'assets/lantern-polish-1/manifest.json', scale=1):
    if scale not in (1,2,4):raise ValueError('SILHOUETTE_SCALE')
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
            mask=alpha_mask(img,t,a,scale)
        loops=trace(mask,a['width']*scale,a['height']*scale); area=sum(x['signedArea'] for x in loops)
        if area!=sum(mask):raise ValueError('SILHOUETTE_AREA_MISMATCH')
        if reconstruct(loops,a['width']*scale,a['height']*scale)!=mask:raise ValueError('SILHOUETTE_MASK_MISMATCH')
        rows.append({'id':name,'textureSha256':t['sha256'],'sourceSha256':a['sha256'],
           'dimensions':[a['width'],a['height']],'pivot':a['pivot'],'gridScale':scale,'maskSha256':sha(mask),
           'filledPixels':sum(mask),'signedArea':area,'loops':loops})
    return {'status':'PARTIAL_DEVELOPMENT_CONTOURS','manifestSha256':sha(manifest_data),
     'artManifestSha256':sha(art_data),'sampling':f'BOX to {scale}x native SVG dimensions; alpha >= 128',
     'assets':rows,'limitations':['Raster-derived binary contour omits translucent alpha detail; resolution is declared by gridScale.',
     'Exact binary-mask roundtrip does not prove Three hole mapping, shadow or art quality.',
     'Not integrated into renderer and not a replacement for source SVG.']}
if __name__=='__main__':
    if len(sys.argv)<3:raise SystemExit('usage: inventory.py TEXTURES_JSON [--art-manifest FILE] ASSET_ID...')
    art_path=ROOT/'assets/lantern-polish-1/manifest.json'; names=sys.argv[2:];scale=1
    while names and names[0].startswith('--'):
        if len(names)<3:raise SystemExit('OPTION_VALUE_AND_ASSETS_REQUIRED')
        option,value,names=names[0],names[1],names[2:]
        if option=='--art-manifest':art_path=Path(value)
        elif option=='--scale':scale=int(value)
        else:raise SystemExit('UNKNOWN_OPTION')
    if not names:raise SystemExit('ASSETS_REQUIRED')
    result=run(Path(sys.argv[1]),names,art_path,scale); out=ROOT/'out/paper-silhouettes'/uuid.uuid4().hex
    out.mkdir(parents=True);payload=(json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode()
    (out/'contours.json').write_bytes(payload)
    print(json.dumps({'status':result['status'],'output':str(out),'sha256':sha(payload),
        'assets':[{'id':a['id'],'filledPixels':a['filledPixels'],'loops':len(a['loops']),'vertices':sum(len(x['points']) for x in a['loops'])} for a in result['assets']]}))
