"""Create a review board from three hash-verified single-frame experiments."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image,ImageDraw
from verify_comparison import verify

def build(folders,target):
    folders=[Path(p) for p in folders];names=['combined','receiver-only','authored-only'];reports=[]
    for folder,name in zip(folders,names):
        verify(folder);r=json.loads((folder/'report.json').read_text())
        if r.get('shadowMode','combined')!=name:raise ValueError('BOARD_MODE')
        reports.append(r)
    if len({r['inputSha256'] for r in reports})!=1 or len({r['contourSha256'] for r in reports})!=1:
        raise ValueError('BOARD_INPUT_MISMATCH')
    if len({next(i for i in r['images'] if i['mode']=='flat')['sha256'] for r in reports})!=1:
        raise ValueError('BOARD_FLAT_MISMATCH')
    board=Image.new('RGB',(1920,1080),'#efe6d0');draw=ImageDraw.Draw(board)
    for i,(folder,name) in enumerate(zip(folders,names)):
        with Image.open(folder/'volume.png') as raw:
            image=raw.convert('RGB');small=image.resize((640,360),Image.Resampling.LANCZOS)
            close=image.crop((520,150,1400,950)).resize((640,582),Image.Resampling.LANCZOS)
            board.paste(small,(i*640,45));board.paste(close,(i*640,470))
        draw.text((i*640+12,12),name,fill='#1c3735')
    target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists():raise ValueError('BOARD_EXISTS')
    board.save(target,format='PNG');payload=target.read_bytes()
    return {'status':'PROVISIONAL_COMPARISON','sha256':hashlib.sha256(payload).hexdigest(),
       'inputSha256':reports[0]['inputSha256'],'contourSha256':reports[0]['contourSha256'],
       'sourceImageSha256':[next(x for x in r['images'] if x['mode']=='volume')['sha256'] for r in reports],
       'scope':'Resampled review board; use full-resolution sources for pixel/edge inspection. No artistic approval.'}
if __name__=='__main__':
    if len(sys.argv)!=5:raise SystemExit('usage: shadow_board.py COMBINED RECEIVER AUTHORED OUTPUT')
    print(json.dumps(build(sys.argv[1:4],Path(sys.argv[4]))))
