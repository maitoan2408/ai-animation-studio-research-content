import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('f2_overlay',ROOT/'src/art/build_f2_overlay.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class F2Overlay(unittest.TestCase):
    def test_asset_id_path_escape_rejected(self):
        for name in ('../x','/tmp/x','a/../../x','a//b',''):
            with self.assertRaisesRegex(ValueError,'OVERLAY_ASSET_ID'):module.destination(name)
        self.assertEqual(module.destination('mai/head-quarter-sad'),'mai/head-quarter-sad.svg')
    def test_source_hash_and_path_escape_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder);(p/'x.svg').write_bytes(b'valid')
            a={'file':'x.svg','sha256':hashlib.sha256(b'valid').hexdigest()}
            self.assertEqual(module.verify_asset(p,a),b'valid')
            with self.assertRaisesRegex(ValueError,'OVERLAY_SOURCE_HASH'):
                module.verify_asset(p,{**a,'sha256':'0'*64})
            with self.assertRaisesRegex(ValueError,'OVERLAY_SOURCE_PATH'):
                module.verify_asset(p,{**a,'file':'../elsewhere.svg'})
if __name__=='__main__':unittest.main()
