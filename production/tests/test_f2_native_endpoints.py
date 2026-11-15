import importlib.util,unittest,tempfile,json
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/art/paper-scene/calibration/native_endpoints.py';s=importlib.util.spec_from_file_location('native_endpoints',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class NativeEndpointCropTest(unittest.TestCase):
 def test_tracks_moved_rotated_sprite(self):
  assets={'lamp':{'width':100,'height':40,'pivot':[50,20]}}
  sprite={'id':'lamp','asset':'lamp','x':960,'y':540,'rotation':0,'scaleX':1,'scaleY':1};f={'camera':{'x':960,'y':540,'zoom':1},'sprites':[sprite]}
  self.assertEqual(m.region_box(f,assets,('lamp',),0),(910,520,1010,560));sprite['x']=1060;sprite['rotation']=90
  self.assertEqual(m.region_box(f,assets,('lamp',),0),(1040,490,1080,590))
 def test_missing_or_duplicate_sprite_rejected(self):
  f={'camera':{'x':960,'y':540,'zoom':1},'sprites':[]}
  with self.assertRaisesRegex(ValueError,'ENDPOINT_SPRITE'):m.region_box(f,{},('lamp',))

 def test_partial_and_existing_output_never_publish(self):
  with tempfile.TemporaryDirectory() as d:
   d=Path(d);source=d/'source.json';source.write_text(json.dumps({'pack':{'assets':[]},'frames':[]}));log=d/'empty.log';log.write_text('');target=d/'result'
   with self.assertRaisesRegex(ValueError,'ENDPOINT_MISSING'):m.run(log,source,target)
   self.assertFalse(target.exists());target.mkdir();sentinel=target/'keep';sentinel.write_text('untouched')
   with self.assertRaisesRegex(ValueError,'ENDPOINT_OUTPUT_EXISTS'):m.run(log,source,target)
   self.assertEqual(sentinel.read_text(),'untouched')
