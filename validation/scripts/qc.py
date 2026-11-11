"""Inspect decoded media, not only success codes/duration metadata."""
from pathlib import Path
import hashlib
import json
import subprocess
from fractions import Fraction
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
out = root / 'out'
results = {'media': {}, 'raster_comparison': [], 'timebase': {}}

def run(*args):
    return subprocess.check_output(args)

for p in sorted(out.glob('*.mp4')):
    probe = json.loads(run('ffprobe','-v','error','-count_frames','-show_entries',
                          'stream=index,codec_name,width,height,r_frame_rate,nb_read_frames,duration,sample_rate',
                          '-of','json',str(p)))
    data = {'streams': probe['streams'], 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
    if any(s['codec_name']=='aac' for s in probe['streams']) and 'study' in p.name:
        pcm = np.frombuffer(run('ffmpeg','-v','error','-i',str(p),'-map','0:a:0','-ac','1','-ar','48000','-f','f32le','-'),dtype='<f4')
        # AAC can produce small pre-echo: use an explicit 0.08 amplitude threshold.
        onsets=[]
        for expected in [48000,144000]:
            local=np.where(np.abs(pcm[expected-2400:expected+2400])>.08)[0]
            onset=int(expected-2400+local[0]) if len(local) else None
            onsets.append({'expected_sample':expected,'observed_sample':onset,
                           'error_ms':None if onset is None else (onset-expected)/48})
        data.update(audio_onsets=onsets,decoded_samples=len(pcm),peak_amplitude=float(np.max(np.abs(pcm))))
    results['media'][p.name]=data

for frame in [0,23,24,47,48,71,72,95,96,119,120,239]:
    paths=[out/f'{name}-{frame}.png' for name in ['hyperframes','remotion']]
    if not all(p.exists() for p in paths):continue
    # Compare on a fixed white background; PNG alpha is handled explicitly.
    imgs=[]
    for p in paths:
        im=Image.open(p).convert('RGBA');bg=Image.new('RGBA',im.size,'white');bg.alpha_composite(im)
        imgs.append(np.array(bg.convert('RGB')).astype('int16'))
    diff=np.abs(imgs[0]-imgs[1])
    results['raster_comparison'].append({'frame':frame,'max_channel_error':int(diff.max()),
         'mean_channel_error':float(diff.mean()),'different_pixel_fraction':float(np.any(diff>0,axis=2).mean()),
         'hf_marker_red':bool(np.array_equal(imgs[0][15,15],[255,0,0])),
         'remotion_marker_red':bool(np.array_equal(imgs[1][15,15],[255,0,0])),
         'expected_marker_red':24<=frame<72})

results['timebase']={
 'raw_rgba_1080p_600s_24fps_bytes':1920*1080*4*600*24,
 'samples_per_frame_24fps':int(Fraction(48000,24)),
 'samples_per_frame_ntsc':str(Fraction(48000*1001,30000)),
 'round_each_frame_drift_ms_after_18000_ntsc_frames':float((round(Fraction(48000*1001,30000))*18000-Fraction(48000*1001,30000)*18000)/48),
 'report_hyperframes_x_at_frame119':360*(119/24)/5,
 'report_remotion_x_at_frame119':360,
}
checks=[]
for name,data in results['media'].items():
    v=next(s for s in data['streams'] if s['codec_name']=='h264')
    if 'study' in name:
        checks += [{'id':name+':video','pass':v['nb_read_frames']=='240' and v['r_frame_rate']=='24/1' and (v['width'],v['height'])==(640,360)},
                   {'id':name+':sync','pass':all(x['error_ms'] is not None and abs(x['error_ms'])<=1000/24 for x in data['audio_onsets'])}]
    if 'myvideo' in name or 'report' in name:
        checks.append({'id':name+':video','pass':v['nb_read_frames']=='120' and v['r_frame_rate']=='24/1' and (v['width'],v['height'])==(1920,1080)})
for x in results['raster_comparison']:
    checks.append({'id':f'clip-boundary-{x["frame"]}','pass':x['hf_marker_red']==x['remotion_marker_red']==x['expected_marker_red']})
results['checks']=checks
(root/'evidence').mkdir(exist_ok=True)
(root/'evidence/media-qc.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks':len(checks),'failures':[x for x in checks if not x['pass']],
                  'max_mean_raster_error':max((x['mean_channel_error'] for x in results['raster_comparison']),default=None),
                  'timebase':results['timebase']},ensure_ascii=False,indent=2))
if any(not x['pass'] for x in checks):raise SystemExit(1)
