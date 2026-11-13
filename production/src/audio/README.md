# Local benchmark voice revisions

`prepare_voice.py` uses pinned Kokoro ONNX CPU inference. Setup and SHA-verified
model download are in `production/ENVIRONMENT.md`. The script optionally takes
`--request production/brief/voice-R1.json`; only text, speed and voice may change.
Outputs are unique takes under `out/audio`, with the request, model/voices hashes,
PCM checks, phoneme spans, speech WAV and an8-second scene WAV starting at2s.

The base fixture is in `artifacts/Q1/draft-3/voice`. R1 is separately preserved
in `artifacts/Q2/edit-R1/voice`. `fixture.ts` checks the selected scene WAV hash
and frame slot; `cues.ts` maps predicted phoneme spans into editable mouth cues.
These predictions have not had an independent alignment or listening review.

R1:1.688625→3.209333 seconds of speech, inside the fixed4-second speech slot.
No shot duration or downstream frame offsets change. Longer than4s must fail;
do not speed up, truncate or extend the story silently. Q5 owns production stems,
voice corpus and perceptual cue review; Q7 owns delivery loudness/QC.

## Review delivery loudness

`normalize_review.py <verified-sequence-directory>` đo PCM, tính gain tuyến tính
đến −16 LUFS với dự trữ true peak, encode AAC một lần rồi đo lại file cuối. Không
đụng hình hoặc file cũ. Nếu source im lặng/nonfinite hoặc cần limiter để đạt target,
script dừng rõ nguyên nhân; không tự thay dynamics. R0/R1/R2 đã đo −16.02 LUFS và
TP ≤−1.93 dBTP. Đây là sửa mức âm của fixture, không phải nghe duyệt voice.

Kiểm transport của bản đã cân gain bằng `src/editorial/check_sequence.py` với
tham số thứ hai là đường MP4 mới. RMS lúc đó bao gồm gain chủ ý, không phải chỉ
codec error; gate sync là lag ≤1 frame, đo thực các bản hiện tại bằng0.
