"""Fresh checkout texture restore, exact reuse and corrupted cache rejection."""
from contextlib import redirect_stdout
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

PRODUCTION = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('hero_textures', PRODUCTION / 'src/motion/prepare_textures.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class HeroTextures(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.archive = self.root / 'artifacts/Q2/s05-r3/native-S05-R3.zip'
        self.archive.parent.mkdir(parents=True)
        self.archive.symlink_to(PRODUCTION / 'artifacts/Q2/s05-r3/native-S05-R3.zip')
        self.art = self.root / 'assets/lantern-polish-1/manifest.json'
        self.art.parent.mkdir(parents=True)
        self.art.write_bytes((PRODUCTION / 'assets/lantern-polish-1/manifest.json').read_bytes())

    def run_restore(self):
        output = io.StringIO()
        with patch.object(module, 'ROOT', self.root), redirect_stdout(output):
            module.prepare()
        return json.loads(output.getvalue())

    def test_fresh_restore_reuse_and_corrupt_cache(self):
        first = self.run_restore()
        self.assertEqual(first, self.run_restore())
        manifest = Path(first['manifest'])
        index = json.loads(manifest.read_text())
        self.assertEqual(len(index['textures']), 51)
        for t in index['textures']:
            file = self.root / 'out/art-q1' / t['file']
            self.assertEqual(module.digest(file.read_bytes()), t['sha256'])
        changed = manifest.parent / (index['textures'][0]['sha256'] + '.png')
        changed.write_bytes(b'corrupted')
        with self.assertRaisesRegex(ValueError, 'HERO_TEXTURE_CACHE_CHANGED'):
            self.run_restore()
        self.assertEqual(changed.read_bytes(), b'corrupted', 'recovery must not silently overwrite')

    def test_changed_art_is_rejected_before_publish(self):
        art = json.loads(self.art.read_text())
        next(a for a in art['assets'] if a['id'] == 'props/lantern-lit')['sha256'] = '0' * 64
        self.art.write_text(json.dumps(art))
        with self.assertRaisesRegex(ValueError, 'HERO_TEXTURE_ART_CHANGED'):
            self.run_restore()
        self.assertFalse((self.root / 'out/hero-textures' / module.ARCHIVE_SHA).exists())

    def test_changed_archive_is_rejected_before_reading_zip(self):
        self.archive.unlink()
        self.archive.write_bytes(b'not a trusted ZIP')
        with self.assertRaisesRegex(ValueError, 'HERO_TEXTURE_ARCHIVE_HASH'):
            self.run_restore()


if __name__ == '__main__':
    unittest.main()
