import importlib.util
import json
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('merge_contours',Path(__file__).resolve().parents[1]/'src/art/paper-silhouette/merge_contours.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class MergeContours(unittest.TestCase):
    def test_requires_matching_provenance_and_disjoint_ids(self):
        def blob(manifest,art,ids):return json.dumps({'manifestSha256':manifest,'artManifestSha256':art,'assets':[{'id':i} for i in ids]}).encode()
        first=blob('m','a',['mai/torso']);second=blob('m','a',['background/sky'])
        self.assertEqual(len(module.merge(first,second)['assets']),2)
        with self.assertRaisesRegex(ValueError,'CONTOUR_MANIFEST_MISMATCH'):module.merge(first,blob('bad','a',['background/sky']))
        with self.assertRaisesRegex(ValueError,'CONTOUR_DUPLICATE'):module.merge(first,blob('m','a',['mai/torso']))
if __name__=='__main__':unittest.main()
