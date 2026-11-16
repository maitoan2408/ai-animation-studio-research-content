"""Exercise recorder/auditor compatibility only inside a disposable Git copy."""
import json, os, shutil, subprocess, sys, tarfile, tempfile, unittest, uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
class DedupTest(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);(self.root/'scripts').mkdir();(self.root/'production/src/qa').mkdir(parents=True)
  for name in ('scripts/run-step.py','production/src/qa/audit_evidence.py'):
   shutil.copyfile(ROOT/name,self.root/name)
  (self.root/'src').mkdir();(self.root/'src/example.txt').write_text('source\n')
  self.call(['git','init','-q']);self.call(['git','add','scripts','src','production/src']);self.call(['git','-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','fixture'])
 def tearDown(self):self.tmp.cleanup()
 def call(self,args,env=None,check=True):
  return subprocess.run(args,cwd=self.root,text=True,capture_output=True,check=check,env=env)
 def attempt(self,label,mode='dedup-v1'):
  env={**os.environ,'PAPER_EVIDENCE_SNAPSHOT':mode};self.call([sys.executable,'scripts/run-step.py','U1',label,'--',sys.executable,'-c','print(42)'],env=env)
 def audit(self):return self.call([sys.executable,'production/src/qa/audit_evidence.py',str(self.root/('audit-'+uuid.uuid4().hex+'.json'))],check=False)
 def test_dedup_replays_and_rejects_corruption(self):
  for n in range(8):self.attempt(f'repeat{n}')
  paths=sorted((self.root/'production/evidence/U1').glob('*/source.zip'));self.assertEqual(len(paths),8);self.assertTrue(all(p.is_symlink() for p in paths))
  self.assertEqual(len({p.resolve() for p in paths}),1);shared=paths[0].resolve();self.assertGreater(shared.stat().st_size,0)
  self.assertGreaterEqual(1-shared.stat().st_size/(8*shared.stat().st_size),.8)
  self.assertEqual(self.audit().returncode,0)
  (self.root/'src/example.txt').write_text('changed\n');self.attempt('changed');self.assertEqual(len({p.resolve() for p in (self.root/'production/evidence/U1').glob('*/source.zip')}),2)
  self.assertEqual(self.audit().returncode,0)
  shared.write_bytes(b'corrupt');self.assertNotEqual(self.audit().returncode,0)
 def test_linux_default_and_explicit_legacy(self):
  if not sys.platform.startswith('linux'):self.skipTest('Linux default only')
  env=dict(os.environ);env.pop('PAPER_EVIDENCE_SNAPSHOT',None)
  self.call([sys.executable,'scripts/run-step.py','U1','default','--',sys.executable,'-c','print(1)'],env=env)
  p=next((self.root/'production/evidence/U1').glob('*/source.zip'));self.assertTrue(p.is_symlink())
  self.attempt('explicitlegacy','legacy')
  self.assertEqual(sum(not p.is_symlink() for p in (self.root/'production/evidence/U1').glob('*/source.zip')),1)
  self.assertEqual(self.audit().returncode,0)
 def test_legacy_and_symlink_escape(self):
  self.attempt('legacy','legacy');p=next((self.root/'production/evidence/U1').glob('*/source.zip'));self.assertFalse(p.is_symlink());self.assertEqual(self.audit().returncode,0)
  p.unlink();p.symlink_to('/etc/passwd');result=self.audit();self.assertNotEqual(result.returncode,0);self.assertIn('SNAPSHOT_PATH',result.stdout)
 def test_concurrent_snapshots_share_atomic_store(self):
  with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(lambda n:self.attempt(f'parallel{n}'),range(4)))
  paths=list((self.root/'production/evidence/U1').glob('*/source.zip'))
  self.assertEqual(len(paths),4);self.assertEqual(len({p.resolve() for p in paths}),1);self.assertEqual(self.audit().returncode,0)
 def test_store_symlink_rejected_by_recorder(self):
  store=self.root/'production/evidence/_snapshots';store.parent.mkdir(parents=True);store.symlink_to(self.root/'src',target_is_directory=True)
  env={**os.environ,'PAPER_EVIDENCE_SNAPSHOT':'dedup-v1'}
  p=self.call([sys.executable,'scripts/run-step.py','U1','escape','--',sys.executable,'-c','print(1)'],env=env,check=False)
  self.assertNotEqual(p.returncode,0);self.assertIn('SNAPSHOT_STORE_PATH',p.stderr)
 def test_archive_extract_keeps_dedup(self):
  self.attempt('archive');archive=self.root/'source.tar'
  self.call(['git','add','production/evidence']);self.call(['git','-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','evidence'])
  with archive.open('wb') as out:subprocess.run(['git','archive','--format=tar','HEAD','production'],cwd=self.root,stdout=out,check=True)
  other=self.root/'restored';other.mkdir()
  with tarfile.open(archive) as t:t.extractall(other,filter='data')
  run=subprocess.run([sys.executable,str(other/'production/src/qa/audit_evidence.py'),str(other/'audit.json')],capture_output=True,text=True)
  self.assertEqual(run.returncode,0,run.stdout+run.stderr)

 def test_recorder_scopes_git_trust_to_its_checkout(self):
  env={**os.environ,'GIT_TEST_ASSUME_DIFFERENT_OWNER':'1'}
  refused=self.call(['git','rev-parse','HEAD'],env=env,check=False)
  self.assertNotEqual(refused.returncode,0)
  result=self.call([sys.executable,'scripts/run-step.py','U2','different-owner','--',sys.executable,'-c','print(1)'],env=env,check=False)
  self.assertEqual(result.returncode,0,result.stderr)
  # A child command outside recorder's Git calls still sees the ownership guard.
  self.assertNotEqual(self.call(['git','rev-parse','HEAD'],env=env,check=False).returncode,0)
 def test_production_example_input_is_in_source_snapshot(self):
  fixture=self.root/'production/examples/m4-short-project.json'
  fixture.parent.mkdir();fixture.write_text('{"fixture":true}\n')
  self.attempt('physics-input')
  run=next((self.root/'production/evidence/U1').iterdir())
  inputs=json.loads((run/'inputs.json').read_text())['files']
  self.assertIn('production/examples/m4-short-project.json',[f['path'] for f in inputs])
  import zipfile
  with zipfile.ZipFile(run/'source.zip') as archive:
   self.assertEqual(archive.read('production/examples/m4-short-project.json'),fixture.read_bytes())
