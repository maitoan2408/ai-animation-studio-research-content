import importlib.util
from pathlib import Path
import unittest
from PIL import Image, ImageChops
spec=importlib.util.spec_from_file_location('alpha_overlap',Path(__file__).resolve().parents[1]/'src/continuity/alpha_overlap.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class AlphaOverlap(unittest.TestCase):
    def test_projection_respects_translation_mirror_and_detects_overlap(self):
        image=Image.new('RGBA',(10,10),(255,255,255,255))
        asset={'width':10,'height':10,'pivot':[5,5]}
        sprite={'x':20,'y':20,'scaleX':1,'scaleY':1,'rotation':0}
        def mask(s): return module.projection(s,asset,image,(0,0,60,60))
        original=mask(sprite)
        self.assertEqual(original.histogram()[255],100)
        mirror=mask({**sprite,'scaleX':-1})
        self.assertEqual(ImageChops.difference(original,mirror).getbbox(),None)
        moved=mask({**sprite,'x':25})
        self.assertEqual(ImageChops.multiply(original,moved).histogram()[255],50)
        far=mask({**sprite,'x':50})
        self.assertEqual(ImageChops.multiply(original,far).getbbox(),None)
        with self.assertRaisesRegex(ValueError,'ALPHA_TRANSFORM'):
            mask({**sprite,'scaleX':0})
if __name__=='__main__': unittest.main()
