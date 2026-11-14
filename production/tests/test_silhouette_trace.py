import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('trace',Path(__file__).resolve().parents[1]/'src/art/paper-silhouette/trace.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class SilhouetteTrace(unittest.TestCase):
    def test_solid_hole_diagonal_and_transparent(self):
        single=mod.trace([1]*9,3,3);self.assertEqual(len(single),1);self.assertEqual(single[0]['signedArea'],9)
        hole=mod.trace([1,1,1,1,0,1,1,1,1],3,3);self.assertEqual(sorted(x['signedArea'] for x in hole),[-1,9])
        diag=mod.trace([1,0,0,1],2,2);self.assertEqual(sorted(x['signedArea'] for x in diag),[1,1])
        self.assertEqual(mod.trace([0]*9,3,3),[])
    def test_exhaustive_three_by_three_roundtrip(self):
        def inside(points,x,y):
            result=False
            for i,(x1,y1) in enumerate(points):
                x2,y2=points[(i+1)%len(points)]
                if (y1>y)!=(y2>y) and x < (x2-x1)*(y-y1)/(y2-y1)+x1:
                    result=not result
            return result
        for value in range(512):
            mask=[bool(value & (1<<i)) for i in range(9)]
            loops=mod.trace(mask,3,3)
            reconstructed=[sum((1 if loop['signedArea']>0 else -1) for loop in loops
                               if inside(loop['points'],x+.5,y+.5))>0
                           for y in range(3) for x in range(3)]
            self.assertEqual(mask,reconstructed,f'mask={value}')
            self.assertEqual(bytes(mask),mod.reconstruct(loops,3,3),f'mask={value}')
    def test_invalid_mask_rejects(self):
        with self.assertRaisesRegex(ValueError,'SILHOUETTE_MASK'):mod.trace([1],2,2)
if __name__=='__main__': unittest.main()
