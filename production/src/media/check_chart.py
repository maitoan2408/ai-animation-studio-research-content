"""Measure the frozen interior patches, including all grayscale and primaries."""
import json
import sys
import uuid
from pathlib import Path
import numpy as np
from PIL import Image
from contracts import ROOT, CONTRACT

fixture = json.loads(Path(sys.argv[1]).read_text())
player = Path(sys.argv[2])
limit = CONTRACT['testsLockedBeforeExecution']['flatPatchInteriorRGB']
rows = []
for file in ['player.png', 'compositor.png']:
    actual = np.asarray(Image.open(player / file).convert('RGB')).astype(int)
    for patch in fixture['patches']:
        x0, y0, x1, y1 = patch['bounds']; inset = limit['excludeBoundaryPixels']
        delta = np.abs(actual[y0+inset:y1-inset, x0+inset:x1-inset] - patch['rgb'])
        rows.append({'sample': file, 'rgb': patch['rgb'], 'maxAbsoluteRGB': int(delta.max()),
                     'withinLimit': bool(delta.max() <= limit['absoluteMax'])})
out = ROOT / 'out/chart-results' / uuid.uuid4().hex
out.mkdir(parents=True)
report = {'status': 'PASS_TECHNICAL' if all(r['withinLimit'] for r in rows) else 'FAIL',
          'limits': limit, 'patches': rows, 'scope': 'Frozen patch interiors; scene-edge tests are separate'}
(out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'output': str(out), **report}))
if report['status'] == 'FAIL':
    raise SystemExit(1)
