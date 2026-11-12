"""Validated profiles for the bounded Q2 media experiment.

Profile metadata is necessary but not sufficient: pixel/color and alpha tests
are independent. Callers never infer the transfer function from a filename.
"""
from __future__ import annotations

import hashlib
import json
import math
import subprocess
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
CONTRACT = json.loads((ROOT / 'brief/media-contract-v1.json').read_text())
CONTRACT_V2 = json.loads((ROOT / 'brief/media-contract-v2.json').read_text())


class MediaError(ValueError):
    """Stable code plus a useful explanation for a rejected media boundary."""


def sha256(file: Path) -> str:
    digest = hashlib.sha256()
    with file.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def command(argv: list[str], timeout: int = 180) -> bytes:
    result = subprocess.run(argv, capture_output=True, timeout=timeout)
    if result.returncode:
        raise MediaError(f'PROCESS_FAILED {argv[0]} exit={result.returncode}: '
                         + result.stderr.decode(errors='replace')[-3000:])
    return result.stdout


def probe(file: Path) -> dict[str, Any]:
    return json.loads(command(['ffprobe', '-v', 'error', '-count_frames',
                              '-show_streams', '-show_format', '-of', 'json', str(file)]))


def validate_probe(data: dict[str, Any], profile: str, frames: int) -> None:
    if profile not in ('master', 'review', 'review_v2') or type(frames) is not int or frames < 1:
        raise MediaError('INVALID_PROFILE_REQUEST')
    spec = CONTRACT_V2['review'] if profile == 'review_v2' else CONTRACT[profile]
    streams = data.get('streams', [])
    videos = [s for s in streams if s.get('codec_type') == 'video']
    audios = [s for s in streams if s.get('codec_type') == 'audio']
    if len(streams) != 2 or len(videos) != 1 or len(audios) != 1:
        raise MediaError('STREAM_LAYOUT: exactly one video and one audio required')
    expected_video = {
        'codec_name': spec['codec'], 'pix_fmt': spec['pixelFormat'],
        'width': spec['width'], 'height': spec['height'],
        'r_frame_rate': spec['fps'], 'avg_frame_rate': spec['fps'],
        'nb_read_frames': str(frames), 'color_primaries': spec['primaries'],
        'color_transfer': spec['transfer'], 'color_space': spec['matrix'],
        'color_range': spec['range'], 'start_time': '0.000000',
    }
    expected_audio = {
        'codec_name': spec['audioCodec'], 'sample_rate': spec['sampleRate'],
        'channels': spec['channels'], 'start_time': '0.000000',
    }
    for kind, actual, expected in [('video', videos[0], expected_video),
                                   ('audio', audios[0], expected_audio)]:
        for field, value in expected.items():
            if actual.get(field) != value:
                raise MediaError(f'PROFILE_MISMATCH {kind}.{field}: '
                                 f'{actual.get(field)!r} != {value!r}')
    # MP4/AAC may carry final padding samples. Presentation duration must remain
    # within a single sample of the declared frame boundary, not +/- a frame.
    for kind, stream in [('video', videos[0]), ('audio', audios[0])]:
        duration = float(stream.get('duration', -1))
        if not math.isfinite(duration) or abs(duration - frames / 24) > 1 / 48000:
            raise MediaError(f'DURATION_MISMATCH {kind}')


def audio_packet_hash(file: Path) -> str:
    packets = command(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(file),
                       '-map', '0:a:0', '-c:a', 'copy', '-f', 'adts', '-'])
    return hashlib.sha256(packets).hexdigest()
