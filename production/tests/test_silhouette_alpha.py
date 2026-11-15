import importlib.util
import sys
from pathlib import Path
import unittest
from PIL import Image
folder=Path(__file__).resolve().parents[1]/'src/art/paper-silhouette'
sys.path.insert(0,str(folder))
spec=importlib.util.spec_from_file_location('silhouette_inventory',folder/'inventory.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class SilhouetteAlpha(unittest.TestCase):
    def test_rgb_only_allowed_for_opaque_background(self):
        rgb=Image.new('RGB',(2,2),'white');texture={'width':2,'height':2}
        asset={'width':2,'height':2,'category':'background'}
        self.assertEqual(module.alpha_mask(rgb,texture,asset,1),bytes([1]*4))
        with self.assertRaisesRegex(ValueError,'SILHOUETTE_TEXTURE_FORMAT'):
            module.alpha_mask(rgb,texture,{**asset,'category':'limb'},1)
        with self.assertRaisesRegex(ValueError,'SILHOUETTE_TEXTURE_FORMAT'):
            module.alpha_mask(rgb,{'width':3,'height':2},asset,1)
if __name__=='__main__':unittest.main()
