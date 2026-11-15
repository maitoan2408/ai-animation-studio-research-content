import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('expression_drafts',ROOT/'src/art/build_expression_drafts.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class ExpressionDrafts(unittest.TestCase):
    def test_distinct_18_heads_keep_pivots_and_anchors(self):
        originals={a['id']:a for a in json.loads((ROOT/'assets/lantern-polish-1/manifest.json').read_text())['assets']}
        with tempfile.TemporaryDirectory() as folder:
            module.OUT=Path(folder);draft=module.generate();self.assertEqual(draft,module.generate())
            self.assertEqual(len(draft['assets']),18);self.assertEqual(len({a['sha256'] for a in draft['assets']}),18)
            for a in draft['assets']:
                base=originals[a['id'].rsplit('-',1)[0]+'-neutral'];raw=(module.OUT/a['file']).read_bytes()
                self.assertEqual(hashlib.sha256(raw).hexdigest(),a['sha256']);ET.fromstring(raw)
                self.assertNotEqual(a['sha256'],base['sha256']);self.assertEqual(a['dependsOn'],base['sha256'])
                self.assertEqual(a['pivot'],base['pivot']);self.assertEqual(a['anchors'],base['anchors'])
            (module.OUT/draft['assets'][0]['file']).write_text('changed')
            with self.assertRaisesRegex(ValueError,'EXPRESSION_IMMUTABLE'):module.generate()
if __name__=='__main__':unittest.main()
