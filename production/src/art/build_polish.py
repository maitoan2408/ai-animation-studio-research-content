"""Derived, separately versioned paper-shadow pack; never overwrites Q1 artwork.
Original SVG bytes/pivots/anchors remain identical. Shadow SVGs embed their own
source mask, have 12px padding and explicit dependency hashes. Direction/opacity
are applied in world space by polish.ts, not baked into rotating limbs.
"""
from pathlib import Path
import base64,hashlib,json,shutil
root=Path(__file__).resolve().parents[2];original=root/'assets/lantern-v1';out=root/'assets/lantern-polish-1';out.mkdir(exist_ok=True)
pack=json.loads((original/'manifest.json').read_text());base=pack['assets'];assets=[]
for a in base:
 target=out/a['file'];target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(original/a['file'],target);assets.append(a)
# R1 keeps a second editable drawing; original coral cup is unchanged.
cup=next(a for a in base if a['id']=='props/cup');text=(original/cup['file']).read_text()
replacements={'#bc6351':'#477f83','#8e4e43':'#30585f','#e0a186':'#8bb4b0','#d78a71':'#76a6a4'}
changed=text
for a,b in replacements.items():changed=changed.replace(a,b)
# Palette selection must match authored source, never silently create an identical edit.
if changed==text:
 raise RuntimeError('CUP_PALETTE_NOT_FOUND: update the explicit authored palette map')
path=out/'props/cup-accent.svg';path.write_text(changed)
accent={**cup,'id':'props/cup-accent','file':'props/cup-accent.svg','sha256':hashlib.sha256(path.read_bytes()).hexdigest()};assets.append(accent)
for a in [*base,accent]:
 if a['category'] in ['background','foreground','mouth']:continue
 padding=12;w=a['width']+2*padding;h=a['height']+2*padding
 encoded=base64.b64encode((out/a['file']).read_bytes()).decode()
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs><filter id="shadow" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 .09 0 0 0 0 .16 0 0 0 0 .15 0 0 0 1 0"/><feGaussianBlur stdDeviation="2.5"/></filter></defs><image x="12" y="12" width="{a['width']}" height="{a['height']}" href="data:image/svg+xml;base64,{encoded}" filter="url(#shadow)"/></svg>\n'''
 identifier='shadow/'+a['id'];file=identifier+'.svg';path=out/file;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(svg)
 assets.append({'id':identifier,'file':file,'width':w,'height':h,'pivot':[v+padding for v in a['pivot']],
  'anchors':{},'category':'shadow','sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'colorSpace':'srgb','alpha':'straight','source':'project-original-derived','dependsOn':a['sha256']})
ground='''<svg xmlns="http://www.w3.org/2000/svg" width="180" height="36" viewBox="0 0 180 36"><defs><radialGradient id="shade"><stop stop-color="#172f2e" stop-opacity=".8"/><stop offset="1" stop-color="#172f2e" stop-opacity="0"/></radialGradient></defs><ellipse cx="90" cy="18" rx="88" ry="16" fill="url(#shade)"/></svg>\n'''
file='effects/contact-shadow.svg';path=out/file;path.parent.mkdir(exist_ok=True);path.write_text(ground)
assets.append({'id':'effects/contact-shadow','file':file,'width':180,'height':36,'pivot':[90,18],'anchors':{},'category':'shadow','sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'colorSpace':'srgb','alpha':'straight','source':'project-original'})
pack.update(version='lantern-polish-1',assets=assets,derivedFrom='lantern-art-1')
(out/'manifest.json').write_text(json.dumps(pack,indent=2)+'\n');print(json.dumps({'output':str(out),'assets':len(assets),'originalAssetsUnchanged':len(base)}))
