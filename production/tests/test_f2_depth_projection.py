import importlib.util,unittest
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/art/paper-scene/calibration/depth_projection.py';s=importlib.util.spec_from_file_location('depth_projection',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class DepthProjectionTest(unittest.TestCase):
 def test_distance_and_zoom(self):
  f={'camera':{'zoom':1},'sprites':[{'id':'ground','asset':'background/ground','z':0},{'id':'actor','asset':'mai/torso','z':1}]}
  r=m.analyze(f);self.assertEqual(r['rows'][0]['predictedOffsetPx640'],[.8,1.]);f['camera']['zoom']=2
  self.assertEqual(m.analyze(f)['rows'][0]['predictedOffsetPx640'],[1.6,2.])
 def test_invalid_ground_and_camera(self):
  with self.assertRaisesRegex(ValueError,'GROUND'):m.analyze({'camera':{'zoom':1},'sprites':[]})
  with self.assertRaisesRegex(ValueError,'CAMERA'):m.analyze({'camera':{'zoom':0},'sprites':[{'id':'ground','asset':'background/ground','z':0}]})
