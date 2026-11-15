import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('inventory_svg', Path(__file__).resolve().parents[1] / 'src/art/inventory_svg.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

class InventorySVG(unittest.TestCase):
    def test_features_hash_and_pivot_are_recorded(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'part.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg"><defs><filter id="f"/></defs><path filter="url(#f)" stroke="red" d="M0 0"/></svg>')
            m = root / 'manifest.json'
            m.write_text(json.dumps({'assets': [{'id': 'part', 'file': 'part.svg', 'width': 10, 'height': 20, 'pivot': [1, 2]}]}))
            result = MODULE.inventory(m)
            self.assertEqual(result['featureAssetCounts'], {'filter': 1, 'stroke': 1})
            self.assertEqual(result['assets'][0]['pivot'], [1, 2])
            self.assertEqual(len(result['assets'][0]['sha256']), 64)

    def test_rejects_escape_and_duplicate_ids(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            m = root / 'manifest.json'
            m.write_text(json.dumps({'assets': [{'id': 'x', 'file': '../outside.svg'}]}))
            with self.assertRaisesRegex(ValueError, 'ASSET_PATH_INVALID'):
                MODULE.inventory(m)
            (root / 'part.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg"/>')
            part = {'id': 'x', 'file': 'part.svg', 'width': 1, 'height': 1, 'pivot': [0, 0]}
            m.write_text(json.dumps({'assets': [part, part]}))
            with self.assertRaisesRegex(ValueError, 'ASSET_DUPLICATE_ID'):
                MODULE.inventory(m)

if __name__ == '__main__':
    unittest.main()
