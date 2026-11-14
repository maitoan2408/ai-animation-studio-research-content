"""Reproducibility comparisons; caller supplies calibrated profile thresholds.

Data are SHA-256 byte-exact. Raster comparison composites alpha over a declared
background, measures FFmpeg SSIM on RGB-derived frames and Delta E76 using Pillow
ImageCms' 8-bit Lab conversion. Quantization and FFmpeg version are reported; this
is not a universal artistic threshold. No threshold means no PASS/FAIL verdict.
"""
from __future__ import annotations
import hashlib
import math
import re
import subprocess
import tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageCms, __version__ as pillow_version


def compare_data(reference: bytes, actual: bytes) -> dict:
    first = hashlib.sha256(reference).hexdigest()
    second = hashlib.sha256(actual).hexdigest()
    return {'pass': first == second, 'referenceSha256': first, 'actualSha256': second}


def compare_images(reference: Path, actual: Path, thresholds: dict | None) -> dict:
    if thresholds is None:
        return {'status': 'NEEDS_CALIBRATION', 'reason': 'Threshold profile is absent'}
    if set(thresholds) != {'ssim_min', 'delta_e76_max', 'alpha_background'}:
        raise ValueError('INVALID_THRESHOLD_PROFILE')
    ssim_min, delta_max, bg = thresholds['ssim_min'], thresholds['delta_e76_max'], thresholds['alpha_background']
    if (isinstance(ssim_min, bool) or not isinstance(ssim_min, (float, int)) or not math.isfinite(ssim_min)
        or not 0 <= ssim_min <= 1 or isinstance(delta_max, bool) or not isinstance(delta_max, (float, int))
        or not math.isfinite(delta_max) or delta_max < 0 or not isinstance(bg, list) or len(bg) != 3
        or any(isinstance(x, bool) or not isinstance(x, int) or x < 0 or x > 255 for x in bg)):
        raise ValueError('INVALID_THRESHOLD_PROFILE')
    images = []
    for path in (reference, actual):
        with Image.open(path) as source:
            rgba = source.convert('RGBA')
            canvas = Image.new('RGBA', rgba.size, tuple(bg) + (255,))
            images.append(Image.alpha_composite(canvas, rgba).convert('RGB'))
    if images[0].size != images[1].size or min(images[0].size) < 8:
        raise ValueError('INVALID_IMAGE_DIMENSIONS')
    transform = ImageCms.buildTransformFromOpenProfiles(ImageCms.createProfile('sRGB'), ImageCms.createProfile('LAB'), 'RGB', 'LAB')
    labs = []
    for image in images:
        lab = np.asarray(ImageCms.applyTransform(image, transform), dtype=np.float64)
        lab[:,:,0] *= 100 / 255
        lab[:,:,1:] -= 128
        labs.append(lab)
    delta = np.sqrt(np.sum((labs[0] - labs[1]) ** 2, axis=2))
    with tempfile.TemporaryDirectory(prefix='studio-ssim-') as tmp:
        left, right = Path(tmp)/'reference.png', Path(tmp)/'actual.png'
        images[0].save(left); images[1].save(right)
        result = subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(left),'-i',str(right),'-lavfi','ssim','-frames:v','1','-f','null','-'], capture_output=True, text=True, timeout=30, check=True)
    match = re.search(r'All:([0-9.]+)', result.stderr)
    if not match:
        raise ValueError('SSIM_UNAVAILABLE')
    ssim = float(match.group(1)); max_delta = float(delta.max())
    if not math.isfinite(ssim) or not math.isfinite(max_delta):
        raise ValueError('NONFINITE_METRIC')
    version = subprocess.run(['ffmpeg','-version'],capture_output=True,text=True,timeout=10,check=True).stdout.splitlines()[0]
    return {'status': 'PASS' if ssim >= ssim_min and max_delta <= delta_max else 'FAIL',
            'ssim': ssim, 'maxDeltaE76': max_delta, 'meanDeltaE76': float(delta.mean()),
            'referenceSha256': hashlib.sha256(reference.read_bytes()).hexdigest(),
            'actualSha256': hashlib.sha256(actual.read_bytes()).hexdigest(),
            'thresholds': thresholds, 'size': list(images[0].size), 'pillow': pillow_version,
            'numpy': np.__version__, 'littlecms': ImageCms.core.littlecms_version, 'ffmpeg': version,
            'limits': ['8-bit Lab is quantized; no artistic approval', 'Inputs assumed sRGB; embedded ICC profiles not transformed', 'Thresholds are caller supplied, not universal']}
