"""Make a portable, hash-manifested native VSE package for all six shots.
Called in Blender with --python-exit-code 1. No dependency on original absolute
texture paths remains in the saved projects. Source input JSON is retained.
Usage: -- <selection.json> <new-output-directory>
Selection maps S01..S06 to completed take directories; output must not exist.
"""
from pathlib import Path
import hashlib,json,shutil,sys,zipfile
import bpy
args=sys.argv[sys.argv.index('--')+1:];selection=json.loads(Path(args[0]).read_text());out=Path(args[1]).resolve()
out.mkdir(parents=True,exist_ok=False)
for n in ['project','textures','source']: (out/n).mkdir()
for shot,take_path in selection.items():
 if shot not in ['S01','S02','S03','S04','S05','S06']:raise ValueError('UNKNOWN_SHOT')
 take=Path(take_path);result=json.loads((take/'result.json').read_text())
 if result['status']!='PASS_TECHNICAL':raise RuntimeError('TAKE_NOT_COMPLETE')
 bpy.ops.wm.open_mainfile(filepath=str(take/f'{shot}.blend'))
 for strip in bpy.context.scene.sequence_editor.sequences_all:
  if strip.type!='IMAGE':raise RuntimeError('UNSUPPORTED_NATIVE_STRIP')
  for element in strip.elements:
   source=Path(bpy.path.abspath(strip.directory))/element.filename
   digest=hashlib.sha256(source.read_bytes()).hexdigest();name=digest+'.png';target=out/'textures'/name
   if not target.exists():shutil.copy2(source,target)
   element.filename=name
  strip.directory='//../textures/'
 bpy.context.scene.frame_set(1)
 # Paths above are already relative to the DESTINATION project directory.
 # Blender's default relative_remap would reinterpret them against the old take
 # and rewrite them into broken paths during Save As (EX-019).
 bpy.ops.wm.save_as_mainfile(filepath=str(out/'project'/f'{shot}.blend'),relative_remap=False)
 shutil.copy2(take/'inputs.json',out/'source'/f'{shot}.json')
(out/'README.txt').write_text('Q2 native VSE projects, Blender 4.3.2. Open '+', '.join(f'project/{shot}.blend' for shot in selection)+'.\nTextures are relative and SHA256-addressed. Source JSON preserves authored frames.\nThese are benchmark fixtures, not the story pilot or production release.\nOriginal artwork belongs to this project; voice is not embedded in these image-strip files.\nRepository: https://github.com/maitoan2408/ai-animation-studio-research-content\nSee production/ENVIRONMENT.md for licenses; Q1 listening review remains open.\n')
files={str(f.relative_to(out)):hashlib.sha256(f.read_bytes()).hexdigest() for f in out.rglob('*') if f.is_file()}
(out/'manifest.json').write_text(json.dumps({'schemaVersion':1,'files':files,'shots':list(selection),'blender':bpy.app.version_string},indent=2))
archive=out.with_suffix('.zip')
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED) as z:
 for f in out.rglob('*'):
  if f.is_file():z.write(f,f.relative_to(out))
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'files':len(files)}))
