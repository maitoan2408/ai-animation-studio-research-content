"""Verify the requested review-sheet files, decode and hashes; not their quality."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

def verify(folder):
    folder=Path(folder);report=json.loads((folder/'report.json').read_text());outputs=report['outputs']
    if report['status']!='PROVISIONAL_VECTOR_RIG_SHEETS' or {x['sheet'] for x in outputs}!={'base','draft','extreme'} or len(outputs)!=3:raise ValueError('SHEET_REPORT')
    for item in outputs:
        p=folder/(item['sheet']+'.png');data=p.read_bytes()
        if hashlib.sha256(data).hexdigest()!=item['sha256']:raise ValueError('SHEET_HASH')
        with Image.open(p) as im:
            im.load()
            if im.format!='PNG' or im.size!=(1920,1080):raise ValueError('SHEET_FORMAT')
    return {'status':'PASS_SHEET_FILES_ONLY','count':len(outputs),'manifestSha256':report['manifestSha256'],
            'scope':'No evaluation of art, pose, motion, phonemes or shadows.'}
if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('usage: verify_model_sheets.py OUTPUT_DIRECTORY')
    print(json.dumps(verify(Path(sys.argv[1]))))
