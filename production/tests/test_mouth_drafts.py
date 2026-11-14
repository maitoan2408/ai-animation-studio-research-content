import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('mouth_drafts',ROOT/'src/art/build_mouth_drafts.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class MouthDrafts(unittest.TestCase):
    def test_distinct_valid_assets_and_immutable_replay(self):
        with tempfile.TemporaryDirectory() as folder:
            module.OUT=Path(folder)
            manifest=module.generate();self.assertEqual(manifest,module.generate())
            self.assertEqual(manifest['status'],'PROVISIONAL_NOT_APPROVED')
            hashes=set()
            for a in manifest['assets']:
                content=(module.OUT/a['file']).read_bytes();root=ET.fromstring(content)
                self.assertEqual(root.attrib['viewBox'],'0 0 36 28');self.assertEqual(a['pivot'],[17,14])
                self.assertEqual(hashlib.sha256(content).hexdigest(),a['sha256']);hashes.add(a['sha256'])
            self.assertEqual(len(hashes),3)
            (module.OUT/'U.svg').write_text('changed')
            with self.assertRaisesRegex(ValueError,'DRAFT_IMMUTABLE_EXISTING'):module.generate()
    def test_supplement_does_not_change_original_pack(self):
        pack=json.loads((ROOT/'assets/lantern-polish-1/manifest.json').read_text())
        self.assertEqual(len(pack['assets']),117)
        mouth={x['id'] for x in pack['assets'] if x['id'].startswith('mouth/')}
        self.assertTrue({'mouth/M','mouth/A','mouth/E','mouth/O','mouth/F'}.issubset(mouth))
        self.assertTrue({'mouth/U','mouth/L','mouth/teeth'}.isdisjoint(mouth))
if __name__=='__main__':unittest.main()
