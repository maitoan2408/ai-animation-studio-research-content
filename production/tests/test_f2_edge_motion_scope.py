import importlib.util,unittest
import numpy as np
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/art/paper-scene/calibration/edge_motion_scope.py';s=importlib.util.spec_from_file_location('edge_scope',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class EdgeMotionScopeTest(unittest.TestCase):
 def test_bbox_rotation_and_flip(self):
  a={'width':60,'height':30,'pivot':[30,15]};s={'x':960,'y':540,'rotation':0,'scaleX':1,'scaleY':1};c={'x':960,'y':540,'zoom':1}
  self.assertEqual(m.box_for(s,a,c,margin=0),(310,175,330,185));s['rotation']=90
  self.assertEqual(m.box_for(s,a,c,margin=0),(315,170,325,190));s['scaleX']=-1
  self.assertEqual(m.box_for(s,a,c,margin=0),(315,170,325,190))

 def test_detects_outside_change_and_invalid_bounds(self):
  a=np.zeros((6,8,3),dtype=np.uint8);b=a.copy();b[2,3]=255
  self.assertEqual(m.count_scope(a,b,[(2,1,6,5)]),(1,0));b[0,0]=255
  self.assertEqual(m.count_scope(a,b,[(2,1,6,5)]),(1,1))
  with self.assertRaisesRegex(ValueError,'EDGE_MOTION_BOX'):m.count_scope(a,b,[(-1,0,3,3)])
