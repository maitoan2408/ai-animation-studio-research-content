"""Split large local review media for Git and restore it with exact byte checks.

Chunking changes transport only, never the video encoding or artifact identity.
No chunk exceeds32MiB. Restore validates manifest, safe names, lengths and SHA;
existing mismatched outputs are refused rather than overwritten. A failed restore
leaves its temporary file as evidence and can be retried from the immutable parts.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import re
import shutil
import uuid
from pathlib import Path
from contracts import MediaError, sha256

CHUNK_BYTES = 32 * 1024 * 1024


def pack(source: Path, directory: Path) -> dict:
    result = json.loads((source / 'result.json').read_text())
    video = source / 'delivery.mp4'
    if result.get('status') != 'PASS_TECHNICAL' or sha256(video) != result.get('deliverySha256'):
        raise MediaError('UNVERIFIED_DELIVERY')
    directory.mkdir(parents=True, exist_ok=False)
    chunks = []
    with video.open('rb') as stream:
        index = 0
        while block := stream.read(CHUNK_BYTES):
            name = f'part-{index:03d}.bin'
            with (directory / name).open('xb') as output:
                output.write(block)
            chunks.append({'file': name, 'bytes': len(block), 'sha256': hashlib.sha256(block).hexdigest()})
            index += 1
    manifest = {'schemaVersion': 1, 'output': 'review.mp4', 'bytes': video.stat().st_size,
                'sha256': result['deliverySha256'], 'chunks': chunks}
    for name in ['result.json','source-frames.json','command.json','source-yuv.framemd5','decoded-yuv.framemd5']:
        shutil.copy2(source / name, directory / name)
    with (directory / 'bundle.json').open('x') as output:
        json.dump(manifest, output, indent=2); output.write('\n')
    return manifest


def restore(directory: Path) -> Path:
    directory = directory.resolve()
    manifest = json.loads((directory / 'bundle.json').read_text())
    if manifest.get('schemaVersion') != 1 or manifest.get('output') != 'review.mp4':
        raise MediaError('INVALID_BUNDLE')
    expected = manifest.get('sha256', '')
    size = manifest.get('bytes')
    if not isinstance(expected, str) or not re.fullmatch('[a-f0-9]{64}', expected) or type(size) is not int or not 0 < size <= 200 * 1024 * 1024:
        raise MediaError('INVALID_BUNDLE_IDENTITY')
    chunks = manifest.get('chunks')
    if not isinstance(chunks, list) or not 1 <= len(chunks) <= 7:
        raise MediaError('INVALID_CHUNKS')
    total = 0
    for index, chunk in enumerate(chunks):
        if not isinstance(chunk, dict) or chunk.get('file') != f'part-{index:03d}.bin':
            raise MediaError('UNSAFE_CHUNK_NAME')
        if type(chunk.get('bytes')) is not int or not 0 < chunk['bytes'] <= CHUNK_BYTES:
            raise MediaError('INVALID_CHUNK_SIZE')
        if not isinstance(chunk.get('sha256'), str) or not re.fullmatch('[a-f0-9]{64}', chunk['sha256']):
            raise MediaError('INVALID_CHUNK_HASH')
        file = directory / chunk['file']
        if file.is_symlink() or not file.is_file() or file.stat().st_size != chunk['bytes']:
            raise MediaError('INVALID_CHUNK_FILE')
        total += chunk['bytes']
    if total != size:
        raise MediaError('BUNDLE_SIZE_MISMATCH')
    target = directory / 'review.mp4'
    if target.exists() or target.is_symlink():
        if target.is_symlink() or not target.is_file() or target.stat().st_size != size or sha256(target) != expected:
            raise MediaError('EXISTING_OUTPUT_MISMATCH')
        return target
    temporary = directory / f'restore-{uuid.uuid4().hex}.tmp'
    digest = hashlib.sha256()
    with temporary.open('xb') as output:
        for chunk in chunks:
            block = (directory / chunk['file']).read_bytes()
            if len(block) != chunk['bytes'] or hashlib.sha256(block).hexdigest() != chunk['sha256']:
                raise MediaError('CHUNK_HASH_MISMATCH')
            digest.update(block); output.write(block)
        output.flush(); os.fsync(output.fileno())
    if temporary.stat().st_size != size or digest.hexdigest() != expected:
        raise MediaError('RESTORED_HASH_MISMATCH')
    # Exclusive publication: concurrent restores can only reuse identical output.
    try:
        os.link(temporary, target)
    except FileExistsError:
        if target.is_symlink() or not target.is_file() or sha256(target) != expected:
            raise MediaError('CONCURRENT_OUTPUT_MISMATCH')
    temporary.unlink()
    handle = os.open(directory, os.O_RDONLY)
    try: os.fsync(handle)
    finally: os.close(handle)
    return target


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='action', required=True)
    packing = sub.add_parser('pack'); packing.add_argument('source', type=Path); packing.add_argument('directory', type=Path)
    restoring = sub.add_parser('restore'); restoring.add_argument('root', type=Path)
    args = parser.parse_args()
    if args.action == 'pack':
        print(json.dumps(pack(args.source, args.directory)))
    else:
        manifests = sorted(args.root.glob('*/bundle.json'))
        if not manifests:
            raise MediaError('NO_BUNDLES')
        print(json.dumps({'status': 'PASS_EXACT_RESTORE', 'files': [str(restore(file.parent)) for file in manifests]}))
