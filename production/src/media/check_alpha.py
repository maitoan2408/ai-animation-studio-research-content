"""Real authored PNG alpha roundtrip and black/white composition preflight.

Expected tolerances are locked in media-contract-v1.json. The reference equation
uses display-referred encoded sRGB values, matching this isolated FFmpeg image
boundary. This does not assert that every scene renderer blends in that space.
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path

import numpy as np
from PIL import Image
from contracts import CONTRACT, ROOT, command, sha256


def check() -> Path:
    textures = json.loads((ROOT / 'out/art-q2-polish/textures.json').read_text())['textures']
    selected = ['props/cup-accent', 'shadow/props/cup-accent']
    output = ROOT / 'out/alpha-contract' / uuid.uuid4().hex
    output.mkdir(parents=True)
    tolerance = CONTRACT['testsLockedBeforeExecution']['straightAlphaComposition']
    rows = []
    for index, identifier in enumerate(selected):
        spec = next(item for item in textures if item['id'] == identifier)
        source = ROOT / 'out/art-q1' / spec['file']
        if sha256(source) != spec['sha256']:
            raise ValueError('TEXTURE_HASH_MISMATCH ' + identifier)
        pixels = np.asarray(Image.open(source).convert('RGBA'))
        height, width = pixels.shape[:2]
        alpha = pixels[:, :, 3].astype(float) / 255
        extracted = output / f'{index}-alpha.png'
        command(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(source),
                 '-vf', 'alphaextract', '-frames:v', '1', str(extracted)])
        if not np.array_equal(np.asarray(Image.open(extracted)), pixels[:, :, 3]):
            raise ValueError('ALPHA_EXTRACT_CHANGED')
        merged = output / f'{index}-merged.png'
        command(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(source), '-i', str(extracted),
                 '-filter_complex', '[0:v]format=rgb24[rgb];[1:v]format=gray[a];[rgb][a]alphamerge,format=rgba[out]',
                 '-map', '[out]', '-frames:v', '1', str(merged)])
        if not np.array_equal(np.asarray(Image.open(merged))[:, :, 3], pixels[:, :, 3]):
            raise ValueError('ALPHA_ROUNDTRIP_CHANGED')
        for background in [0, 255]:
            backdrop = output / f'{index}-bg-{background}.png'
            Image.new('RGBA', (width, height), (background, background, background, 255)).save(backdrop)
            reference = np.rint(pixels[:, :, :3] * alpha[:, :, None]
                                + background * (1 - alpha[:, :, None]))
            for interpretation in ['straight', 'premultiplied']:
                target = output / f'{index}-{background}-{interpretation}.png'
                command(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(backdrop), '-i', str(source),
                         '-filter_complex', f'[0:v]format=rgba[bg];[1:v]format=rgba[fg];[bg][fg]overlay=alpha={interpretation}:format=rgb,format=rgba[out]',
                         '-map', '[out]', '-frames:v', '1', str(target)])
                actual = np.asarray(Image.open(target).convert('RGB')).astype(float)
                difference = np.abs(reference - actual)
                within = (float(difference.mean()) <= tolerance['meanAbsoluteMax']
                          and int(difference.max()) <= tolerance['absoluteMax'])
                if interpretation == 'straight' and not within:
                    raise ValueError(f'STRAIGHT_ALPHA_COMPOSITE {identifier} bg={background}')
                if interpretation == 'premultiplied' and within:
                    raise ValueError('NEGATIVE_ALPHA_CASE_NOT_DETECTED')
                rows.append({'asset': identifier, 'sourceSha256': spec['sha256'],
                             'background': background, 'interpretation': interpretation,
                             'meanAbsoluteRGB': float(difference.mean()),
                             'maxAbsoluteRGB': int(difference.max()),
                             'expected': 'PASS' if interpretation == 'straight' else 'REJECT',
                             'expectedObserved': True})
    report = {'status': 'PASS_TECHNICAL', 'contract': CONTRACT['version'],
              'alphaRoundtripsExact': len(selected), 'cases': rows,
              'scope': 'Two authored assets at the PNG/FFmpeg boundary; no full scene-art approval'}
    (output / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    return output


if __name__ == '__main__':
    print(json.dumps({'output': str(check()), 'status': 'PASS_TECHNICAL'}))
