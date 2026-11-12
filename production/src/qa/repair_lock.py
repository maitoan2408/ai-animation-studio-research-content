"""Repair missing transitive lock entries outside the existing install tree.

Exact direct pins cannot change. The old/new lock diff and clean-install tests
are separate evidence. This utility never installs into the live workbench.
"""
from pathlib import Path
from collections import Counter
import hashlib
import json
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[3]
source = ROOT / 'production'
temporary = Path(tempfile.mkdtemp(prefix='studio-lock-repair-'))
for name in ['package.json','package-lock.json']:
    shutil.copy2(source / name, temporary / name)
before = json.loads((source / 'package-lock.json').read_text())
subprocess.run(['npm','install','--package-lock-only','--ignore-scripts','--no-audit','--no-fund',
                '--cache',str(temporary / 'cache')], cwd=temporary, check=True)
after = json.loads((temporary / 'package-lock.json').read_text())
for field in ['dependencies','devDependencies']:
    if before['packages'][''].get(field) != after['packages'][''].get(field):
        raise RuntimeError('DIRECT_PINS_CHANGED')
def identities(lock):
    # npm needs to move12 existing packages into puppeteer-core/node_modules.
    # Allow only location changes; preserve the complete multiset of tarballs.
    return Counter((name.rsplit('node_modules/',1)[-1], value.get('version'),
                    value.get('resolved'), value.get('integrity'))
                   for name, value in lock['packages'].items() if name)

if identities(before) != identities(after):
    raise RuntimeError('TARBALL_IDENTITY_SET_CHANGED')
old_hash = hashlib.sha256((source / 'package-lock.json').read_bytes()).hexdigest()
shutil.copy2(temporary / 'package-lock.json', source / 'package-lock.json')
print(json.dumps({'status':'LOCK_REPAIRED_PENDING_CLEAN_TEST','added':sorted(set(after['packages'])-set(before['packages'])),
                  'removedLocations':sorted(set(before['packages'])-set(after['packages'])),
                  'directPinsUnchanged':True,'tarballIdentitiesUnchanged':True,
                  'beforeSha256':old_hash,'afterSha256':hashlib.sha256((source / 'package-lock.json').read_bytes()).hexdigest(),
                  'scratch':str(temporary)}))
