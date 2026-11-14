import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('paper_comparison',ROOT/'src/art/paper-scene/verify_comparison.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class PaperComparison(unittest.TestCase):
    def test_receiver_only_accounts_for_each_hidden_shadow(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)
            for mode in ('flat','volume'):
                image=Image.new('RGB',(1920,1080),(255,255,255))
                if mode=='volume':image.putpixel((20,20),(0,0,0))
                image.save(p/f'{mode}.png')
            def sha(name):return hashlib.sha256((p/name).read_bytes()).hexdigest()
            report={'shadowMode':'receiver-only','images':[{'mode':'flat','plates':71,'extruded':0,'sha256':sha('flat.png')},
               {'mode':'volume','plates':42,'extruded':31,'hiddenPaperShadows':29,'sha256':sha('volume.png')}]}
            (p/'report.json').write_text(json.dumps(report));self.assertEqual(module.verify(p)['status'],'PASS_SMOKE_NOT_ART')
            report['images'][1]['hiddenPaperShadows']=28;(p/'report.json').write_text(json.dumps(report))
            with self.assertRaisesRegex(ValueError,'SCENE_COVERAGE'):module.verify(p)
if __name__=='__main__':unittest.main()
