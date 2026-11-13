"""Candidate B: native editable cutout planes and per-frame F-curves in Blender.

Usage: blender -b --factory-startup --python-exit-code 1 --python this.py -- S01 640 8 0,48,120
Arguments: shot, width, Eevee samples, selected 0-based frames or 'all'.
This is a measured candidate, not a wrapper around candidate A PNG/video output.
Each object retains asset id/pivot metadata; camera and animation are native keys.
"""
from pathlib import Path
import datetime
import hashlib
import json
import math
import sys
import time
import uuid
import bpy

ROOT=Path(__file__).resolve().parents[2]
args=sys.argv[sys.argv.index('--')+1:]
shot=args[0];width=int(args[1]);samples=int(args[2]);selection=args[3]
if shot not in ['S01','S02','S03','S04','S05','S06'] or width not in [640,1920] or samples<1:
 raise ValueError('INVALID_BENCHMARK_ARGUMENT')
source=ROOT/'out/blender-input'/f'{shot}.json';data=json.loads(source.read_text())
frames=data['frames'];selected=list(range(len(frames))) if selection=='all' else [int(f) for f in selection.split(',')]
if any(f<0 or f>=len(frames) for f in selected):raise ValueError('FRAME_OUT_OF_RANGE')
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
out=ROOT/'out/candidate-b'/f'{stamp}-{shot}-{width}-{samples}-{uuid.uuid4().hex[:8]}'
out.mkdir(parents=True)
(out/'request.json').write_text(json.dumps({'shot':shot,'width':width,'samples':samples,'selectedFrames':selected,'status':'RUNNING','inputSha256':hashlib.sha256(source.read_bytes()).hexdigest()},indent=2))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.name=shot;scene.render.engine='BLENDER_EEVEE_NEXT'
scene.eevee.taa_render_samples=samples
scene.render.resolution_x=width;scene.render.resolution_y=width*9//16;scene.render.resolution_percentage=100
scene.render.fps=24;scene.frame_start=1;scene.frame_end=len(frames)
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=False
scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
scene.world.color=(.5,.5,.5)
bpy.ops.object.camera_add(location=(0,0,1000));camera=bpy.context.object;camera.name='Camera_authored_multiplane';camera.data.type='ORTHO';camera.data.ortho_scale=1920;camera.data.clip_end=4000;scene.camera=camera
assets={a['id']:a for a in data['pack']['assets']};textures={t['id']:t for t in data['textures']['textures']};materials={};objects={}
def material(asset_id):
 if asset_id in materials:return materials[asset_id]
 spec=textures[asset_id];file=ROOT/'out/art-q1'/spec['file']
 if hashlib.sha256(file.read_bytes()).hexdigest()!=spec['sha256']:raise RuntimeError(f'TEXTURE_HASH {asset_id}')
 mat=bpy.data.materials.new(asset_id);mat.use_nodes=True;mat.surface_render_method='BLENDED'
 nodes=mat.node_tree.nodes;nodes.clear();output=nodes.new('ShaderNodeOutputMaterial');emit=nodes.new('ShaderNodeEmission');transparent=nodes.new('ShaderNodeBsdfTransparent');mix=nodes.new('ShaderNodeMixShader');tex=nodes.new('ShaderNodeTexImage')
 tex.image=bpy.data.images.load(str(file));tex.image.colorspace_settings.name='sRGB';tex.image.alpha_mode='STRAIGHT';tex.interpolation='Linear'
 link=mat.node_tree.links.new;link(tex.outputs['Color'],emit.inputs['Color']);link(tex.outputs['Alpha'],mix.inputs[0]);link(transparent.outputs[0],mix.inputs[1]);link(emit.outputs[0],mix.inputs[2]);link(mix.outputs[0],output.inputs['Surface'])
 materials[asset_id]=mat;return mat
for frame in frames:
 for item in frame['sprites']:
  key=item['id']+':'+item['asset']
  if key in objects:continue
  a=assets[item['asset']];w=a['width'];h=a['height'];px,py=a['pivot']
  verts=[(-px,py-h,0),(w-px,py-h,0),(w-px,py,0),(-px,py,0)]
  mesh=bpy.data.meshes.new(key);mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.update()
  uv=mesh.uv_layers.new(name='UVMap')
  for i,point in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=point
  obj=bpy.data.objects.new(key,mesh);scene.collection.objects.link(obj);obj.data.materials.append(material(item['asset']))
  obj['asset_id']=item['asset'];obj['pivot']=a['pivot'];obj['source_sha256']=a['sha256'];objects[key]=obj
for index,frame in enumerate(frames):
 n=index+1;present={s['id']+':'+s['asset']:s for s in frame['sprites']}
 for key,obj in objects.items():
  item=present.get(key);obj.hide_render=item is None;obj.hide_viewport=item is None
  obj.keyframe_insert('hide_render',frame=n);obj.keyframe_insert('hide_viewport',frame=n)
  if item is None:continue
  obj.location=(item['x']-960,540-item['y'],item['z']);obj.rotation_euler=(0,0,-math.radians(item['rotation']));obj.scale=(item['scaleX'],item['scaleY'],1)
  for prop in ['location','rotation_euler','scale']:obj.keyframe_insert(prop,frame=n)
 c=frame['camera'];camera.location=(c['x']-960,540-c['y'],1000);camera.data.ortho_scale=1920/c['zoom'];camera.keyframe_insert('location',frame=n);camera.data.keyframe_insert('ortho_scale',frame=n)
# Linear sampled keys; no Bezier overshoot between exact 24fps poses.
for action in bpy.data.actions:
 for curve in action.fcurves:
  for key in curve.keyframe_points:key.interpolation='LINEAR'
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/f'{shot}.blend'))
results=[]
for frame in selected:
 scene.frame_set(frame+1);scene.render.filepath=str(out/f'{frame:06d}.png');began=time.monotonic();bpy.ops.render.render(write_still=True)
 result={'frame':frame,'seconds':time.monotonic()-began,'sha256':hashlib.sha256((out/f'{frame:06d}.png').read_bytes()).hexdigest()};results.append(result);print(json.dumps(result),flush=True)
 (out/'progress.json').write_text(json.dumps(results,indent=2))
report={'status':'PASS_RENDER_ONLY','candidate':'B','shot':shot,'version':bpy.app.version_string,'engine':scene.render.engine,'samples':samples,'width':width,'frames':len(frames),'rendered':results,'nativeFile':f'{shot}.blend','scope':'Native planes/F-curves; creative/QC gate separate'}
(out/'result.json').write_text(json.dumps(report,indent=2));print(json.dumps({'out':str(out),**report}),flush=True)
