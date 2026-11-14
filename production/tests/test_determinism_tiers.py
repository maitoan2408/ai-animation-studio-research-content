import unittest
import tempfile
from pathlib import Path
import sys
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src' / 'qa'))
from determinism_tiers import compare_data, compare_images

class DeterminismTiers(unittest.TestCase):
    def test_exact_data_detects_change(self):
        self.assertTrue(compare_data(b'pose',b'pose')['pass'])
        self.assertFalse(compare_data(b'pose',b'Pose')['pass'])

    def test_raster_requires_explicit_threshold_and_detects_visual_change(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            a=root/'a.png'; b=root/'b.png'
            Image.new('RGB',(32,32),(20,80,140)).save(a)
            Image.new('RGB',(32,32),(240,10,10)).save(b)
            self.assertEqual(compare_images(a,b,None)['status'],'NEEDS_CALIBRATION')
            thresholds={'ssim_min':0.999,'delta_e76_max':0.1,'alpha_background':[255,255,255]}
            self.assertEqual(compare_images(a,a,thresholds)['status'],'PASS')
            self.assertEqual(compare_images(a,b,thresholds)['status'],'FAIL')
            with self.assertRaises(ValueError):compare_images(a,b,{'ssim_min':float('nan'),'delta_e76_max':1,'alpha_background':[0,0,0]})

    def test_lab_black_white_and_alpha_composite(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d); black=root/'black.png'; white=root/'white.png'; transparent=root/'alpha.png'
            Image.new('RGB',(32,32),(0,0,0)).save(black)
            Image.new('RGB',(32,32),(255,255,255)).save(white)
            Image.new('RGBA',(32,32),(255,0,0,0)).save(transparent)
            t={'ssim_min':0.999,'delta_e76_max':0.1,'alpha_background':[255,255,255]}
            self.assertAlmostEqual(compare_images(black,white,t)['maxDeltaE76'],100,places=5)
            self.assertEqual(compare_images(white,transparent,t)['status'],'PASS')

if __name__ == '__main__':unittest.main()
