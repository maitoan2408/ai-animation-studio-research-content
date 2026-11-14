"""Measure projected opaque-pixel overlap, not physical penetration or depth."""
import hashlib
import json
import math
import sys
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[2]

def sha(data): return hashlib.sha256(data).hexdigest()
def projection(sprite, asset, image, bounds):
    sx, sy = sprite['scaleX'], sprite['scaleY']
    if not all(math.isfinite(n) and abs(n) <= 1e9 for n in (sx,sy,sprite['x'],sprite['y'],sprite['rotation'])) or sx == 0 or sy == 0:
        raise ValueError('ALPHA_TRANSFORM')
    theta = math.radians(sprite['rotation']); c,s = math.cos(theta),math.sin(theta)
    rx,ry=image.width/asset['width'],image.height/asset['height']
    a,b=rx*c/sx,rx*s/sx
    d,e=-ry*s/sy,ry*c/sy
    x0,y0=bounds[0],bounds[1]
    coeff=(a,b,rx*asset['pivot'][0]+a*(x0-sprite['x'])+b*(y0-sprite['y']),
           d,e,ry*asset['pivot'][1]+d*(x0-sprite['x'])+e*(y0-sprite['y']))
    return image.getchannel('A').transform((bounds[2]-x0,bounds[3]-y0),Image.Transform.AFFINE,coeff,Image.Resampling.NEAREST)

def inspect(source):
    data=source.read_bytes(); doc=json.loads(data)
    if doc['shot']!='S05' or doc['fps']!=24 or len(doc['frames'])!=192: raise ValueError('ALPHA_INPUT')
    assets={x['id']:x for x in doc['pack']['assets']}
    textures={x['id']:x for x in doc['textures']['textures']}
    selected=['props/lantern-lit','mai/torso','an/torso']; images={}; hashes={}
    for name in selected:
        entry=textures[name]; asset=assets[name]
        if entry['sourceSha256']!=asset['sha256']: raise ValueError('ALPHA_SOURCE_HASH')
        file=(ROOT/'out/art-q1'/entry['file']).resolve();raw=file.read_bytes()
        if sha(raw)!=entry['sha256']: raise ValueError('ALPHA_TEXTURE_HASH')
        img=Image.open(file);img.load()
        if img.size!=(entry['width'],entry['height']) or img.mode!='RGBA': raise ValueError('ALPHA_TEXTURE_FORMAT')
        images[name]=img;hashes[name]=entry['sha256']
    # Frozen 50%-alpha threshold; 1920x1080 stage pixels, nearest sample.
    hits={k:[] for k in ['mai.torso','an.torso']}; max_pixels={k:0 for k in hits}
    for index,frame in enumerate(doc['frames']):
        sprites={s['id']:s for s in frame['sprites']};lamp=sprites['lamp']
        for id in hits:
            torso=sprites[id]; bounds=(0,0,1920,1080)
            a=projection(lamp,assets[lamp['asset']],images[lamp['asset']],bounds).point(lambda x:255 if x>=128 else 0)
            b=projection(torso,assets[torso['asset']],images[torso['asset']],bounds).point(lambda x:255 if x>=128 else 0)
            pixels=ImageChops.multiply(a,b).histogram()[255]
            if pixels: hits[id].append({'frame':index,'pixels':pixels})
            max_pixels[id]=max(max_pixels[id],pixels)
    return {'status':'OBSERVATION_ONLY','sourceSha256':sha(data),'textureSha256':hashes,'frames':192,
            'alphaThreshold':128,'sampling':'nearest in 1920x1080 stage space','overlap':hits,'maximumPixels':max_pixels,
            'limitations':['Screen-space opaque overlap ignores physical depth and allowed layered occlusion.',
                           'Threshold and nearest sampling are diagnostic, not calibrated artistic or collision criteria.',
                           'Not an approval or proof of 3D penetration.']}
if __name__=='__main__':
    if len(sys.argv)!=2: raise SystemExit('usage: alpha_overlap.py S05.json')
    print(json.dumps(inspect(Path(sys.argv[1])),indent=2))
