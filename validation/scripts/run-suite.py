"""Run the focused integration suite. Negative cases must fail deliberately."""
import json
from pathlib import Path
import subprocess
import sys

root=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,'scripts/prepare-fixtures.py'],cwd=root,check=True)
cases=[
 ('hyperframes-report-check',['env','HYPERFRAMES_NO_TELEMETRY=1','HYPERFRAMES_CACHE_DIR=/tmp/studio-hyperframes-cache','HYPERFRAMES_BROWSER_PATH=/usr/bin/chromium','./node_modules/.bin/hyperframes','check','fixtures/hyperframes-report'],0),
 ('hyperframes-editable-check',['env','HYPERFRAMES_NO_TELEMETRY=1','HYPERFRAMES_CACHE_DIR=/tmp/studio-hyperframes-cache','HYPERFRAMES_BROWSER_PATH=/usr/bin/chromium','./node_modules/.bin/hyperframes','check','fixtures/hyperframes-editable'],0),
 ('remotion-report-render',['node','scripts/render-remotion.mjs','MyVideo','1'],0),
 ('hyperframes-report-render',['node','scripts/render-hyperframes.mjs','report','1','strict'],0),
 ('hyperframes-study-render',['node','scripts/render-hyperframes.mjs','study','1','strict'],0),
 ('remotion-study-render',['node','scripts/render-remotion.mjs','Study','1'],0),
 ('hyperframes-study-w2',['env','PRODUCER_LOW_MEMORY_MODE=false','node','scripts/render-hyperframes.mjs','study','2','strict'],0),
 ('remotion-study-w2',['node','scripts/render-remotion.mjs','Study','2'],0),
 ('hyperframes-seek',['node','scripts/seek-hyperframes.mjs'],0),
 ('remotion-seek',['node','scripts/seek-remotion.mjs'],0),
 ('hyperframes-missing-best-effort',['node','scripts/render-hyperframes.mjs','missing','1','best-effort'],0),
 ('hyperframes-missing-strict',['node','scripts/render-hyperframes.mjs','missing','1','strict'],1),
 ('remotion-missing-native',['node','scripts/render-remotion.mjs','MissingNative','1'],0),
 ('remotion-missing-guarded',['node','scripts/render-remotion.mjs','MissingGuarded','1'],1),
 ('media-qc',['sys-python','scripts/qc.py'],0),
 ('concurrency-qc',['sys-python','scripts/compare-concurrency.py'],0),
]
for name,cmd,expected in cases:
    if cmd[0]=='sys-python':cmd[0]=sys.executable
    r=subprocess.run([sys.executable,'scripts/record.py',name,*cmd],cwd=root)
    if r.returncode!=expected:raise SystemExit(f'{name}: expected exit {expected}, got {r.returncode}')
subprocess.run([sys.executable,'scripts/summarize.py'],cwd=root,check=True)
