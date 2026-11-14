import importlib.util
from pathlib import Path
import tempfile
import unittest
import numpy as np
from PIL import Image
spec=importlib.util.spec_from_file_location('color_compare',Path(__file__).resolve().parents[1]/'src/art/paper-scene/compare_before_after.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ColorCompareTest(unittest.TestCase):
 def test_reference_pairs_and_identity(self):
  # Sharma et al. CIEDE2000 supplementary published test pairs.
  self.assertAlmostEqual(float(m.delta_e00([50,2.6772,-79.7751],[50,0,-82.7485])),2.0425,places=4)
  self.assertAlmostEqual(float(m.delta_e00([50,3.1571,-77.2803],[50,0,-82.7485])),2.8615,places=4)
  self.assertAlmostEqual(float(m.delta_e00([50,2.8361,-74.0200],[50,0,-82.7485])),3.4412,places=4)
  self.assertAlmostEqual(float(m.delta_e00([50,0,0],[50,0,0])),0.)
 def test_invalid_size_and_region(self):
  with tempfile.TemporaryDirectory() as d:
   d=Path(d);Image.new('RGB',(3,3)).save(d/'a.png');Image.new('RGB',(2,3)).save(d/'b.png')
   with self.assertRaisesRegex(ValueError,'DIMENSIONS'):m.compare(d/'a.png',d/'b.png',{'x':[0,0,1,1]},d/'out')
   with self.assertRaisesRegex(ValueError,'REGION'):m.compare(d/'a.png',d/'a.png',{'x':[0,0,4,1]},d/'out')
