"""End-to-end hero export and diagnostics with exact provenance, for local/CI.

Uses only committed textures and local Chromium. No native rerender or services.
"""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[3]
WORK = ROOT / 'production'
TSX = WORK / 'node_modules/.bin/tsx'


def run(script, *args):
    result = subprocess.run([str(TSX), str(WORK / script), *args], cwd=ROOT,
                            text=True, capture_output=True, timeout=120)
    if result.returncode:
        print(result.stdout)
        print(result.stderr)
        raise RuntimeError(f'DIAGNOSTIC_CHILD_FAILED: {script}: {result.returncode}')
    return json.loads(result.stdout.splitlines()[-1])


subprocess.run(['python3', str(WORK / 'src/motion/prepare_textures.py')],
               cwd=ROOT, check=True)
hero = run('src/motion/build_hero.ts', '--native-input', '--textures',
           str(WORK / 'out/hero-textures/d5a8aa9c807b9c95f4ddcfbc9c1b0591f6035e601e285053d614a7e7ed06c309/textures.json'))
source = Path(hero['output'])
old = WORK / 'artifacts/quality/hero'
bake = json.loads((source / 'bake.json').read_text())
assert bake['data'] == json.loads((old / 'bake.json').read_text())['data']
assert json.loads((source / 'input.json').read_text()) == json.loads((old / 'input.json').read_text())
native = json.loads((source / 'S05.json').read_text())
assert len(native['frames']) == 192
diagnostic = run('src/motion/diagnostics.ts', '--hero', str(source))
out = Path(diagnostic['output'])
assert diagnostic['status'] == 'PASS_DIAGNOSTICS'
assert diagnostic['executionSha256'] == bake['binding']['executionSha256']
for name, sha in diagnostic['outputs'].items():
    assert hashlib.sha256((out / name).read_bytes()).hexdigest() == sha, name
assert (out / 'contact-sheet.jpg').read_bytes().startswith(b'\xff\xd8')
report = dict(status='PASS_DIAGNOSTIC_WORKFLOW', source=str(source), output=str(out),
              frames=192, baselineInputAndBakeDataUnchanged=True,
              outputHashesVerified=len(diagnostic['outputs']),
              executionSha256=diagnostic['executionSha256'],
              limits=['SVG diagnostic preview, not native color parity or artistic approval'])
(out / 'workflow.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
