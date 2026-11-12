"""Ensure Blender script failures cannot masquerade as a successful process."""
import os, subprocess
env=dict(os.environ,BLENDER_USER_CONFIG='/tmp/studio-blender-config')
run=subprocess.run(['blender','--background','--factory-startup','--python-exit-code','1',
 '--python-expr',"raise RuntimeError('EXPECTED_FAILURE_PROBE')"],env=env,capture_output=True,text=True)
if run.returncode!=1 or 'EXPECTED_FAILURE_PROBE' not in run.stdout+run.stderr:
 raise RuntimeError(f'FAILURE_CONTRACT_FAILED code={run.returncode} {run.stdout} {run.stderr}')
print({'status':'PASS','expectedExit':1,'actualExit':run.returncode,'scope':'Deliberate Blender Python exception rejects process'})
