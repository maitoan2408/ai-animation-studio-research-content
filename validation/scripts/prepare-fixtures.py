"""Materialize local, reproducible inputs; no image/voice service is used."""
from pathlib import Path
import json
import math
import shutil
import struct
import wave

root = Path(__file__).resolve().parents[1]
fixtures = root / 'fixtures'
out = root / 'out'
out.mkdir(exist_ok=True)
for name in ['hyperframes-report', 'hyperframes-editable', 'hyperframes-study', 'hyperframes-missing']:
    (fixtures / name / 'assets').mkdir(parents=True, exist_ok=True)
    shutil.copy(root / 'node_modules/gsap/dist/gsap.min.js', fixtures / name / 'assets/gsap.min.js')
    (fixtures / name / 'hyperframes.json').write_text('{}\n')

report = (fixtures / 'hyperframes-report.html').read_text()
wrapper = '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0}</style><script src="assets/gsap.min.js"></script></head><body>'
(fixtures / 'hyperframes-report/index.html').write_text(wrapper + report + '</body></html>')
editable = report.replace('  <div class="clip" data-start="0"\n       data-duration="5" data-track-index="0">\n    <div id="paper">Paper-cut study</div>\n  </div>',
                         '  <div id="paper" class="clip" data-start="0" data-duration="5" data-track-index="0">Paper-cut study</div>')
(fixtures / 'hyperframes-editable/index.html').write_text(wrapper + editable + '</body></html>')

# A 10 second PCM fixture with short pulses starting at exactly 1 and 3 seconds.
# These are sync markers, not a speech/lip-sync quality benchmark.
public = fixtures / 'public'
public.mkdir(exist_ok=True)
with wave.open(str(public / 'sync.wav'), 'wb') as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(48000)
    f.writeframes(b''.join(struct.pack('<h', int(8000 * math.sin(2 * math.pi * 1000 * i / 48000)))
                          if 48000 <= i < 52800 or 144000 <= i < 148800 else b'\0\0'
                          for i in range(480000)))
shutil.copy(public / 'sync.wav', fixtures / 'hyperframes-study/assets/sync.wav')
shutil.copy(fixtures / 'scene.js', fixtures / 'hyperframes-study/assets/scene.js')

study = wrapper + '''
<div id="shot" data-composition-id="shot" data-width="640" data-height="360" data-start="0" data-duration="10" data-fps="24">
  <div class="clip" data-start="0" data-duration="10" data-track-index="0"><div id="scene"></div></div>
  <div id="window" class="clip" data-start="1" data-duration="2" data-track-index="1" style="position:absolute;left:8px;top:8px;width:30px;height:30px;background:#f00"></div>
  <audio id="sync" class="clip" src="assets/sync.wav" data-start="0" data-duration="10" data-track-index="2"></audio>
</div>
<script src="assets/scene.js"></script>
<script>
const clock = { frame: 0 };
const paint = () => { document.querySelector('#scene').innerHTML = studySvg(Math.round(clock.frame)); };
paint();
const timeline = gsap.timeline({paused:true});
timeline.to(clock, {frame:239, duration:239/24, ease:'none', onUpdate:paint}, 0);
timeline.to({}, {duration:1/24}, 239/24);
window.__timelines = {shot:timeline};
</script></body></html>'''
(fixtures / 'hyperframes-study/index.html').write_text(study)
missing = wrapper + '''
<div id="shot" data-composition-id="shot" data-width="320" data-height="180" data-start="0" data-duration="0.5" data-fps="24">
<img id="missing" class="clip" src="assets/does-not-exist.png" data-start="0" data-duration="0.5" data-track-index="0" width="80" height="80">
</div><script>const t=gsap.timeline({paused:true}); t.to({}, {duration:0.5}); window.__timelines={shot:t};</script></body></html>'''
(fixtures / 'hyperframes-missing/index.html').write_text(missing)
print('Prepared report examples, paper-cut/multiplane fixture, audio markers and missing-image case.')
