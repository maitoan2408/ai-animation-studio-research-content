"""Measure a fixed-frame 1x/4x contour change without scoring edge quality."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
from verify_comparison import verify

def sha(data):return hashlib.sha256(data).hexdigest()
def compare(a,b,contour_a,contour_b):
    a,b=Path(a),Path(b);va,vb=verify(a),verify(b)
    ra,rb=json.loads((a/'report.json').read_text()),json.loads((b/'report.json').read_text())
    ca,cb=Path(contour_a).read_bytes(),Path(contour_b).read_bytes()
    da,db=json.loads(ca),json.loads(cb)
    if ra['inputSha256']!=rb['inputSha256'] or va['flatSha256']!=vb['flatSha256'] or ra['frame']!=rb['frame']:
        raise ValueError('GRID_INPUT_MISMATCH')
    if ra['contourSha256']!=sha(ca) or rb['contourSha256']!=sha(cb):raise ValueError('GRID_CONTOUR_HASH')
    if not all(x.get('gridScale',1)==1 for x in da['assets']) or not all(x.get('gridScale')==4 for x in db['assets']):
        raise ValueError('GRID_SCALE')
    if {x['id'] for x in da['assets']}!={x['id'] for x in db['assets']}:raise ValueError('GRID_COVERAGE')
    with Image.open(a/'volume.png') as ia,Image.open(b/'volume.png') as ib:
        diff=ImageChops.difference(ia.convert('RGB'),ib.convert('RGB'))
        count=sum(diff.convert('L').histogram()[1:])
        return {'status':'OBSERVATION_ONLY','changedPixels':count,'meanRgbDifference':ImageStat.Stat(diff).mean,'bbox':diff.getbbox(),
         'inputSha256':ra['inputSha256'],'oneXContourSha256':sha(ca),'fourXContourSha256':sha(cb),
         'scope':'Pixel differences only; no anti-alias, visual quality or artistic pass inferred.'}
if __name__=='__main__':
    if len(sys.argv)!=5:raise SystemExit('usage: compare_grids.py ONE_X_DIR FOUR_X_DIR ONE_X_JSON FOUR_X_JSON')
    print(json.dumps(compare(*sys.argv[1:])))
