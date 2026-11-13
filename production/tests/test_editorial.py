"""Negative contracts for Q2 sequence ingest and explicit mono rematrix."""
import importlib.util,json,tempfile,unittest,wave
from pathlib import Path
import numpy as np
spec=importlib.util.spec_from_file_location('editorial',Path(__file__).resolve().parents[1]/'src/editorial/assemble.py')
editorial=importlib.util.module_from_spec(spec);spec.loader.exec_module(editorial)

class EditorialContracts(unittest.TestCase):
    def test_r3_requires_parent_and_preserves_order_and_five_shots(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);rows={};timeline=[];cursor=0
            order=json.loads((editorial.ROOT/'brief/edit-R2-order.json').read_text())
            for shot in order:
                take=root/shot;take.mkdir();(take/'picture.mp4').write_bytes(shot.encode())
                (take/'inputs.json').write_text(json.dumps({'edit':{'separateHandoffGrips':True}}))
                result={'deliverySha256':shot+'-old','audioInputSha256':'voice' if shot=='S01' else None}
                rows[shot]=(take,result)
                timeline.append({'shot':shot,'startFrame':cursor,'endFrameExclusive':cursor+editorial.FRAMES[shot],'pictureSha256':editorial.digest(take/'picture.mp4'),**result})
                cursor+=editorial.FRAMES[shot]
            parent=root/'parent.json';parent.write_text(json.dumps({'status':'PASS_TECHNICAL','revision':'R2','frames':1152,'timeline':timeline}))
            with self.assertRaisesRegex(ValueError,'R3_PARENT_REQUIRED'):editorial.revision_order(rows,'R3')
            with self.assertRaisesRegex(ValueError,'R3_S05_NOT_REPLACED'):editorial.revision_order(rows,'R3',parent)
            rows['S05'][1]['deliverySha256']='new-s05'
            self.assertEqual(editorial.revision_order(rows,'R3',parent),order)
            rows['S01'][1]['audioInputSha256']='old-short-voice'
            with self.assertRaisesRegex(ValueError,'R3_VOICE_CHANGED'):editorial.revision_order(rows,'R3',parent)
            rows['S01'][1]['audioInputSha256']='voice'
            rows['S03'][1]['deliverySha256']='lost-cup-edit'
            with self.assertRaisesRegex(ValueError,'R3_UNRELATED_SHOT_CHANGED S03'):editorial.revision_order(rows,'R3',parent)
            rows['S03'][1]['deliverySha256']='S03-old'
            (rows['S05'][0]/'inputs.json').write_text('{"edit":{}}')
            with self.assertRaisesRegex(ValueError,'R3_HANDOFF_EDIT_REQUIRED'):editorial.revision_order(rows,'R3',parent)

    def test_mono_is_explicit_stereo_without_timing_shift(self):
        with tempfile.TemporaryDirectory() as d:
            file=Path(d)/'mono.wav';samples=np.zeros(48000,dtype='<i2');samples[12345]=12000
            with wave.open(str(file),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(48000);w.writeframes(samples.tobytes())
            actual=np.frombuffer(editorial.scene_pcm(file,24),dtype='<i2').reshape(-1,2)
            self.assertEqual(actual.shape,(48000,2));self.assertTrue(np.array_equal(actual[:,0],actual[:,1]));self.assertEqual(int(np.argmax(actual[:,0])),12345)
            self.assertLessEqual(abs(int(actual[12345,0])-12000/2**.5),1)
            with self.assertRaisesRegex(ValueError,'VOICE_PCM_PROFILE'):editorial.scene_pcm(file,48)
    def test_wrong_rate_is_rejected_not_resampled_silently(self):
        with tempfile.TemporaryDirectory() as d:
            file=Path(d)/'rate.wav'
            with wave.open(str(file),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(24000);w.writeframes(bytes(48000))
            with self.assertRaisesRegex(ValueError,'VOICE_PCM_PROFILE'):editorial.scene_pcm(file,24)
    def test_missing_shots_fail_before_output(self):
        with tempfile.TemporaryDirectory() as d:
            file=Path(d)/'selection.json';file.write_text('{}')
            with self.assertRaisesRegex(ValueError,'SIX_UNIQUE_SHOTS_REQUIRED'):editorial.load_selection(file)
    def test_tampered_complete_clip_is_not_reused(self):
        with tempfile.TemporaryDirectory() as d:
            take=Path(d);(take/'delivery.mp4').write_bytes(b'changed after verification')
            (take/'result.json').write_text(json.dumps({'status':'PASS_TECHNICAL','shot':'S01','frames':192,'width':1920,'deliverySha256':'0'*64}))
            file=take/'selection.json';file.write_text(json.dumps({s:d for s in editorial.FRAMES}))
            with self.assertRaisesRegex(ValueError,'TAKE_HASH S01'):editorial.load_selection(file)

if __name__=='__main__':unittest.main()
