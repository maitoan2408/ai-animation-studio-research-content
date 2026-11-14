import importlib.util, unittest
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/art/paper-scene/calibration/compare_runs.py';s=importlib.util.spec_from_file_location('repeat_compare',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class RepeatCompareTest(unittest.TestCase):
 def fixture(self):return {'sourceSha256':'a','contourSha256':'b','width':640,'height':360,'profile':'preview','coverage':'physical','look':'bump','fps':'24/1','frames':192,'frameSha256':['f']*192,'videoSha256':'v'}
 def test_same_and_changed_frame(self):
  a=self.fixture();b=self.fixture();self.assertEqual(m.compare(a,b)['status'],'PASS_TWO_IDENTICAL_RUNS');b['frameSha256'][108]='changed'
  with self.assertRaisesRegex(ValueError,'frameSha256'):m.compare(a,b)
 def test_changed_source_and_missing(self):
  a=self.fixture();b=self.fixture();b['sourceSha256']='new'
  with self.assertRaisesRegex(ValueError,'sourceSha256'):m.compare(a,b)
  b=self.fixture();del b['look']
  with self.assertRaisesRegex(ValueError,'look'):m.compare(a,b)
