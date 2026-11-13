"""Q2 bounded optimization experiment inside Blender: native VSE cutout strips.
Eevee 1080p samples measured ~5.3s/frame; test whether a 2D compositor can preserve
the locked orthographic/multiplane representation with less render overhead.
This does not support physical light, free 3D cameras or bones. Never called Eevee.
"""
from pathlib import Path
import datetime, hashlib, json, math, os, shutil, subprocess, sys, time, uuid
import bpy

ROOT=Path(__file__).resolve().parents[2]
args=sys.argv[sys.argv.index('--')+1:];shot=args[0];width=int(args[1]);selection=args[2]
if shot not in ['S01','S02','S03','S04','S05','S06'] or width not in [640,1920]:raise ValueError('INVALID_ARGUMENT')
source=Path(os.environ.get('BENCHMARK_INPUT_DIR',str(ROOT/'out/blender-input')))/f'{shot}.json';data=json.loads(source.read_text());frames=data['frames']
selected=list(range(len(frames))) if selection=='all' else [int(f) for f in selection.split(',')]
if any(f<0 or f>=len(frames) for f in selected):raise ValueError('FRAME_OUT_OF_RANGE')
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
out=ROOT/'out/candidate-b-vse'/f'{stamp}-{shot}-{width}-{uuid.uuid4().hex[:8]}';out.mkdir(parents=True)
(out/'request.json').write_text(json.dumps({'status':'RUNNING','shot':shot,'width':width,'selectedFrames':selected,'inputSha256':hashlib.sha256(source.read_bytes()).hexdigest()},indent=2))
shutil.copy2(source,out/'inputs.json')
scene=bpy.context.scene;scene.name=shot;scene.render.resolution_x=width;scene.render.resolution_y=width*9//16;scene.render.resolution_percentage=100
scene.render.fps=24;scene.frame_start=1;scene.frame_end=len(frames);scene.render.use_sequencer=True
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
seq=scene.sequence_editor_create();assets={a['id']:a for a in data['pack']['assets']};textures={t['id']:t for t in data['textures']['textures']}
unique={}
for frame in frames:
 for s in frame['sprites']:unique.setdefault(s['id']+':'+s['asset'],s)
ordered=sorted(unique.items(),key=lambda item:item[1]['z']);strips={};factor=width/1920
for channel,(key,s) in enumerate(ordered,start=1):
 spec=textures[s['asset']];file=ROOT/'out/art-q1'/spec['file']
 if hashlib.sha256(file.read_bytes()).hexdigest()!=spec['sha256']:raise RuntimeError('TEXTURE_HASH '+s['asset'])
 strip=seq.sequences.new_image(key,str(file),channel,frame_start=1,fit_method='ORIGINAL')
 strip.frame_final_duration=len(frames)
 strip.blend_type='ALPHA_OVER';strip.alpha_mode='STRAIGHT';strip.colorspace_settings.name='sRGB'
 strip['asset_id']=s['asset'];strip['source_sha256']=assets[s['asset']]['sha256'];strips[key]=strip
for i,frame in enumerate(frames):
 present={s['id']+':'+s['asset']:s for s in frame['sprites']};camera=frame['camera'];n=i+1
 for key,strip in strips.items():
  s=present.get(key);strip.blend_alpha=s['opacity'] if s else 0;strip.keyframe_insert('blend_alpha',frame=n)
  if not s:continue
  a=assets[s['asset']];tex=textures[s['asset']];rad=math.radians(s['rotation']);dx=(a['width']/2-a['pivot'][0])*s['scaleX'];dy=(a['height']/2-a['pivot'][1])*s['scaleY']
  cx=s['x']+dx*math.cos(rad)-dy*math.sin(rad);cy=s['y']+dx*math.sin(rad)+dy*math.cos(rad)
  # VSE flip is applied after the strip transform in output-frame coordinates.
  # Conjugate translation/rotation so mirroring stays local to the character.
  fx=-1 if s['scaleX']<0 else 1;fy=-1 if s['scaleY']<0 else 1
  transform=strip.transform;transform.offset_x=(cx-camera['x'])*camera['zoom']*factor*fx;transform.offset_y=(camera['y']-cy)*camera['zoom']*factor*fy
  transform.scale_x=abs(s['scaleX'])*a['width']/tex['width']*camera['zoom']*factor;transform.scale_y=abs(s['scaleY'])*a['height']/tex['height']*camera['zoom']*factor;transform.rotation=-rad*fx*fy
  strip.use_flip_x=s['scaleX']<0;strip.use_flip_y=s['scaleY']<0
  for prop in ['offset_x','offset_y','scale_x','scale_y','rotation']:transform.keyframe_insert(prop,frame=n)
  for prop in ['use_flip_x','use_flip_y']:strip.keyframe_insert(prop,frame=n)
