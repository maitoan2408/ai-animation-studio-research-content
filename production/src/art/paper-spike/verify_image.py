"""Bounded smoke check for this fixed spike layout, not an art-quality score."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

def verify(path: Path):
    raw = path.read_bytes()
    with Image.open(path) as image:
        image.load()
        if image.format != 'PNG' or image.size != (1920, 1080):
            raise ValueError('SPIKE_IMAGE_FORMAT')
        rgb = image.convert('RGB')
        # Frozen probes lie inside the left edge of each coat at the fixed pose.
        # Background occlusion removed these pixels in the first two renders.
        points = [(300, 700), (1100, 700)]
        values = [rgb.getpixel(point) for point in points]
        if not all(r > g > b and r - b >= 70 and g - b >= 45 for r, g, b in values):
            raise ValueError(f'SPIKE_EDGE_OCCLUDED {values}')
    return {'status': 'PASS_FIXED_EDGE_PROBES', 'dimensions': [1920, 1080],
            'sha256': hashlib.sha256(raw).hexdigest(), 'probes': [list(p) for p in points],
            'rgb': values, 'scope': 'Checks a known clipping regression at two pixels, not antialiasing or art quality.'}

if __name__ == '__main__':
    if len(sys.argv) != 2: raise SystemExit('usage: verify_image.py FILE')
    print(json.dumps(verify(Path(sys.argv[1]))))
