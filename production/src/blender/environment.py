"""Q1 Blender 4.3 environment smoke, with a real transparent art texture.

This proves renderer availability only. It does not substitute for six-shot B
authoring, movement, shadows or editor round-trip. Native .blend stays in out/.
"""
from pathlib import Path
import json
import time
import bpy

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'out/blender-environment';OUT.mkdir(parents=True,exist_ok=True)
texture=ROOT/'out/art-q1/textures/mai/head-quarter-neutral.png'
if not texture.is_file():raise RuntimeError('Run art/preview.ts before Blender preflight')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=320;scene.render.resolution_y=320;scene.render.resolution_percentage=100
scene.render.fps=24;scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.filepath=str(OUT/'smoke.png')
scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
scene.view_settings.exposure=0;scene.view_settings.gamma=1
bpy.ops.mesh.primitive_plane_add(size=2,location=(0,0,0));plane=bpy.context.object
plane.name='Mai_paper_cutout'
material=bpy.data.materials.new('Paper_sRGB_alpha');material.use_nodes=True
material.surface_render_method='DITHERED'
nodes=material.node_tree.nodes;nodes.clear()
output=nodes.new('ShaderNodeOutputMaterial');shader=nodes.new('ShaderNodeBsdfPrincipled')
shader.inputs['Roughness'].default_value=1
tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(texture));tex.image.colorspace_settings.name='sRGB'
material.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
material.node_tree.links.new(tex.outputs['Alpha'],shader.inputs['Alpha'])
material.node_tree.links.new(shader.outputs['BSDF'],output.inputs['Surface'])
plane.data.materials.append(material)
bpy.ops.object.camera_add(location=(0,0,4));camera=bpy.context.object
camera.data.type='ORTHO';camera.data.ortho_scale=2.3;scene.camera=camera
bpy.ops.object.light_add(type='AREA',location=(0,0,3));light=bpy.context.object
light.data.energy=180;light.data.shape='DISK';light.data.size=4
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'smoke.blend'))
start=time.monotonic();bpy.ops.render.render(write_still=True);elapsed=time.monotonic()-start
report={'version':bpy.app.version_string,'engine':scene.render.engine,'size':[320,320],
        'elapsed_seconds':elapsed,'texture':str(texture.relative_to(ROOT)),
        'native_file':'smoke.blend','render':'smoke.png','scope':'Environment and alpha-texture smoke only'}
(OUT/'manifest.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
