"""Bounded renderer representation check, not an artistic score.
Locked before mirror fix: global mean RGB error <=5/255 and p95 <=15/255.
This catches the observed whole-character mirror error; it does not replace
per-contact tests or full motion review. PNG inputs are both sRGB display images.
"""
from pathlib import Path
import hashlib,json,sys
import numpy as np
from PIL import Image
reference,candidate=map(Path,sys.argv[1:3]);rows=[]
for n in ['000072.png','000191.png']:
 a=np.asarray(Image.open(reference/n).convert('RGB')).astype(float)
 b=np.asarray(Image.open(candidate/n).convert('RGB')).astype(float)
 if a.shape!=b.shape:raise ValueError('DIMENSION_MISMATCH')
 diff=np.abs(a-b);mae=float(diff.mean());p95=float(np.quantile(diff,.95))
 rows.append({'frame':n,'maeRGB':mae,'p95RGB':p95,'pass':mae<=5 and p95<=15,
  'referenceSha256':hashlib.sha256((reference/n).read_bytes()).hexdigest(),
  'candidateSha256':hashlib.sha256((candidate/n).read_bytes()).hexdigest()})
report={'status':'PASS' if all(r['pass'] for r in rows) else 'FAIL','thresholds':{'meanRGB':5,'p95RGB':15},'frames':rows,'meaning':'Representation comparison, not creative or full contact gate'}
print(json.dumps(report,indent=2));sys.exit(0 if report['status']=='PASS' else 1)
