"""Compare a fixed no-shadow render against a shadow render; not a quality score."""
import json
import sys
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
from verify_comparison import verify

def verify_shadow(baseline, current):
    a,b=Path(baseline),Path(current)
    va,vb=verify(a),verify(b)
    if va['flatSha256']!=vb['flatSha256']:raise ValueError('SHADOW_FLAT_CHANGED')
    ra,rb=json.loads((a/'report.json').read_text()),json.loads((b/'report.json').read_text())
    if ra['inputSha256']!=rb['inputSha256'] or ra['contourSha256']!=rb['contourSha256']:
        raise ValueError('SHADOW_INPUT_CHANGED')
    with Image.open(a/'volume.png') as x, Image.open(b/'volume.png') as y:
        difference=ImageChops.difference(x.convert('RGB'),y.convert('RGB'))
        changed=sum(difference.convert('L').histogram()[1:])
        if not changed:raise ValueError('SHADOW_NO_CHANGE')
        return {'status':'PASS_SHADOW_DIFFERENCE_ONLY','changedPixels':changed,
          'meanRgbDifference':ImageStat.Stat(difference).mean,'bbox':difference.getbbox(),
          'inputSha256':ra['inputSha256'],'flatSha256':va['flatSha256'],
          'scope':'Confirms an image difference from adding a shared receiver; does not verify shadow correctness or art.'}
if __name__=='__main__':
    if len(sys.argv)!=3:raise SystemExit('usage: verify_shadow.py BASELINE CURRENT')
    print(json.dumps(verify_shadow(sys.argv[1],sys.argv[2])))
