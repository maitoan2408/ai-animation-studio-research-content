"""Download the two explicitly selected local voice files, verify before publish.

No account/API/GPU service is used. Large model bytes stay in ignored .cache;
the exact URLs/digests are recorded here and in the provider manifest. Existing
verified files are reused. A partial download is never treated as a model.
"""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT=Path(__file__).resolve().parents[2]
DEST=ROOT/'.cache/voice'
BASE='https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/'
FILES={
 'kokoro-v1.0.onnx':'beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a',
 'voices-v1.0.bin':'bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d',
}

def digest(file):
 h=hashlib.sha256()
 with file.open('rb') as source:
  for chunk in iter(lambda:source.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()

def main():
 DEST.mkdir(parents=True,exist_ok=True)
 records=[]
 for name,expected in FILES.items():
  file=DEST/name
  if not file.exists() or digest(file)!=expected:
   partial=DEST/(name+'.partial')
   subprocess.run(['curl','--fail','--location','--retry','2','--connect-timeout','20',
                   '--max-time','600','--output',str(partial),BASE+name],check=True)
   actual=digest(partial)
   if actual!=expected:raise RuntimeError(f'MODEL_HASH_MISMATCH {name}: {actual}')
   partial.replace(file)
  records.append(dict(file=name,url=BASE+name,sha256=expected,bytes=file.stat().st_size))
 (DEST/'manifest.json').write_text(json.dumps({'files':records,'precision':'fp32','provider':'kokoro-onnx 0.6.1','license_code':'MIT','license_weights':'Apache-2.0 per upstream model card'},indent=2)+'\n')
 print(json.dumps(records))

if __name__=='__main__':main()
