"""Profile negatives use a committed real ffprobe result, not guessed metadata."""
import copy
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src/media'))
from contracts import MediaError, validate_probe


class MediaProfiles(unittest.TestCase):
    def setUp(self):
        self.probe = json.loads((ROOT / 'artifacts/Q2/review-final/R2/loudness-report.json').read_text())['probe']

    def test_verified_master_has_the_locked_profile(self):
        validate_probe(self.probe, 'master', 1152)

    def test_review_cannot_accept_master_transfer_tag(self):
        with self.assertRaisesRegex(MediaError, 'color_transfer'):
            validate_probe(self.probe, 'review', 1152)

    def test_missing_transfer_wrong_range_frame_rate_or_channels_reject(self):
        for stream, field, value in [(0, 'color_transfer', None), (0, 'color_range', 'pc'),
                                     (0, 'avg_frame_rate', '30/1'), (1, 'channels', 1)]:
            with self.subTest(field=field):
                changed = copy.deepcopy(self.probe)
                changed['streams'][stream][field] = value
                with self.assertRaisesRegex(MediaError, 'PROFILE_MISMATCH'):
                    validate_probe(changed, 'master', 1152)

    def test_wrong_frames_extra_stream_and_audio_duration_reject(self):
        with self.assertRaisesRegex(MediaError, 'nb_read_frames'):
            validate_probe(self.probe, 'master', 1151)
        changed = copy.deepcopy(self.probe)
        changed['streams'].append({'codec_type': 'subtitle'})
        with self.assertRaisesRegex(MediaError, 'STREAM_LAYOUT'):
            validate_probe(changed, 'master', 1152)
        changed = copy.deepcopy(self.probe)
        changed['streams'][1]['duration'] = '48.010000'
        with self.assertRaisesRegex(MediaError, 'DURATION_MISMATCH'):
            validate_probe(changed, 'master', 1152)

    def test_nonfinite_duration_cannot_bypass_boundary(self):
        for value in ['nan', 'inf', '-inf']:
            changed = copy.deepcopy(self.probe)
            changed['streams'][0]['duration'] = value
            with self.assertRaisesRegex(MediaError, 'DURATION_MISMATCH'):
                validate_probe(changed, 'master', 1152)

    def test_full_range_review_is_distinct_from_master_and_old_web_profile(self):
        actual = json.loads((ROOT / 'artifacts/Q2/media-contract-v2/chart/result.json').read_text())['probe']
        validate_probe(actual, 'review_v2', 48)
        for profile in ['master', 'review']:
            with self.assertRaisesRegex(MediaError, 'PROFILE_MISMATCH'):
                validate_probe(actual, profile, 48)
        changed = copy.deepcopy(actual)
        changed['streams'][0]['color_range'] = 'tv'
        with self.assertRaisesRegex(MediaError, 'color_range'):
            validate_probe(changed, 'review_v2', 48)


if __name__ == '__main__':
    unittest.main()
