"""Run required v0.1 integration/UI checks without replacing old deliverables."""
from pathlib import Path
import hashlib
import json
import subprocess
import uuid

ROOT = Path(__file__).resolve().parents[3]
out = ROOT / 'production/out/app-regression' / uuid.uuid4().hex
out.mkdir(parents=True)
for name in ['package.json','tsconfig.json','node_modules','src','web','tests','examples']:
    (out / name).symlink_to(ROOT / name)


def old_hashes():
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in (ROOT / 'artifacts').rglob('*') if p.is_file() and 'tmp' not in p.parts}


before = old_hashes()
results = []
for task in ['build', 'test:integration', 'test:ui']:
    process = subprocess.run(['npm','run',task], cwd=out)
    results.append({'script': task, 'exitCode': process.returncode})
    if process.returncode:
        break
unchanged = before == old_hashes()
report = {'status': 'PASS' if unchanged and len(results) == 3 and all(r['exitCode'] == 0 for r in results) else 'FAIL',
          'checks': results, 'oldArtifactsUnchanged': unchanged, 'output': str(out),
          'limits': ['Existing integration voice assertions measure PCM, not listening review', 'v0.1 regression, not production Q2 artistic approval']}
(out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
if report['status'] != 'PASS': raise SystemExit(1)
