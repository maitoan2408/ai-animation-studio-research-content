"""Assemble an isolated development art revision; never overwrite old pack."""
import hashlib
import json
import re
import uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def sha(data):return hashlib.sha256(data).hexdigest()
def destination(asset_id):
    if not isinstance(asset_id,str) or not re.fullmatch(r'[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*',asset_id):raise ValueError('OVERLAY_ASSET_ID')
    return asset_id+'.svg'
def verify_asset(directory, asset):
    root=directory.resolve();file=(root/asset['file']).resolve()
    if not file.is_relative_to(root) or not file.is_file():raise ValueError('OVERLAY_SOURCE_PATH')
    payload=file.read_bytes()
    if sha(payload)!=asset['sha256']:raise ValueError('OVERLAY_SOURCE_HASH')
    return payload
def build():
    sources=[ROOT/'assets/lantern-polish-1',ROOT/'assets/lantern-mouth-f2-draft',ROOT/'assets/lantern-expression-f2-draft-2']
    manifests=[json.loads((p/'manifest.json').read_text()) for p in sources]
    if manifests[1]['status']!='PROVISIONAL_NOT_APPROVED' or manifests[2]['status']!='PROVISIONAL_NOT_APPROVED':raise ValueError('OVERLAY_DRAFT_STATUS')
    rows=[];seen=set();data=[]
    for folder,manifest in zip(sources,manifests):
        for item in manifest['assets']:
            if item['id'] in seen:raise ValueError('OVERLAY_DUPLICATE')
            seen.add(item['id']);payload=verify_asset(folder,item)
            dest=destination(item['id'])
            row={**item,'file':dest}
            if folder==sources[1]:row.update(category='mouth',anchors={},colorSpace='srgb',alpha='straight')
            rows.append(row);data.append((dest,payload))
    out=ROOT/'out/f2-art-overlay'/uuid.uuid4().hex;out.mkdir(parents=True)
    for file,payload in data:
        target=out/file;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(payload)
    result={'version':'lantern-f2-development-1','status':'PROVISIONAL_NOT_APPROVED','assets':rows,
       'sources':[{'path':str(p.relative_to(ROOT)),'manifestSha256':sha((p/'manifest.json').read_bytes())} for p in sources],
       'limitations':['Development revision only; no voice mapping or artistic approval.',
                      'New head and mouth variants have no newly authored shadow sprites.']}
    payload=(json.dumps(result,indent=2)+'\n').encode();(out/'manifest.json').write_bytes(payload)
    return {'status':result['status'],'output':str(out),'assets':len(rows),'manifestSha256':sha(payload)}
if __name__=='__main__':print(json.dumps(build()))
