import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('alpha_loss',Path(__file__).resolve().parents[1]/'src/art/paper-silhouette/measure_alpha_loss.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class AlphaLoss(unittest.TestCase):
    def test_exact_binary_and_partial_alpha_are_measured_without_quality_claim(self):
        self.assertEqual(module.quantify(bytes([0,255]))['absoluteAlphaError'],0)
        sample=module.quantify(bytes([0,127,128,255]))
        self.assertEqual(sample['partialAlphaPixels'],2)
        self.assertEqual(sample['absoluteAlphaError'],254)
        self.assertEqual(sample['meanAbsoluteAlphaError'],63.5)
if __name__=='__main__':unittest.main()
