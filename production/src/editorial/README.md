# Q2 sequence assembly and edit-locality evidence

These commands use only the six trusted benchmark fixtures; they are not the
production timeline API. A selection JSON maps each S01..S06 to a completed
native take directory. Every take must have a PASS_TECHNICAL result, the expected
frame/profile, and an unchanged delivery SHA. The picture-only H.264 stream must
also match the verified delivery stream; a stale picture file cannot sneak in.

`assemble.py selection.json R0|R1|R2` copies the selected encoded pictures into
an immutable output take. R2 uses `brief/edit-R2-order.json`. It builds the PCM
timeline at exactly2000 samples per frame and encodes AAC once. The known voice
source is mono48k/16bit, explicitly rematrixed at−3dB per stereo channel; stereo
sources keep their channels. Wrong length/rate/bit depth is rejected. There is
no AAC concatenation, inferred silence trim, automatic loudness or truncation.

`check_sequence.py <output-directory>` independently decodes every frame from
the selected delivery clips and the final sequence. All1,152 hashes must match
in the requested order. PCM placement is byte exact; AAC transport lag must be
within one frame/2000 samples. RMS codec error is a measurement, not a perceptual
score. One completed R0 test measured0-sample lag; do not infer natural speech.

```bash
python scripts/run-step.py Q2 editorial-negatives -- python -m unittest discover -s production/tests -p test_editorial.py -v
python scripts/run-step.py Q2 assemble-round -- python production/src/editorial/assemble.py production/out/b-polish-r0-selection.json R0
python scripts/run-step.py Q2 verify-round -- python production/src/editorial/check_sequence.py production/out/sequences/<new-take>
```

The first assembly rejected a false stereo assumption (EX-021); the failed take
and log remain. Source fixtures stay immutable. A future production assembler
needs the Q4 revision/dependency contract and Q7 publish/recovery gates.
