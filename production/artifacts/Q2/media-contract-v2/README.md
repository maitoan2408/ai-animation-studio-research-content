# Media v2 — bounded reference-player pass

V1 chart failed max34. Native limited-rangeCRF12 failed max15; forcing an sRGB
display did not fix it. RGB H264 was rejected by this player; full-rangeCRF12
still failed max4. Full-rangeYUV/CRF0 passes max1. The original max3/inset2 and
real-art MAE≤3/P95≤6 have not changed. These are controlled output-path results,
not an upstream Chromium bug attribution or universal display certification.

`chart/` preserves the passing fixture, FFprobe, command and actual player report.
`R0/`, `R1/`, `R2/` each contain the actual source PNG, player/compositor captures,
video identity and color measurement. Native source hashes agree with each
review bundle's source-frames.json. R0/R1 captures were taken while an encoder
ran; R2 playback had no concurrent renderer. Frame counters are browser counters,
not substitutes for the full FFmpeg decoded frame verification.

Every native web review has1152 exact decoded YUV frames, identical AAC packets,
unchanged source PNGs/timeline/master and complete decode/profile validation.
All three current catalogs bind these files by SHA. Their old BT709 masters
remain valid masters and are not relabelled. V2 is a new sRGB-transfer/full-range
local web derivative; larger files/High444Predictive software decoding are tradeoffs.

Reproduce chart on the current browser:

```bash
python production/src/qa/check_color_reference.py
```

This writes new output directories. Keep any new failure; do not update the
threshold, replace the reference or call a successful command an art approval.
See `production/src/media/README.md` for full generation/restore contracts.
