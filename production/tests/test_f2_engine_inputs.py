import importlib.util,unittest
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/art/paper-scene/calibration/compare_engine_inputs.py';s=importlib.util.spec_from_file_location('engine_inputs',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class EngineInputsTest(unittest.TestCase):
 def test_exact_missing_changed_duplicate(self):
  a={'files':[{'path':p,'sha256':'a'} for p in m.FILES]};b={'files':[dict(x) for x in a['files']]}
  self.assertEqual(m.compare(a,b)['status'],'PASS_ENGINE_INPUT_HASHES');b['files'][0]['sha256']='b'
  with self.assertRaisesRegex(ValueError,'ENGINE_INPUT_MISMATCH'):m.compare(a,b)
  b={'files':[dict(x) for x in a['files'][:-1]]}
  with self.assertRaisesRegex(ValueError,'ENGINE_INPUT_MISMATCH'):m.compare(a,b)
  b={'files':a['files']+[dict(a['files'][0])]}
  with self.assertRaisesRegex(ValueError,'ENGINE_INPUTS_DUPLICATE'):m.compare(a,b)
