"""Check retained evidence and emit the audited result summary."""
from pathlib import Path
import hashlib
import json

root=Path(__file__).resolve().parents[1]
e=root/'evidence'
def read(name):return json.loads((e/name).read_text())
checks=[]
original=(e/'hyperframes-report-check.log').read_text()
fixed=(e/'hyperframes-editable-check.log').read_text()
checks.append({'test':'hyperframes-editor-example-fix','status':'PASS' if 'studio_missing_editable_id' in original and 'nested_structure_needs_subcomposition' in original and '0 errors, 0 warnings' in fixed and '0 issues across 9 sample(s)' in fixed and 'Check passed' in fixed and 'studio_missing_editable_id' not in fixed and 'nested_structure_needs_subcomposition' not in fixed else 'FAIL'})
for name in ['hyperframes-seek','remotion-seek']:
    d=read(name+'.json')
    checks.append({'test':name,'status':'PASS' if len(d['results'])==48 and all(x['matchesBaseline'] for x in d['results']) else 'FAIL','captures':len(d['results']),'comparisons_against_baseline':sum(x['pass']>0 for x in d['results'])})
for d in read('concurrency-qc.json'):
    checks.append({'test':d['backend']+'-concurrency','status':'PASS' if d['pass'] else 'FAIL','frames':d['frames'],'identical_decoded_frames':d['identical_frames']})
qc=read('media-qc.json')
checks.append({'test':'media-qc','status':'PASS' if qc['checks'] and all(x['pass'] for x in qc['checks']) else 'FAIL','checks':len(qc['checks'])})
for name,expected in [('hyperframes-missing-best-effort',0),('hyperframes-missing-strict',1),('remotion-missing-native',0),('remotion-missing-guarded',1)]:
    code=read(name+'-command.json')['returncode']
    log=(e/(name+'.log')).read_text()
    expected_message = 'media_load_failed' if name.startswith('hyperframes') else ('Error loading image' if name.endswith('guarded') else '404')
    correct_cause=expected_message in log
    checks.append({'test':name,'status':'REPRODUCED' if code==expected and correct_cause else 'FAIL','exit_code':code,'expected_exit_code':expected,'expected_message_found':correct_cause})
for name in ['hyperframes-missing-w1-strict.mp4','remotion-missingguarded-w1.mp4']:
    checks.append({'test':'no-final-artifact-'+name,'status':'PASS' if not (root/'out'/name).exists() else 'FAIL'})
summary={'scope':'Focused technical feasibility; no full production/pilot/artistic acceptance claim','results':checks}
(e/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
manifest={}
for folder in ['fixtures','scripts','evidence']:
    for p in sorted((root/folder).rglob('*')):
        if not p.is_file() or '__pycache__' in p.parts or '.hyperframes' in p.parts or p.name=='SHA256SUMS':continue
        manifest[str(p.relative_to(root))]=hashlib.sha256(p.read_bytes()).hexdigest()
for name in ['package.json','package-lock.json','requirements.txt','README.md']:
    manifest[name]=hashlib.sha256((root/name).read_bytes()).hexdigest()
(e/'SHA256SUMS').write_text(''.join(f'{h}  {p}\n' for p,h in manifest.items()))
print(json.dumps(summary,indent=2))
if any(x['status']=='FAIL' for x in checks):raise SystemExit(1)
