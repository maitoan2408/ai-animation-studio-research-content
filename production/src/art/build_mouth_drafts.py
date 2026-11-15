"""Create independent, provisional editable mouth drawings; old pack remains untouched."""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/lantern-mouth-f2-draft'
# New marks use the dimensions, pivot and palette of existing original mouth SVGs.
SHAPES={
 'U': '<ellipse cx="17" cy="14" rx="3.2" ry="4.8" fill="#623b35"/><path d="M12 12Q17 8 22 12M12 16Q17 20 22 16" fill="none" stroke="#b96762" stroke-width="1.5" stroke-linecap="round"/>',
 'L': '<path d="M7 10Q17 8 27 10L25 18Q17 21 9 18Z" fill="#623b35"/><path d="M9 10H25L24 12H10Z" fill="#f8e4be"/><path d="M14 18Q17 10 20 18Z" fill="#b96762"/>',
 'teeth': '<path d="M7 11Q17 8 27 11L26 17Q17 20 8 17Z" fill="#623b35"/><path d="M9 11Q17 10 25 11L24 15H10Z" fill="#f8e4be"/>',
}
def generate():
 OUT.mkdir(parents=True,exist_ok=True);items=[]
 for name,body in SHAPES.items():
  payload=(f'<svg xmlns="http://www.w3.org/2000/svg" width="36" height="28" viewBox="0 0 36 28"><g>{body}</g></svg>\n').encode()
  dest=OUT/f'{name}.svg'
  if dest.exists() and dest.read_bytes()!=payload:raise ValueError('DRAFT_IMMUTABLE_EXISTING '+name)
  if not dest.exists():dest.write_bytes(payload)
  items.append({'id':f'mouth/{name}','file':dest.name,'width':36,'height':28,'pivot':[17,14],
     'sha256':hashlib.sha256(payload).hexdigest(),'source':'project-original-development'})
 manifest={'version':'lantern-mouth-f2-draft-1','status':'PROVISIONAL_NOT_APPROVED',
   'note':'Separate draft supplement; no phoneme mapping, rig integration, or artistic approval.', 'assets':items}
 payload=(json.dumps(manifest,indent=2)+'\n').encode();dest=OUT/'manifest.json'
 if dest.exists() and dest.read_bytes()!=payload:raise ValueError('DRAFT_IMMUTABLE_MANIFEST')
 if not dest.exists():dest.write_bytes(payload)
 return manifest
if __name__=='__main__':print(json.dumps(generate()))
