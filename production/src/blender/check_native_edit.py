"""Verify a note can be applied to the restored .blend and survives reopening."""
from pathlib import Path
import hashlib,json,os,subprocess,sys,uuid
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2];source=Path(sys.argv[1]).resolve();output=root/'out/native-edit'/uuid.uuid4().hex
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
original_hash=sha(source);env=dict(os.environ,BLENDER_USER_CONFIG='/tmp/studio-blender-config')
subprocess.run(['blender','--background',str(source),'--python-exit-code','1','--python',str(root/'src/blender/edit_native_note.py'),'--',str(output)],env=env,check=True)
if sha(source)!=original_hash:raise RuntimeError('SOURCE_PROJECT_MUTATED')
before=np.asarray(Image.open(output/'before.png'));after=np.asarray(Image.open(output/'after.png'))
changed=int(np.count_nonzero(np.any(before!=after,axis=2)))
if changed<500:raise RuntimeError('NATIVE_NOTE_NOT_VISIBLE')
subprocess.run(['blender','--background',str(output/'edited.blend'),'--python-exit-code','1','--python',str(root/'src/blender/reopen_frames.py'),'--',str(output/'reopen')],env=env,check=True)
for i in [2,5]:
    if not np.array_equal(after,np.asarray(Image.open(output/'reopen'/f'{i}-72.png'))):raise RuntimeError('NATIVE_EDIT_LOST_ON_REOPEN')
report={'status':'PASS_TECHNICAL','changedPixels':changed,'sourceProjectSha256':original_hash,'editedProjectSha256':sha(output/'edited.blend'),'sourceUnchanged':True,'editedFrameReopensExactly':True,'operator':'delegated-agent','limits':['Same-agent fresh-process test; not an independent operator','No full native semantic rig UI']}
(output/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'output':str(output),**report}))
