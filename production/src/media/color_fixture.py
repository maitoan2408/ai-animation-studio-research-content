"""Generate a fresh color-chart master and truthful review copy for Q2 tests."""
import json
import uuid
from PIL import Image, ImageDraw
from contracts import ROOT, command, sha256
from derive_review import derive

out = ROOT / 'out/color-chart' / uuid.uuid4().hex
out.mkdir(parents=True)
colors = [(v, v, v) for v in [0, 32, 64, 96, 128, 160, 192, 224, 255]] + [
    (41, 73, 87), (126, 170, 163), (245, 223, 179), (213, 163, 75),
    (188, 99, 81), (34, 79, 80), (255, 0, 0), (0, 255, 0),
    (0, 0, 255), (0, 255, 255), (255, 0, 255)]
canvas = Image.new('RGB', (1920, 1080))
draw = ImageDraw.Draw(canvas)
patches = []
for index, color in enumerate(colors):
    x, y = index % 5 * 384, index // 5 * 270
    draw.rectangle((x, y, x + 383, y + 269), fill=color)
    patches.append({'rgb': color, 'bounds': [x, y, x + 384, y + 270]})
canvas.save(out / 'reference.png')
command(['ffmpeg', '-v', 'error', '-nostdin', '-loop', '1', '-framerate', '24',
         '-i', str(out / 'reference.png'), '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
         '-t', '2', '-vf', 'zscale=primariesin=709:transferin=iec61966-2-1:matrixin=gbr:rangein=full:primaries=709:transfer=709:matrix=709:range=limited,format=yuv420p',
         '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-threads', '2',
         '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
         '-color_range', 'tv', '-c:a', 'aac', '-ar', '48000', '-ac', '2', str(out / 'master.mp4')])
review = derive(out / 'master.mp4', sha256(out / 'master.mp4'), 48)
report = {'reference': str(out / 'reference.png'), 'referenceSha256': sha256(out / 'reference.png'),
          'patches': patches, 'master': str(out / 'master.mp4'), 'review': str(review)}
(out / 'fixture.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'output': str(out), 'review': str(review)}))
