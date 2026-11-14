import subprocess,sys,tempfile,unittest
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
VERIFY=ROOT/'production/src/art/paper-scene/calibration/shadow_verify.py'
SHAPE=ROOT/'production/src/art/paper-scene/calibration/shadow_shape_verify.py'
class ShadowFixtureVerifierTest(unittest.TestCase):
 def test_rejects_no_shadow_and_leak(self):
  with tempfile.TemporaryDirectory() as d:
   d=Path(d);base=Image.new('RGB',(400,200),'white');base.save(d/'off.png');base.save(d/'same.png')
   run=lambda x:subprocess.run([sys.executable,str(VERIFY),str(d/'off.png'),str(x)],capture_output=True)
   self.assertNotEqual(run(d/'same.png').returncode,0)
   shadow=base.copy()
   for x in range(70,80):
    for y in range(50,60):shadow.putpixel((x,y),(80,80,80))
   shadow.save(d/'inside.png');self.assertEqual(run(d/'inside.png').returncode,0)
   shadow.putpixel((0,0),(0,0,0));shadow.save(d/'leak.png');self.assertNotEqual(run(d/'leak.png').returncode,0)

 def test_alpha_hole_verifier_rejects_filled_or_absent_shadow(self):
  with tempfile.TemporaryDirectory() as d:
   d=Path(d);base=Image.new('RGB',(400,200),'white');base.save(d/'off.png');shadow=base.copy()
   for x in range(152,159):
    for y in range(106,115):shadow.putpixel((x,y),(220,220,220))
   shadow.save(d/'ring.png')
   run=lambda path:subprocess.run([sys.executable,str(SHAPE),str(d/'off.png'),str(path)],capture_output=True)
   self.assertEqual(run(d/'ring.png').returncode,0);self.assertNotEqual(run(d/'off.png').returncode,0)
   for x in range(169,176):
    for y in range(107,114):shadow.putpixel((x,y),(220,220,220))
   shadow.save(d/'filled.png');self.assertNotEqual(run(d/'filled.png').returncode,0)
