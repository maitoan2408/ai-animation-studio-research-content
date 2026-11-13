"""Separate encoder error from target-player error; does not waive either gate."""
import json
import sys
import uuid
from pathlib import Path
import numpy as np
from PIL import Image
from contracts import ROOT, command, sha256

fixture_path, video, player = map(Path, sys.argv[1:4])
fixture = json.loads(fixture_path.read_text())
filter_graph = ('zscale=primariesin=709:transferin=iec61966-2-1:matrixin=709:rangein=limited:'
                'primaries=709:transfer=iec61966-2-1:matrix=gbr:range=full,format=gbrp,format=rgb24')
pixels = command(['ffmpeg', '-v', 'error', '-nostdin', '-threads', '2', '-i', str(video),
                  '-vf', filter_graph, '-frames:v', '1', '-threads', '2', '-f', 'rawvideo', '-'])
decoded = np.frombuffer(pixels, dtype=np.uint8).reshape(1080, 1920, 3).astype(int)
actual = np.asarray(Image.open(player / 'player.png').convert('RGB')).astype(int)
rows = []
for patch in fixture['patches']:
    x0, y0, x1, y1 = patch['bounds']; y, x = (y0 + y1) // 2, (x0 + x1) // 2
    region = decoded[y0+2:y1-2, x0+2:x1-2]
    rows.append({'referenceRGB': patch['rgb'], 'ffmpegCenterRGB': decoded[y,x].tolist(),
                 'playerCenterRGB': actual[y,x].tolist(),
                 'ffmpegInteriorMax': int(np.abs(region - patch['rgb']).max())})
out = ROOT / 'out/color-diagnosis' / uuid.uuid4().hex
out.mkdir(parents=True)
Image.fromarray(decoded.astype(np.uint8)).save(out / 'ffmpeg.png')
report = {'status': 'DIAGNOSTIC_NOT_APPROVAL', 'deliverySha256': sha256(video),
          'fixtureSha256': sha256(fixture_path), 'player': json.loads((player / 'report.json').read_text()),
          'patches': rows, 'filter': filter_graph}
(out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'output': str(out), **report}))
