"""Audit durable command evidence and exact source snapshots, not phase approval.
Incomplete historical attempts are listed; never rewrite their status. The
currently running recorder for this audit is also necessarily incomplete.
"""
from pathlib import Path
import hashlib,json,sys,zipfile
ROOT=Path(__file__).resolve().parents[3]
files=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
rows=[];errors=[];incomplete=[];snapshots=0
for request in sorted((ROOT/'production/evidence').glob('[QU]*/*/request.json')):
    directory=request.parent;req=json.loads(request.read_text());result=directory/'result.json'
    if not result.exists():incomplete.append(str(directory.relative_to(ROOT)));continue
    data=json.loads(result.read_text())
    if files(directory/'stdout.log')!=data['log_sha256']:errors.append(directory.name+':LOG_HASH')
    expected=req.get('source_snapshot_sha256')
    if expected:
        archive=directory/'source.zip'
        if not archive.exists() or files(archive)!=expected:errors.append(directory.name+':SNAPSHOT_HASH')
        else:
            inputs=json.loads((directory/'inputs.json').read_text())['files']
            with zipfile.ZipFile(archive) as z:
                for item in inputs:
                    if hashlib.sha256(z.read(item['path'])).hexdigest()!=item['sha256']:errors.append(directory.name+':SOURCE_BYTES:'+item['path'])
            snapshots+=1
    rows.append({'run':directory.name,'phase':data['phase'],'commandStatus':data['status'],'elapsedSeconds':data['elapsed_seconds']})
report={'status':'FAIL' if errors else 'PASS_INTEGRITY','completedAttempts':len(rows),'sourceSnapshotsChecked':snapshots,'incompleteAttempts':incomplete,'errors':errors,'commandElapsedSumSeconds':sum(r['elapsedSeconds'] for r in rows),'limits':['Command elapsed sums include concurrent jobs and are not human labor, elapsed project time, CPU-hours or SLA','PASS command counts do not imply creative/phase gates','No accepted film minutes or cost/minute claimed'],'attempts':rows}
target=Path(sys.argv[1]);target.parent.mkdir(parents=True,exist_ok=True)
with target.open('x') as f:json.dump(report,f,indent=2);f.write('\n')
print(json.dumps({k:v for k,v in report.items() if k!='attempts'}))
if errors:raise SystemExit(1)
