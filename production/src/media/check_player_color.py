"""Judge actual presented player samples against the predeclared RGB limits."""
from __future__ import annotations

import argparse
import json
import uuid
from pathlib import Path

import numpy as np
from PIL import Image
from contracts import CONTRACT, ROOT, sha256

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('reference', type=Path)
parser.add_argument('player', type=Path)
parser.add_argument('--expect-reject', action='store_true')
args = parser.parse_args()
metadata = json.loads((args.player / 'report.json').read_text())
if abs(metadata['presentedMediaTime'] - metadata['frame'] / 24) >= 1 / 48:
    raise ValueError('PRESENTED_FRAME_NOT_VERIFIED')
reference = np.asarray(Image.open(args.reference).convert('RGB')).astype(float)
limits = CONTRACT['testsLockedBeforeExecution']['realArtworkRGB']
results = []
for name in ['player.png', 'compositor.png']:
    file = args.player / name
    actual = np.asarray(Image.open(file).convert('RGB')).astype(float)
    if actual.shape != reference.shape:
        raise ValueError('SIZE_MISMATCH')
    delta = np.abs(reference - actual)
    mean, p95 = float(delta.mean()), float(np.percentile(delta, 95))
    results.append({'sample': name, 'sha256': sha256(file), 'maeRGB': mean, 'p95RGB': p95,
                    'withinLimits': mean <= limits['maeMax'] and p95 <= limits['p95Max']})
accepted = all(row['withinLimits'] for row in results)
report = {'status': 'PASS_TECHNICAL' if accepted != args.expect_reject else 'FAIL',
          'observed': 'ACCEPT_COLOR_SAMPLE' if accepted else 'REJECT_COLOR_SAMPLE',
          'expected': 'REJECT_COLOR_SAMPLE' if args.expect_reject else 'ACCEPT_COLOR_SAMPLE',
          'referenceSha256': sha256(args.reference), 'deliverySha256': metadata['deliverySha256'],
          'frame': metadata['frame'], 'browser': metadata['browser'], 'limits': limits, 'samples': results,
          'scope': 'Locked software Chromium/reference samples only, not artistic approval or every display'}
out = ROOT / 'out/color-acceptance' / uuid.uuid4().hex
out.mkdir(parents=True)
(out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'output': str(out), **report}))
if report['status'] == 'FAIL':
    raise SystemExit(1)
