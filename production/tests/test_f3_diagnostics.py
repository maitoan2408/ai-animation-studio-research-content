import importlib.util,unittest
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/motion/f3_diagnostics.py';spec=importlib.util.spec_from_file_location('f3_diagnostics',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class TestF3Diagnostics(unittest.TestCase):
 def test_derivative_and_invalid_inputs(self):
  self.assertEqual(m.derivative([0,1,4],2),[2,6])
  for values,fps in [([1],24),([1,2],0),([1,float('nan')],24)]:
   with self.assertRaisesRegex(ValueError,'F3_DIAGNOSTIC_TRACE'):m.derivative(values,fps)
