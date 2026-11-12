"""Restore into a fresh path, verify every hash, reopen Blender, random seek.
This is same-agent clean-path replay, not an independent artist handoff."""
from pathlib import Path,PurePosixPath
import hashlib,json,os,subprocess,sys,uuid,zipfile
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2];archive=Path(sys.argv[1]);reference=Path(sys.argv[2]);out=root/'out/restore'/uuid.uuid4().hex;out.mkdir(parents=True)
with zipfile.ZipFile(archive) as z:
 for n in z.namelist():
  p=PurePosixPath(n)
  if p.is_absolute() or '..' in p.parts:raise RuntimeError('UNSAFE_ARCHIVE_PATH')
 z.extractall(out)
manifest=json.loads((out/'manifest.json').read_text())
for n,digest in manifest['files'].items():
 if hashlib.sha256((out/n).read_bytes()).hexdigest()!=digest:raise RuntimeError('PACKAGE_HASH '+n)
env=dict(os.environ,BLENDER_USER_CONFIG='/tmp/studio-blender-config')
subprocess.run(['blender','--background',str(out/'project/S05.blend'),'--python-exit-code','1','--python',str(root/'src/blender/reopen_frames.py'),'--',str(out/'replay')],env=env,check=True)
rows=[]
for i,frame in enumerate([191,0,72,48,191,72]):
 actual=np.asarray(Image.open(out/'replay'/f'{i}-{frame}.png'));expected=np.asarray(Image.open(reference/f'{frame:06d}.png'))
 exact=np.array_equal(actual,expected);rows.append({'frame':frame,'pixelsExact':exact,'fileSha256':hashlib.sha256((out/'replay'/f'{i}-{frame}.png').read_bytes()).hexdigest()})
 if not exact:raise RuntimeError(f'NATIVE_REPLAY_MISMATCH {frame}')
report={'status':'PASS','restoredFiles':len(manifest['files']),'order':[r['frame'] for r in rows],'samples':rows,'scope':'Fresh path/process native replay; same agent, not an independent operator'}
(out/'replay-report.json').write_text(json.dumps(report,indent=2));print(json.dumps({'output':str(out),**report}))
