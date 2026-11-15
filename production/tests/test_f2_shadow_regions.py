import importlib.util,tempfile,unittest
from pathlib import Path
from PIL import Image
p=Path(__file__).resolve().parents[1]/'src/art/paper-scene/calibration/shadow_regions.py';s=importlib.util.spec_from_file_location('shadow_regions',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class ShadowRegionTest(unittest.TestCase):
 def test_detects_dark_bright_and_bad_box(self):
  with tempfile.TemporaryDirectory() as d:
   d=Path(d);a=Image.new('RGB',(640,360),(100,100,100));b=a.copy();b.putpixel((1,1),(80,80,80));b.putpixel((2,2),(120,120,120));a.save(d/'a.png');b.save(d/'b.png')
   r=m.measure(d/'a.png',d/'b.png',{'crop':[0,0,3,3]})['regions']['crop'];self.assertEqual((r['darkerPixels'],r['brighterPixels']),(1,1))
   with self.assertRaisesRegex(ValueError,'SHADOW_REGION_BOX'):m.measure(d/'a.png',d/'b.png',{'bad':[-1,0,3,3]})
