"""Measure alpha discarded by binary silhouettes; no threshold is a quality gate."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[3]
def sha(data):return hashlib.sha256(data).hexdigest()
def quantify(alpha):
    hist=[0]*256
    for v in alpha:hist[v]+=1
    count=sum(hist); partial=sum(hist[1:255]);loss=sum(n*(v if v<128 else 255-v) for v,n in enumerate(hist))
    return {'pixels':count,'partialAlphaPixels':partial,'absoluteAlphaError':loss,
      'meanAbsoluteAlphaError':loss/count if count else 0}
def measure(contour_path,texture_path):
    contour_raw=contour_path.read_bytes();contour=json.loads(contour_raw)
    manifest_raw=texture_path.read_bytes();manifest=json.loads(manifest_raw);textures={x['id']:x for x in manifest['textures']}
    if contour['manifestSha256']!=sha(manifest_raw):raise ValueError('ALPHA_LOSS_MANIFEST_HASH')
    rows=[]
    for a in contour['assets']:
        t=textures[a['id']];file=(ROOT/'out/art-q1'/t['file']).resolve();raw=file.read_bytes()
        if sha(raw)!=t['sha256'] or t['sha256']!=a['textureSha256']:raise ValueError('ALPHA_LOSS_TEXTURE_HASH')
        grid=a.get('gridScale',1);size=(a['dimensions'][0]*grid,a['dimensions'][1]*grid)
        with Image.open(file) as image:
            image.load()
            if image.mode!='RGBA':raise ValueError('ALPHA_LOSS_IMAGE')
            alpha=image.getchannel('A').resize(size,Image.Resampling.BOX).tobytes()
        mask=bytes(1 if x>=128 else 0 for x in alpha)
        if sha(mask)!=a['maskSha256']:raise ValueError('ALPHA_LOSS_MASK_HASH')
        rows.append({'id':a['id'],'gridScale':grid,**quantify(alpha)})
    pixels=sum(x['pixels'] for x in rows);error=sum(x['absoluteAlphaError'] for x in rows)
    return {'status':'OBSERVATION_ONLY','contourSha256':sha(contour_raw),'textureManifestSha256':sha(manifest_raw),
       'assets':len(rows),'pixels':pixels,'partialAlphaPixels':sum(x['partialAlphaPixels'] for x in rows),
       'absoluteAlphaError':error,'meanAbsoluteAlphaError':error/pixels if pixels else 0,'rows':rows,
       'scope':'Alpha threshold 128 only; does not measure scene edge quality, RGB appearance, anti-aliasing or artistic approval.'}
if __name__=='__main__':
    if len(sys.argv)!=3:raise SystemExit('usage: measure_alpha_loss.py CONTOURS TEXTURES')
    print(json.dumps(measure(Path(sys.argv[1]),Path(sys.argv[2])),indent=2))
