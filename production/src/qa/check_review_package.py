"""Check selected review-media hashes and local navigation (ignoring URL query).
A GitHub ?raw=true link names the path before the query, not a local '?' file.
"""
from pathlib import Path
from urllib.parse import urlsplit,unquote
import hashlib,json,re
root=Path(__file__).resolve().parents[3];errors=[];links=0
for name in ['docs/execution/COMPLETED.md','production/artifacts/Q2/review-final/README.md','README.md','plan.md']:
    file=root/name
    for target in re.findall(r'\]\(([^)]+)\)',file.read_text()):
        url=urlsplit(target)
        if url.scheme or not url.path:continue
        links+=1
        if not (file.parent/unquote(url.path)).exists():errors.append({'file':name,'missingLink':target})
package=root/'production/artifacts/Q2/review-final';manifest=json.loads((package/'manifest.json').read_text());checked=0
for version in manifest['versions']:
    for path_key,hash_key in [('delivery','sha256'),('normalizedDelivery','normalizedSha256')]:
        file=package/version[path_key];checked+=1
        if hashlib.sha256(file.read_bytes()).hexdigest()!=version[hash_key]:errors.append({'mediaHash':str(file)})
if hashlib.sha256((package/'native-final-r2.zip').read_bytes()).hexdigest()!=manifest['nativeZipSha256']:errors.append({'nativeZip':'HASH_MISMATCH'})
report={'status':'FAIL' if errors else 'PASS','localLinksChecked':links,'mediaAndZipHashesChecked':checked+1,'errors':errors}
with (package/'checkpoint-checks.json').open('x') as f:json.dump(report,f,indent=2);f.write('\n')
print(json.dumps(report))
if errors:raise SystemExit(1)
