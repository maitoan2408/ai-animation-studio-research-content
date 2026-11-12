"""Verify a Git-only copy, clean npm install and media restore on this same host.

This cannot be described as an independent operator or clean-machine handoff.
No untracked native renders, existing node_modules or restored MP4s are copied.
"""
from pathlib import Path
import datetime as dt
import hashlib
import json
import os
import subprocess
import tarfile
import uuid

ROOT = Path(__file__).resolve().parents[3]
out = ROOT / 'production/out/fresh-review' / uuid.uuid4().hex
checkout = out / 'checkout'; checkout.mkdir(parents=True)
head = subprocess.check_output(['git','rev-parse','HEAD'], cwd=ROOT, text=True).strip()
archive = out / 'source.tar'
with archive.open('xb') as stream:
    subprocess.run(['git','archive','--format=tar',head,'production'], cwd=ROOT, stdout=stream, check=True)
with tarfile.open(archive) as source:
    source.extractall(checkout, filter='data')
if (checkout / 'production/node_modules').exists() or list((checkout / 'production/artifacts/Q2/web-review-v2').glob('*/review.mp4')):
    raise RuntimeError('CHECKOUT_NOT_CLEAN')
environment = {**os.environ, 'npm_config_cache': str(out / 'npm-cache')}
commands = [
    ['npm','--prefix','production','ci','--no-audit','--no-fund'],
    ['python','production/src/media/review_bundle.py','restore','production/artifacts/Q2/web-review-v2'],
    ['npm','--prefix','production','run','typecheck'],
    ['npm','--prefix','production','test'],
    ['npm','--prefix','production','run','review','--','check'],
    ['npm','--prefix','production','run','test:review-ui'],
]
results = []
for command in commands:
    print('RUN', json.dumps(command), flush=True)
    result = subprocess.run(command, cwd=checkout, env=environment, timeout=600)
    results.append({'command': command, 'exitCode': result.returncode})
    if result.returncode: break
report = {'status': 'PASS' if len(results) == len(commands) and all(r['exitCode'] == 0 for r in results) else 'FAIL',
          'commit': head, 'source': 'git archive production only; clean npm cache/install',
          'completedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'checks': results,
          'lockSha256': hashlib.sha256((checkout / 'production/package-lock.json').read_bytes()).hexdigest(),
          'output': str(out), 'limits': ['Same host/runtime and agent; not independent operator or clean-machine certification', 'No listening or full artistic review from functional test']}
(out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report), flush=True)
if report['status'] != 'PASS': raise SystemExit(1)
