import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src/media'))
from contracts import MediaError
from review_bundle import restore


class ReviewBundle(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.payload = b'first part' + b'second part'
        parts = [b'first part', b'second part']
        self.manifest = {'schemaVersion': 1, 'output': 'review.mp4', 'bytes': len(self.payload),
                         'sha256': hashlib.sha256(self.payload).hexdigest(), 'chunks': []}
        for index, part in enumerate(parts):
            name = f'part-{index:03d}.bin'; (self.root / name).write_bytes(part)
            self.manifest['chunks'].append({'file': name, 'bytes': len(part), 'sha256': hashlib.sha256(part).hexdigest()})
        self.write_manifest()

    def tearDown(self):
        self.temp.cleanup()

    def write_manifest(self):
        (self.root / 'bundle.json').write_text(json.dumps(self.manifest))

    def test_exact_restore_retry_and_interrupted_temp(self):
        (self.root / 'restore-interrupted.tmp').write_bytes(b'partial')
        self.assertEqual(restore(self.root).read_bytes(), self.payload)
        self.assertEqual(restore(self.root).read_bytes(), self.payload)
        self.assertEqual((self.root / 'restore-interrupted.tmp').read_bytes(), b'partial')

    def test_corrupted_chunk_never_publishes(self):
        (self.root / 'part-001.bin').write_bytes(b'changedpart')
        with self.assertRaisesRegex(MediaError, 'CHUNK_HASH_MISMATCH'):
            restore(self.root)
        self.assertFalse((self.root / 'review.mp4').exists())

    def test_traversal_symlink_and_overwrite_rejected(self):
        self.manifest['chunks'][0]['file'] = '../part-000.bin'; self.write_manifest()
        with self.assertRaisesRegex(MediaError, 'UNSAFE_CHUNK_NAME'):
            restore(self.root)
        self.manifest['chunks'][0]['file'] = 'part-000.bin'; self.write_manifest()
        (self.root / 'review.mp4').write_bytes(b'existing wrong output')
        with self.assertRaisesRegex(MediaError, 'EXISTING_OUTPUT_MISMATCH'):
            restore(self.root)
        (self.root / 'review.mp4').unlink()
        (self.root / 'part-000.bin').unlink()
        (self.root / 'part-000.bin').symlink_to(self.root / 'part-001.bin')
        with self.assertRaisesRegex(MediaError, 'INVALID_CHUNK_FILE'):
            restore(self.root)


if __name__ == '__main__': unittest.main()
