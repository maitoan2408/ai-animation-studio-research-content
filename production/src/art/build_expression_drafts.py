"""Generate a separate reversible development pack of modified original heads."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/lantern-polish-1';OUT=ROOT/'assets/lantern-expression-f2-draft-2'
def sha(data):return hashlib.sha256(data).hexdigest()
def generate():
 data=(SOURCE/'manifest.json').read_bytes(); pack=json.loads(data); assets={a['id']:a for a in pack['assets']}; rows=[]
 for actor in ('mai','an'):
  for view in ('front','quarter','profile'):
   original=assets[f'{actor}/head-{view}-neutral'];raw=(SOURCE/original['file']).read_bytes()
   if sha(raw)!=original['sha256']:raise ValueError('EXPRESSION_SOURCE_HASH')
   eye_x=[70,116] if view=='front' else ([95,130] if view=='quarter' else [126])
   for mood in ('sad','surprised','angry'):
    text=raw.decode('utf-8')
    for i,x in enumerate(eye_x):
     y=104 if i==0 else 102
     old=f'M{x-7} {y-13}Q{x} {y-17} {x+6} {y-13}'
     if mood=='sad':
      new=(f'M{x-7} {y-16}Q{x} {y-19} {x+6} {y-12}' if i==1 else f'M{x-7} {y-12}Q{x} {y-19} {x+6} {y-16}')
     elif mood=='surprised':new=f'M{x-7} {y-19}Q{x} {y-23} {x+6} {y-19}'
     else:
      new=(f'M{x-7} {y-11}Q{x} {y-14} {x+6} {y-17}' if i==1 else f'M{x-7} {y-17}Q{x} {y-14} {x+6} {y-11}')
     if text.count(old)!=1:raise ValueError('EXPRESSION_BROW_PATTERN')
     text=text.replace(old,new)
     if mood=='surprised':
      eye=f'<ellipse cx="{x}" cy="{y}" rx="3.4" ry="5"'
      if text.count(eye)!=1:raise ValueError('EXPRESSION_EYE_PATTERN')
      text=text.replace(eye,f'<ellipse cx="{x}" cy="{y}" rx="3.4" ry="6.5"')
    result=text.encode();ident=f'{actor}/head-{view}-{mood}';file=f'{ident}.svg';dest=OUT/file
    dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.exists() and dest.read_bytes()!=result:raise ValueError('EXPRESSION_IMMUTABLE '+ident)
    if not dest.exists():dest.write_bytes(result)
    rows.append({**original,'id':ident,'file':file,'sha256':sha(result),'source':'project-original-derived-development','dependsOn':original['sha256']})
 manifest={'version':'lantern-expression-f2-draft-2','status':'PROVISIONAL_NOT_APPROVED',
  'derivedFromManifestSha256':sha(data),'note':'Separate development head variants; rig and artistic approval pending.', 'assets':rows}
 payload=(json.dumps(manifest,indent=2)+'\n').encode();target=OUT/'manifest.json'
 if target.exists() and target.read_bytes()!=payload:raise ValueError('EXPRESSION_IMMUTABLE_MANIFEST')
 if not target.exists():target.write_bytes(payload)
 return manifest
if __name__=='__main__':
 m=generate();print(json.dumps({'status':m['status'],'assets':len(m['assets']),'manifestSha256':sha((OUT/'manifest.json').read_bytes())}))
