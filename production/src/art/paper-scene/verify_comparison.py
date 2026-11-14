"""Decode and compare two experiment stills; this does not score artistic quality."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image,ImageChops,ImageStat

def verify(folder):
    folder=Path(folder); report=json.loads((folder/'report.json').read_text())
    images=[]
    for mode in ('flat','volume'):
        raw=(folder/f'{mode}.png').read_bytes(); matches=[x for x in report['images'] if x['mode']==mode]
        if len(matches)!=1 or hashlib.sha256(raw).hexdigest()!=matches[0]['sha256']:raise ValueError('SCENE_IMAGE_HASH')
        with Image.open(folder/f'{mode}.png') as image:
            image.load()
            if image.format!='PNG' or image.size!=(1920,1080):raise ValueError('SCENE_IMAGE_FORMAT')
            images.append(image.convert('RGB'))
    flat,volume=report['images']
    mode=report.get('shadowMode','combined');hidden=volume.get('hiddenPaperShadows',0)
    if mode not in ('combined','receiver-only') or not isinstance(hidden,int) or hidden<0:raise ValueError('SCENE_COVERAGE')
    if mode=='combined' and hidden!=0:raise ValueError('SCENE_COVERAGE')
    if mode=='receiver-only' and hidden==0:raise ValueError('SCENE_COVERAGE')
    if flat['plates']!=volume['plates']+hidden or flat['extruded']!=0 or volume['extruded']<1:raise ValueError('SCENE_COVERAGE')
    difference=ImageChops.difference(*images)
    histogram=difference.convert('L').histogram(); changed=sum(histogram[1:])
    if changed==0:raise ValueError('SCENE_NO_VISIBLE_DIFFERENCE')
    return {'status':'PASS_SMOKE_NOT_ART','dimensions':[1920,1080],'changedPixels':changed,
       'meanRgbDifference':ImageStat.Stat(difference).mean,'bbox':difference.getbbox(),
       'flatSha256':flat['sha256'],'volumeSha256':volume['sha256'],
       'scope':'Confirms decode, hashes and a visible change only; no visual parity or quality approval.'}
if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('usage: verify_comparison.py OUTPUT_DIRECTORY')
    print(json.dumps(verify(sys.argv[1])))
