"""Encode a new local web review from exact native PNGs, with independent QC.

Input is the verified editorial result timeline and its normalized BT709 master.
This never re-renders or modifies native takes, old masters, or previous review
attempts. All 1,152 decoded YUV frame hashes must match the PNG conversion.
"""
from __future__ import annotations
import argparse
import datetime as dt
import json
import uuid
from pathlib import Path
from contracts import ROOT, CONTRACT_V2, MediaError, command, sha256, probe, validate_probe, audio_packet_hash

NATIVE_FULL_FILTER = ('zscale=primariesin=709:transferin=iec61966-2-1:matrixin=gbr:rangein=full:'
                      'primaries=709:transfer=iec61966-2-1:matrix=709:range=full,format=yuv420p')


def frame_hashes(payload: bytes) -> list[str]:
    return [row.split(',')[-1].strip() for row in payload.decode().splitlines() if row and not row.startswith('#')]


def encode(timeline_file: Path, master: Path, expected_master: str) -> Path:
    sequence = json.loads(timeline_file.read_text())
    if sequence.get('status') != 'PASS_TECHNICAL' or type(sequence.get('frames')) is not int:
        raise MediaError('INVALID_SEQUENCE')
    frames = sequence['frames']
    if frames < 1 or frames > 24 * 600 or sha256(master) != expected_master:
        raise MediaError('INVALID_MASTER_OR_FRAME_COUNT')
    validate_probe(probe(master), 'master', frames)
    original_audio = audio_packet_hash(master)
    out = ROOT / 'out/native-web-review' / uuid.uuid4().hex
    (out / 'frames').mkdir(parents=True)
    request = {'status': 'RUNNING', 'createdAt': dt.datetime.now(dt.timezone.utc).isoformat(),
               'profile': CONTRACT_V2['review']['id'], 'revision': sequence['revision'],
               'timelineFile': str(timeline_file.resolve()), 'timelineSha256': sha256(timeline_file),
               'masterSha256': expected_master, 'frames': frames}
    (out / 'request.json').write_text(json.dumps(request, indent=2) + '\n')
    try:
        cursor = 0
        sources = []
        for shot in sequence['timeline']:
            if shot['startFrame'] != cursor or shot['endFrameExclusive'] <= cursor:
                raise MediaError('NONCONTIGUOUS_TIMELINE')
            take = Path(shot['take']).resolve()
            if not take.is_relative_to(ROOT / 'out/candidate-b-vse'):
                raise MediaError('UNEXPECTED_NATIVE_TAKE_ROOT')
            count = shot['endFrameExclusive'] - cursor
            # The native renderer names files by zero-based local frame.
            # Flattened FFmpeg input below is deliberately one-based.
            for local_frame in range(count):
                source = take / f'{local_frame:06d}.png'
                if not source.is_file():
                    raise MediaError(f'MISSING_NATIVE_FRAME {shot["shot"]} {local_frame}')
                cursor += 1
                sources.append({'frame': cursor-1, 'shot': shot['shot'],
                                'path': str(source.relative_to(ROOT)), 'sha256': sha256(source)})
                (out / 'frames' / f'{cursor:06d}.png').symlink_to(source)
        if cursor != frames:
            raise MediaError('FRAME_COUNT_MISMATCH')
        (out / 'source-frames.json').write_text(json.dumps(sources, indent=2) + '\n')
        pattern = str(out / 'frames/%06d.png')
        target = out / 'delivery.mp4'
        argv = ['ffmpeg', '-v', 'error', '-nostdin', '-threads', '2', '-framerate', '24',
                '-start_number', '1', '-i', pattern, '-i', str(master), '-map', '0:v:0', '-map', '1:a:0',
                '-vf', NATIVE_FULL_FILTER, '-c:v', 'libx264', '-preset', 'fast', '-crf', '0',
                '-threads', '2', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1',
                '-colorspace', 'bt709', '-color_range', 'pc', '-c:a', 'copy',
                '-movflags', '+faststart', str(target)]
        (out / 'command.json').write_text(json.dumps(argv, indent=2) + '\n')
        command(argv, timeout=600)
        output_probe = probe(target)
        validate_probe(output_probe, 'review_v2', frames)
        command(['ffmpeg', '-v', 'error', '-nostdin', '-threads', '2', '-i', str(target), '-f', 'null', '-'])
        reference = command(['ffmpeg', '-v', 'error', '-nostdin', '-threads', '2', '-framerate', '24',
                             '-start_number', '1', '-i', pattern, '-vf', NATIVE_FULL_FILTER,
                             '-c:v', 'rawvideo', '-threads', '2', '-f', 'framemd5', '-'], timeout=600)
        actual = command(['ffmpeg', '-v', 'error', '-nostdin', '-threads', '2', '-i', str(target),
                          '-map', '0:v:0', '-c:v', 'rawvideo', '-threads', '2', '-f', 'framemd5', '-'], timeout=600)
        (out / 'source-yuv.framemd5').write_bytes(reference)
        (out / 'decoded-yuv.framemd5').write_bytes(actual)
        if len(frame_hashes(actual)) != frames or frame_hashes(actual) != frame_hashes(reference):
            raise MediaError('DECODED_YUV_SEQUENCE_MISMATCH')
        if original_audio != audio_packet_hash(target):
            raise MediaError('AAC_PACKETS_CHANGED')
        if sha256(master) != expected_master or sha256(timeline_file) != request['timelineSha256']:
            raise MediaError('SOURCE_CHANGED')
        for source in sources:
            if sha256(ROOT / source['path']) != source['sha256']:
                raise MediaError('NATIVE_FRAME_CHANGED')
        result = {**request, 'status': 'PASS_TECHNICAL', 'probe': output_probe,
                  'deliverySha256': sha256(target), 'bytes': target.stat().st_size,
                  'sourceFramesSha256': sha256(out / 'source-frames.json'),
                  'exactDecodedYuvFrames': frames, 'aacPacketSha256': original_audio,
                  'sourceAndMasterUnchanged': True,
                  'limits': ['4:2:0 conversion is not lossless RGB', 'Player/art/listening gates separate']}
        (out / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
        return out
    except Exception as error:
        (out / 'result.json').write_text(json.dumps({**request, 'status': 'FAIL', 'error': str(error)}, indent=2) + '\n')
        raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('timeline', type=Path)
    parser.add_argument('master', type=Path)
    parser.add_argument('--sha256', required=True)
    args = parser.parse_args()
    print(json.dumps({'output': str(encode(args.timeline.resolve(), args.master.resolve(), args.sha256))}))
