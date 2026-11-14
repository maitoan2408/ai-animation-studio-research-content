"""Verify the limited scope of a draft-face preview against its input frame stream."""
import hashlib
import json
import sys
from pathlib import Path

def digest(data):return hashlib.sha256(data).hexdigest()
def verify(base, preview):
    before=base.read_bytes();after=preview.read_bytes();a=json.loads(before);b=json.loads(after)
    report=json.loads((preview.parent/'report.json').read_text());alpha=json.loads((preview.parent/'alpha-critic.json').read_text())
    if report['sourceSha256']!=digest(before) or report['modifiedSha256']!=digest(after) or alpha['sourceSha256']!=digest(after):raise ValueError('PREVIEW_HASH')
    if len(a['frames'])!=192 or len(b['frames'])!=192:raise ValueError('PREVIEW_FRAMES')
    changes=report['changes'];count=0
    for f,(x,y) in enumerate(zip(a['frames'],b['frames'])):
        if len(x['sprites'])!=len(y['sprites']) or x['markers']!=y['markers'] or x['camera']!=y['camera']:raise ValueError('PREVIEW_SCOPE')
        for old,new in zip(x['sprites'],y['sprites']):
            if f==108 and old['id'] in changes:
                expected={**old,'asset':changes[old['id']]}
                if new!=expected:raise ValueError('PREVIEW_SCOPE')
                count+=1
            elif old!=new:raise ValueError('PREVIEW_SCOPE')
    if count!=6 or set(changes)!={'mai.head','mai.head.paper-shadow','mai.mouth','an.head','an.head.paper-shadow','an.mouth'}:
        raise ValueError('PREVIEW_CHANGE_COVERAGE')
    return {'status':'PASS_PREVIEW_SCOPE','sourceSha256':digest(before),'previewSha256':digest(after),'frames':192,'changedSelectors':count,
       'scope':'Only verifies data changes; not visual, motion, voice or artistic approval.'}
if __name__=='__main__':
    if len(sys.argv)!=3:raise SystemExit('usage: check_f2_preview.py SOURCE PREVIEW')
    print(json.dumps(verify(Path(sys.argv[1]),Path(sys.argv[2]))))