for action in bpy.data.actions:
 for curve in action.fcurves:
  for key in curve.keyframe_points:key.interpolation='LINEAR'
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(out/f'{shot}.blend'))
results=[];cache={}
for f in selected:
 frame_key=hashlib.sha256(json.dumps(frames[f],sort_keys=True).encode()).hexdigest()
 reuse=cache.get(frame_key);start=time.monotonic()
 if reuse is None:
  scene.frame_set(f+1);scene.render.filepath=str(out/f'{f:06d}.png');bpy.ops.render.render(write_still=True);cache[frame_key]=f
 else:os.link(out/f'{reuse:06d}.png',out/f'{f:06d}.png')
 results.append({'frame':f,'seconds':time.monotonic()-start,'reusedFrame':reuse,'sha256':hashlib.sha256((out/f'{f:06d}.png').read_bytes()).hexdigest()})
 (out/'progress.json').write_text(json.dumps(results,indent=2));print(json.dumps(results[-1]),flush=True)
report={'status':'PASS_RENDER_ONLY','candidate':'B-VSE-experiment','shot':shot,'version':bpy.app.version_string,'width':width,'frames':len(frames),'rendered':results,'nativeFile':f'{shot}.blend','limits':['Native VSE 2D composition; no 3D camera/light/bones','Creative and random-seek comparison pending']}
if selection=='all':
 argv=['ffmpeg','-v','error','-nostdin','-y','-framerate','24','-i',str(out/'%06d.png'),'-vf','zscale=primariesin=709:transferin=iec61966-2-1:matrixin=gbr:rangein=full:primaries=709:transfer=709:matrix=709:range=limited,format=yuv420p','-c:v','libx264','-preset','fast','-crf','18','-threads','2','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv',str(out/'picture.mp4')]
 (out/'encode-argv.json').write_text(json.dumps(argv,indent=2));subprocess.run(argv,check=True)
 voice_dir=ROOT/('artifacts/Q2/edit-R1/voice' if data['edit'].get('voiceTake')=='R1' else 'artifacts/Q1/draft-3/voice')
 voice_manifest=json.loads((voice_dir/'manifest.json').read_text());voice_sha=hashlib.sha256((voice_dir/'scene.wav').read_bytes()).hexdigest()
 if voice_sha!=voice_manifest['files']['scene.wav']:raise RuntimeError('VOICE_FIXTURE_HASH')
 audio=['-i',str(voice_dir/'scene.wav')] if shot=='S01' else ['-f','lavfi','-i','anullsrc=r=48000:cl=stereo']
 subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-i',str(out/'picture.mp4'),*audio,'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-ar','48000','-ac','2','-b:a','192k','-t',str(len(frames)/24),'-movflags','+faststart',str(out/'delivery.mp4')],check=True)
 subprocess.run(['ffmpeg','-v','error','-nostdin','-i',str(out/'delivery.mp4'),'-f','null','-'],check=True)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(out/'delivery.mp4')]))
 v=next(s for s in probe['streams'] if s['codec_type']=='video');a=next(s for s in probe['streams'] if s['codec_type']=='audio')
 if (v['nb_read_frames']!=str(len(frames)) or v['width']!=width or v['height']!=width*9//16 or v['r_frame_rate']!='24/1' or v['color_space']!='bt709' or v['color_range']!='tv' or a['channels']!=2 or a['sample_rate']!='48000'):raise RuntimeError('MEDIA_PROFILE_FAILED')
 report.update(status='PASS_TECHNICAL',probe=probe,audioInputSha256=voice_sha if shot=='S01' else None,deliverySha256=hashlib.sha256((out/'delivery.mp4').read_bytes()).hexdigest())
(out/'result.json').write_text(json.dumps(report,indent=2));print(json.dumps({'out':str(out),**report}),flush=True)
