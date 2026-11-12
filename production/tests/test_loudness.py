import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('gain',Path(__file__).resolve().parents[1]/'src/audio/normalize_review.py');gain=importlib.util.module_from_spec(spec);spec.loader.exec_module(gain)
class LoudnessContracts(unittest.TestCase):
 def test_sparse_voice_can_reach_target_with_peak_reserve(self):self.assertAlmostEqual(gain.proposed_gain(-25.66,-11.6),9.66)
 def test_silent_or_nonfinite_audio_is_rejected(self):
  for loudness,peak in [(-float('inf'),-float('inf')),(float('nan'),-10)]:
   with self.assertRaisesRegex(ValueError,'NONFINITE_OR_SILENT_AUDIO'):gain.proposed_gain(loudness,peak)
 def test_peak_limited_voice_does_not_silently_change_dynamics(self):
  with self.assertRaisesRegex(ValueError,'LIMITER_REQUIRED'):gain.proposed_gain(-30,-2)
if __name__=='__main__':unittest.main()
