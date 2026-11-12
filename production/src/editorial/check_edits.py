"""Prove selective media reuse and the authored frame scope across R0/R1/R2.
Usage: check_edits.py <R0-selection> <R1-selection> <R2-selection> <new-report>
No claim that lossy interframe encoding preserves unchanged pixels inside a
modified shot; exact reuse is measured for unmodified whole-shot media.
"""
from pathlib import Path
import json,sys
from assemble import load_selection,FRAMES,digest
selections=[load_selection(Path(file)) for file in sys.argv[1:4]]
report={'status':'PASS_TECHNICAL','rounds':[],'limits':['Same-agent edit execution','Authored-frame counts are not lossy encoded-frame pixel equality','No creative or independent operator approval']}
for index,expected in [(1,{'S01','S03'}),(2,{'S04','S05'})]:
    shots=[]
    for shot in FRAMES:
        before,b=selections[index-1][shot];after,a=selections[index][shot]
        previous=json.loads((before/'inputs.json').read_text());following=json.loads((after/'inputs.json').read_text())
        changed=[f for f,(old,new) in enumerate(zip(previous['frames'],following['frames'])) if old!=new]
        changed_media=b['deliverySha256']!=a['deliverySha256']
        if bool(changed)!=(shot in expected) or changed_media!=(shot in expected):raise RuntimeError('EDIT_SCOPE '+shot)
        if shot not in expected and digest(before/'picture.mp4')!=digest(after/'picture.mp4'):raise RuntimeError('UNRELATED_PICTURE_CHANGED')
        if index==2 and shot=='S05' and changed!=list(range(156,168)):raise RuntimeError('REACTION_NOT_EXACTLY_12_FRAMES')
        shots.append({'shot':shot,'changedAuthoredFrames':changed,'mediaReusedExactly':not changed_media,'beforeDeliverySha256':b['deliverySha256'],'afterDeliverySha256':a['deliverySha256']})
    report['rounds'].append({'round':f'R{index}','rerenderedShots':sorted(expected),'unchangedShots':[s for s in FRAMES if s not in expected],'shots':shots})
path=Path(sys.argv[4]);path.parent.mkdir(parents=True,exist_ok=True)
with path.open('x') as f:json.dump(report,f,indent=2);f.write('\n')
print(json.dumps({'output':str(path),'status':report['status'],'rounds':2}))
