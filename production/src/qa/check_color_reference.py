"""Recheck the committed color reference in the current actual browser.

The pinned historical results remain intact. CI creates a new player/measurement
directory and must satisfy the original chart thresholds; no automatic updates.
"""
from pathlib import Path
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
capture = subprocess.run([
    str(ROOT / 'production/node_modules/.bin/tsx'),
    str(ROOT / 'production/src/render/check_player.ts'),
    str(ROOT / 'production/artifacts/Q2/media-contract-v2/chart'), '12',
], cwd=ROOT, capture_output=True, text=True)
print(capture.stdout, end=''); print(capture.stderr, end='', file=sys.stderr)
if capture.returncode: raise SystemExit(capture.returncode)
result = json.loads(capture.stdout.strip().splitlines()[-1])
measure = subprocess.run([
    sys.executable, str(ROOT / 'production/src/media/check_chart.py'),
    str(ROOT / 'production/artifacts/Q2/media-contract-v1/diagnostics/chart-fixture.json'),
    result['output'],
], cwd=ROOT)
raise SystemExit(measure.returncode)
