"""Restore exact S05 textures from the committed R3 native package.

No browser rerasterization, arbitrary ZIP extraction, or old cache is required.
Only manifest-verified SHA-addressed PNGs used by S05 are written to a new,
content-addressed folder. Existing bytes must match; corrupted output is rejected.
"""
from pathlib import Path
import hashlib
import json
import os
import sys
import uuid
import zipfile

ROOT = Path(__file__).resolve().parents[2]
ARCHIVE_SHA = 'd5a8aa9c807b9c95f4ddcfbc9c1b0591f6035e601e285053d614a7e7ed06c309'


def digest(payload):
    return hashlib.sha256(payload).hexdigest()


def prepare():
    archive = ROOT / 'artifacts/Q2/s05-r3/native-S05-R3.zip'
    payload = archive.read_bytes()
    if digest(payload) != ARCHIVE_SHA:
        raise ValueError('HERO_TEXTURE_ARCHIVE_HASH')
    with zipfile.ZipFile(archive) as handle:
        manifest = json.loads(handle.read('manifest.json'))
        source = handle.read('source/S05.json')
        if digest(source) != manifest['files']['source/S05.json']:
            raise ValueError('HERO_TEXTURE_SOURCE_HASH')
        data = json.loads(source)
        used = {s['asset'] for f in data['frames'] for s in f['sprites']}
        current = json.loads((ROOT / 'assets/lantern-polish-1/manifest.json').read_text())
        assets = {a['id']: a for a in current['assets']}
        entries = {}
        textures = []
        target = ROOT / 'out/hero-textures' / ARCHIVE_SHA
        # VSE resolves these relative paths against out/art-q1.
        (ROOT / 'out/art-q1').mkdir(parents=True, exist_ok=True)
        for texture in data['textures']['textures']:
            if texture['id'] not in used:
                continue
            if assets[texture['id']]['sha256'] != texture['sourceSha256']:
                raise ValueError('HERO_TEXTURE_ART_CHANGED ' + texture['id'])
            name = texture['sha256'] + '.png'
            key = 'textures/' + name
            raw = handle.read(key)
            if digest(raw) != texture['sha256'] or manifest['files'].get(key) != texture['sha256']:
                raise ValueError('HERO_TEXTURE_BYTES ' + texture['id'])
            entries[name] = raw
            textures.append({**texture, 'file': os.path.relpath(target / name, ROOT / 'out/art-q1')})
        if {t['id'] for t in textures} != used:
            raise ValueError('HERO_TEXTURE_COVERAGE')
    index = {'pack': current['version'], 'sourceArchiveSha256': ARCHIVE_SHA, 'textures': textures}
    entries['textures.json'] = (json.dumps(index, indent=2) + '\n').encode()
    if target.exists():
        for name, raw in entries.items():
            if (target / name).read_bytes() != raw:
                raise ValueError('HERO_TEXTURE_CACHE_CHANGED ' + name)
    else:
        temporary = target.parent / uuid.uuid4().hex
        temporary.mkdir(parents=True)
        for name, raw in entries.items():
            (temporary / name).write_bytes(raw)
        temporary.rename(target)
    print(json.dumps({'status': 'PASS_EXACT_TEXTURES', 'textures': len(textures),
                      'manifest': str(target / 'textures.json'), 'sourceArchiveSha256': ARCHIVE_SHA}))


if __name__ == '__main__':
    prepare()
