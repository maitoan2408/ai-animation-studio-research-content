"""Assemble an isolated development art revision; never overwrite old pack."""
import hashlib
import base64
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
    # Heads need explicit derived paper shadows for the existing polish adapter.
    for head in manifests[2]['assets']:
        payload=verify_asset(sources[2],head); padding=12;w=head['width']+2*padding;h=head['height']+2*padding
        encoded=base64.b64encode(payload).decode('ascii')
        shadow=(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs><filter id="shadow" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 .09 0 0 0 0 .16 0 0 0 0 .15 0 0 0 1 0"/><feGaussianBlur stdDeviation="2.5"/></filter></defs><image x="12" y="12" width="{head["width"]}" height="{head["height"]}" href="data:image/svg+xml;base64,{encoded}" filter="url(#shadow)"/></svg>\n').encode()
        ident='shadow/'+head['id'];file=destination(ident)
        if ident in seen:raise ValueError('OVERLAY_DUPLICATE')
        seen.add(ident);rows.append({'id':ident,'file':file,'width':w,'height':h,'pivot':[v+padding for v in head['pivot']],
          'anchors':{},'category':'shadow','sha256':sha(shadow),'colorSpace':'srgb','alpha':'straight',
          'source':'project-original-derived-development','dependsOn':head['sha256']});data.append((file,shadow))
    out=ROOT/'out/f2-art-overlay'/uuid.uuid4().hex;out.mkdir(parents=True)
    for file,payload in data:
        target=out/file;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(payload)
    result={'version':'lantern-f2-development-2','status':'PROVISIONAL_NOT_APPROVED','assets':rows,
       'sources':[{'path':str(p.relative_to(ROOT)),'manifestSha256':sha((p/'manifest.json').read_bytes())} for p in sources],
       'limitations':['Development revision only; no voice mapping or artistic approval.',
                      'Draft head shadows are derived from the SVGs; no visual approval or speech mapping.']}
    payload=(json.dumps(result,indent=2)+'\n').encode();(out/'manifest.json').write_bytes(payload)
    return {'status':result['status'],'output':str(out),'assets':len(rows),'manifestSha256':sha(payload)}
if __name__=='__main__':print(json.dumps(build()))
