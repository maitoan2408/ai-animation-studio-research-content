"""Derive a truthful sRGB-transfer review MP4 from a verified BT709 master.

The output has a new hash/profile and retains source identity. It does not
inherit a previous review. The master and AAC packets remain untouched.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import uuid
from pathlib import Path

from contracts import (CONTRACT, ROOT, MediaError, audio_packet_hash, command,
                       probe, sha256, validate_probe)

# Both ends are specified: this transforms samples, not just the VUI tag.
REVIEW_FILTER = (
    'zscale=primariesin=709:transferin=709:matrixin=709:rangein=limited:'
    'primaries=709:transfer=iec61966-2-1:matrix=709:range=limited,format=yuv420p'
)


def derive(source: Path, expected_hash: str, frames: int) -> Path:
    source = source.resolve()
    if sha256(source) != expected_hash:
        raise MediaError('SOURCE_HASH_MISMATCH')
    source_probe = probe(source)
    validate_probe(source_probe, 'master', frames)
    original_audio_hash = audio_packet_hash(source)
    directory = ROOT / 'out/web-review' / uuid.uuid4().hex
    directory.mkdir(parents=True)
    request = {
        'status': 'RUNNING', 'source': str(source), 'sourceSha256': expected_hash,
        'sourceProfile': CONTRACT['master']['id'],
        'outputProfile': CONTRACT['review']['id'], 'frames': frames,
        'createdAt': dt.datetime.now(dt.timezone.utc).isoformat(),
    }
    (directory / 'request.json').write_text(json.dumps(request, indent=2) + '\n')
    target = directory / 'delivery.mp4'
    argv = [
        'ffmpeg', '-v', 'error', '-nostdin', '-i', str(source),
        '-map', '0:v:0', '-map', '0:a:0', '-vf', REVIEW_FILTER,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-threads', '2',
        '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1',
        '-colorspace', 'bt709', '-color_range', 'tv', '-c:a', 'copy',
        '-movflags', '+faststart', str(target),
    ]
    (directory / 'command.json').write_text(json.dumps(argv, indent=2) + '\n')
    try:
        command(argv)
        result_probe = probe(target)
        validate_probe(result_probe, 'review', frames)
        command(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(target), '-f', 'null', '-'])
        if audio_packet_hash(target) != original_audio_hash:
            raise MediaError('AUDIO_PACKETS_CHANGED')
        if sha256(source) != expected_hash:
            raise MediaError('SOURCE_CHANGED_DURING_DERIVATION')
        result = {
            **request, 'status': 'PASS_TECHNICAL', 'probe': result_probe,
            'deliverySha256': sha256(target), 'aacPacketSha256': original_audio_hash,
            'masterUnchanged': True, 'audioPacketsExact': True,
            'ffmpegVersion': command(['ffmpeg', '-version']).decode().splitlines()[0],
            'limits': ['Distinct sRGB-transfer review copy, not BT709 master',
                       'Pixel/player tests and artistic review remain separate'],
        }
        (directory / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
        return directory
    except Exception as error:
        (directory / 'result.json').write_text(json.dumps({**request, 'status': 'FAIL',
                                                          'error': str(error)}, indent=2) + '\n')
        raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--sha256', required=True)
    parser.add_argument('--frames', type=int, required=True)
    args = parser.parse_args()
    output = derive(args.source, args.sha256, args.frames)
    print(json.dumps({'output': str(output), 'status': 'PASS_TECHNICAL'}))
