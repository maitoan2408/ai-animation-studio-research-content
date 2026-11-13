"""Render existing native project in a new process and non-monotonic order.
Usage: blender -b portable/project/S05.blend --python-exit-code 1 --python this.py -- output
Pixel comparisons are performed outside Blender by check_portable.py.
"""
from pathlib import Path
import sys
import bpy
out=Path(sys.argv[sys.argv.index('--')+1]);out.mkdir(parents=True,exist_ok=False)
for i,frame in enumerate([191,0,72,48,191,72]):
 bpy.context.scene.frame_set(frame+1);bpy.context.scene.render.filepath=str(out/f'{i}-{frame}.png');bpy.ops.render.render(write_still=True)
