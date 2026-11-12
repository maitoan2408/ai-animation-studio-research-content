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
