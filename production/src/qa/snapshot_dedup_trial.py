"""Test deduplicated symlink snapshots on disposable copies only.

Does not change run-step, existing evidence, or the production audit schema.
"""
from __future__ import annotations
import argparse, hashlib, json, shutil, subprocess, sys, tarfile, tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]

def run_trial(attempt:Path, result:Path)->dict:
    for n in ('request.json','result.json','inputs.json','stdout.log','source.zip'):
        if not (attempt/n).is_file():raise ValueError('INCOMPLETE_ATTEMPT: '+n)
    with tempfile.TemporaryDirectory(prefix='f2-dedup-') as temp:
        base=Path(temp); clone=base/'copy'; qa=clone/'production/src/qa';qa.mkdir(parents=True)
        shutil.copyfile(ROOT/'production/src/qa/audit_evidence.py',qa/'audit_evidence.py')
        evidence=clone/'production/evidence';store=evidence/'_snapshots';store.mkdir(parents=True)
        archive=(attempt/'source.zip').read_bytes();digest=hashlib.sha256(archive).hexdigest()
        req=json.loads((attempt/'request.json').read_text())
        if req.get('source_snapshot_sha256')!=digest:raise ValueError('SNAPSHOT_HASH')
        stored=store/(digest+'.zip');stored.write_bytes(archive)
        for n in range(8):
            d=evidence/'U1'/f'copy-{n:02}';d.mkdir(parents=True)
            for name in ('request.json','result.json','inputs.json','stdout.log'):shutil.copyfile(attempt/name,d/name)
            (d/'source.zip').symlink_to('../../_snapshots/'+digest+'.zip')
        def audit(root:Path,label:str):
            return subprocess.run([sys.executable,str(root/'production/src/qa/audit_evidence.py'),str(base/(label+'.json'))],capture_output=True,text=True)
        initial=audit(clone,'audit-original')
        if initial.returncode:raise RuntimeError('AUDIT_COPY_FAIL '+initial.stdout+initial.stderr)
        # Reproduce the relevant Git archive/extract shape, without asserting npm/review success.
        tar=base/'production.tar'
        with tarfile.open(tar,'w') as t:t.add(clone/'production',arcname='production',recursive=True)
        restored=base/'restore';restored.mkdir()
        with tarfile.open(tar) as t:t.extractall(restored,filter='data')
        extracted=audit(restored,'audit-extracted')
        if extracted.returncode:raise RuntimeError('AUDIT_EXTRACT_FAIL '+extracted.stdout+extracted.stderr)
        altered=bytearray(stored.read_bytes());altered[len(altered)//2]^=1;stored.write_bytes(altered)
        corrupt=audit(clone,'audit-corrupt')
        if corrupt.returncode==0:raise RuntimeError('CORRUPT_SNAPSHOT_ACCEPTED')
        report={'status':'PARTIAL_PROTOTYPE_ONLY','copies':8,'originalSnapshotBytes':len(archive)*8,
          'storedSnapshotBytes':len(archive),'snapshotByteReductionFraction':.875,
          'archiveSha256':digest,'auditLegacySymlink':'PASS','tarExtractAudit':'PASS','corruptSnapshot':'REJECTED',
          'limitations':['Copies one historical source.zip into eight synthetic attempts, not eight fresh recorder attempts',
           'run-step and audit remain unchanged; symlink path security and platform portability not validated',
           'Tar extraction is a limited check, not a full check_fresh_review run or Windows test']}
        result.parent.mkdir(parents=True,exist_ok=True);result.write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('attempt',type=Path);p.add_argument('report',type=Path);a=p.parse_args();print(json.dumps(run_trial(a.attempt,a.report)))
