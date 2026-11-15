"""Inventory SVG semantics before deciding whether an extrusion can preserve them.

This does not convert art or assert a visual match. Paths are confined to the
manifest directory; malformed/missing artwork fails the complete inventory.
"""
from __future__ import annotations
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path
import xml.etree.ElementTree as ET

SVG = '{http://www.w3.org/2000/svg}'

def inventory(manifest: Path) -> dict:
    root = manifest.resolve().parent
    data = json.loads(manifest.read_text(encoding='utf-8'))
    assets = data['assets']
    if not isinstance(assets, list) or not assets:
        raise ValueError('ASSET_INVENTORY_EMPTY')
    rows = []
    seen = set()
    for asset in assets:
        name, filename = asset['id'], asset['file']
        if name in seen:
            raise ValueError('ASSET_DUPLICATE_ID')
        seen.add(name)
        file = (root / filename).resolve()
        if not file.is_relative_to(root) or not file.is_file():
            raise ValueError('ASSET_PATH_INVALID')
        raw = file.read_bytes()
        svg = ET.fromstring(raw)
        if svg.tag != SVG + 'svg':
            raise ValueError('ASSET_NOT_SVG')
        tags = Counter()
        features = set()
        for element in svg.iter():
            tag = element.tag.removeprefix(SVG)
            tags[tag] += 1
            if tag in ('filter', 'mask', 'clipPath', 'linearGradient', 'radialGradient', 'image', 'text', 'use', 'style'):
                features.add(tag)
            for k, value in element.attrib.items():
                local = k.rsplit('}', 1)[-1]
                if local in ('filter', 'mask', 'clip-path', 'style', 'transform', 'opacity', 'fill-opacity', 'stroke-opacity'):
                    features.add(local)
                if local == 'stroke' and value != 'none':
                    features.add('stroke')
                if local in ('fill', 'stroke') and 'url(' in value:
                    features.add('paint-server')
        rows.append({'id': name, 'file': filename, 'sha256': hashlib.sha256(raw).hexdigest(),
                     'width': asset['width'], 'height': asset['height'], 'pivot': asset['pivot'],
                     'features': sorted(features), 'tags': dict(sorted(tags.items()))})
    counts = Counter(feature for row in rows for feature in row['features'])
    return {'schemaVersion': 1, 'manifestSha256': hashlib.sha256(manifest.read_bytes()).hexdigest(),
            'assetCount': len(rows), 'featureAssetCounts': dict(sorted(counts.items())), 'assets': rows,
            'limitations': ['Inventory only; absence of a listed feature does not prove an SVG is safe to extrude.',
                            'No visual equivalence, shadow or artistic approval is asserted.']}

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('usage: inventory_svg.py MANIFEST')
    print(json.dumps(inventory(Path(sys.argv[1])), ensure_ascii=False, indent=2))
