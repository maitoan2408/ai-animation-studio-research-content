"""Test a single encode from native sRGB PNG, preserving the failed v1 fixture.

No threshold or patch geometry changes. The intended fix removes the lossy
BT709 intermediate; AAC packets still come from the verified fixture master.
"""
import json
import sys
import uuid
from pathlib import Path
from contracts import ROOT, command, sha256, probe, validate_probe, audio_packet_hash

NATIVE_FILTER = ('zscale=primariesin=709:transferin=iec61966-2-1:matrixin=gbr:rangein=full:'
                 'primaries=709:transfer=iec61966-2-1:matrix=709:range=limited,format=yuv420p')


def build(fixture_path: Path, rgb: bool = False, full_range: bool = False) -> Path:
    fixture = json.loads(fixture_path.read_text())
    reference = Path(fixture['reference'])
    if sha256(reference) != fixture['referenceSha256']:
        raise ValueError('REFERENCE_HASH_MISMATCH')
    out = ROOT / 'out/native-color-chart' / uuid.uuid4().hex
    out.mkdir(parents=True)
    argv = ['ffmpeg', '-v', 'error', '-nostdin', '-loop', '1', '-framerate', '24',
            '-i', str(reference), '-i', fixture['master'], '-map', '0:v:0', '-map', '1:a:0',
            '-t', '2', '-vf', NATIVE_FILTER, '-c:v', 'libx264', '-crf', '12',
            '-preset', 'fast', '-threads', '2', '-color_primaries', 'bt709',
            '-color_trc', 'iec61966-2-1', '-colorspace', 'bt709', '-color_range', 'tv',
            '-c:a', 'copy', '-movflags', '+faststart', str(out / 'delivery.mp4')]
    if full_range:
        # Transform RGB into full-range YUV samples, not a metadata retag.
        # Tests keep the original max3 / inset2. Master stays limited-range709.
        argv[argv.index(NATIVE_FILTER)] = NATIVE_FILTER.replace('range=limited', 'range=full')
        argv[argv.index('-color_range') + 1] = 'pc'
    if rgb:
        # Separate lossless RGB review experiment. Master/profile v1 untouched.
        argv = ['ffmpeg', '-v', 'error', '-nostdin', '-loop', '1', '-framerate', '24',
                '-i', str(reference), '-i', fixture['master'], '-map', '0:v:0', '-map', '1:a:0',
                '-t', '2', '-vf', 'format=rgb24', '-c:v', 'libx264rgb', '-crf', '0',
                '-preset', 'fast', '-threads', '2', '-color_primaries', 'bt709',
                '-color_trc', 'iec61966-2-1', '-colorspace', 'rgb', '-color_range', 'pc',
                '-c:a', 'copy', '-movflags', '+faststart', str(out / 'delivery.mp4')]
    (out / 'command.json').write_text(json.dumps(argv, indent=2) + '\n')
    command(argv)
    output_probe = probe(out / 'delivery.mp4')
    if not rgb and not full_range:
        validate_probe(output_probe, 'review', 48)
    if audio_packet_hash(out / 'delivery.mp4') != audio_packet_hash(Path(fixture['master'])):
        raise ValueError('AUDIO_PACKETS_CHANGED')
    (out / 'result.json').write_text(json.dumps({
        'status': 'CANDIDATE_GENERATED' if rgb or full_range else 'PASS_TECHNICAL', 'deliverySha256': sha256(out / 'delivery.mp4'),
        'fixture': str(fixture_path), 'fixtureSha256': sha256(fixture_path),
        'profile': 'web-review-rgb-candidate' if rgb else ('web-review-full-range-candidate' if full_range else 'web-review-srgb-1'),
        'derivation': 'native-png-lossless-rgb' if rgb else 'native-png-single-encode-crf12',
        'probe': output_probe, 'limits': ['Pixel gate must be measured separately']}, indent=2) + '\n')
    return out


if __name__ == '__main__':
    print(json.dumps({'output': str(build(Path(sys.argv[1]), '--rgb' in sys.argv[2:], '--full-range' in sys.argv[2:]))}))
