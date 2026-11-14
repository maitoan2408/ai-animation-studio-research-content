import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('animation_verify',ROOT/'src/art/paper-scene/verify_animation.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class AnimationVerify(unittest.TestCase):
    def test_rejects_partial_or_wrong_profile_before_claiming_pass(self):
        report={'status':'PASS_PROVISIONAL_PREVIEW','frames':191,'width':640,'height':360,'fps':'24/1','seek108Exact':True}
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp);(p/'report.json').write_text(json.dumps(report))
            with self.assertRaisesRegex(ValueError,'ANIMATION_REPORT'):module.verify(p)
            report['frames']=192;report['frameSha256']=[];(p/'report.json').write_text(json.dumps(report))
            with self.assertRaisesRegex(ValueError,'ANIMATION_FRAME_HASHES'):module.verify(p)
if __name__=='__main__':unittest.main()
