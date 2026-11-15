import importlib.util, unittest
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/continuity/fall_actor_bounds.py'
spec=importlib.util.spec_from_file_location('fall_actor_bounds',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class TestFallActorBounds(unittest.TestCase):
 def test_overlap_and_transform_validation(self):
  asset={'width':10,'height':20,'pivot':[5,10]}
  s={'x':0,'y':0,'rotation':0,'scaleX':1,'scaleY':1}
  a=m.bounds(s,asset); self.assertTrue(m.overlap(a,m.bounds({**s,'x':4},asset))); self.assertFalse(m.overlap(a,m.bounds({**s,'x':100},asset)))
  self.assertTrue(m.overlap(a,m.bounds({**s,'rotation':90},asset)))
  for bad in [float('nan'),float('inf'),0]:
   with self.assertRaisesRegex(ValueError,'FALL_ACTOR_TRANSFORM'):m.bounds({**s,'scaleX':bad},asset)
 def test_observe_rejects_missing_actor_and_detects_injected_overlap(self):
  asset={'id':'a','width':10,'height':10,'pivot':[5,5]};sprite={'asset':'a','x':0,'y':0,'rotation':0,'scaleX':1,'scaleY':1}
  frame={'sprites':[{**sprite,'id':'mai.body'},{**sprite,'id':'an.body','x':100}]}
  data={'edit':{'qualityCandidate':'f3-fall-fixture'},'pack':{'assets':[asset]},'frames':[frame]*192}
  self.assertEqual(m.observe(data)['bboxOverlaps'],[])
  frame['sprites'][1]['x']=1;self.assertEqual(len(m.observe(data)['bboxOverlaps']),73)
  frame['sprites'].pop()
  with self.assertRaisesRegex(ValueError,'FALL_ACTOR_MISSING'):m.observe(data)
