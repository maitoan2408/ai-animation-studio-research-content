"""Apply a small camera pullback note directly to existing native VSE curves.
Run inside Blender after opening a packaged S04. No evaluator/JSON regenerate.
The original project is never saved over. This is same-agent editability evidence,
not a substitute for the required independent operator handoff.
"""
from pathlib import Path
import json,sys
import bpy
out=Path(sys.argv[sys.argv.index('--')+1]);out.mkdir(parents=True,exist_ok=False)
scene=bpy.context.scene;scene.frame_set(73);scene.render.filepath=str(out/'before.png');bpy.ops.render.render(write_still=True)
factor=.97;changed=0
for action in bpy.data.actions:
    for curve in action.fcurves:
        if curve.data_path.endswith(('.transform.offset_x','.transform.offset_y','.transform.scale_x','.transform.scale_y')):
            for key in curve.keyframe_points:
                key.co[1]*=factor;key.handle_left[1]*=factor;key.handle_right[1]*=factor
            curve.update();changed+=1
if not changed:raise RuntimeError('NO_EDITABLE_TRANSFORM_CURVES')
scene.frame_set(1);scene.frame_set(73)
scene.render.filepath=str(out/'after.png');bpy.ops.render.render(write_still=True)
# These paths are still relative to the opened source, so Blender's default
# relative_remap=True is REQUIRED here, unlike the destination-ready packager.
bpy.ops.wm.save_as_mainfile(filepath=str(out/'edited.blend'),relative_remap=True)
(out/'edit.json').write_text(json.dumps({'note':'Pull camera back3% around screen centre, all frames','scaleFactor':factor,'modifiedCurves':changed,'frame':72,'operator':'delegated-agent','scope':'Native curves only; independent operator pending'},indent=2))
print(json.dumps({'output':str(out),'modifiedCurves':changed}))
