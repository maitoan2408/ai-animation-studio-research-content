# Q2 media contract — partial technical result

Thresholds in `production/brief/media-contract-v1.json` were recorded before execution.
No threshold has been relaxed after a failure.

- **PASS:** PNG straight-alpha byte roundtrip and white/black composition on two
  authored assets; all four deliberately wrong premultiplied interpretations rejected.
- **PASS:** four media-profile negative test methods. A web copy transforms values
  from BT709 transfer to sRGB transfer and copies the AAC packets exactly.
- **PASS bounded sample:** real-art Chromium canvas/compositor MAE1.404, P954,
  compared with locked MAE≤3/P95≤6. Previous BT709 master in this browser rejects
  this web criterion (MAE6.963/P9511); the master is not thereby an invalid master.
- **FAIL EX-024:** synthetic palette/primary chart max34 vs max3. Direct PNG single
  encode improves to max15 but still fails. Explicit sRGB display flag does not fix
  it. FFmpeg center colors differ from Chromium, so encoding and player conversion
  must be distinguished. FFmpeg patch-edge maxima still exceed the locked gate.
- **REJECTED:** lossless RGB H264 candidate renders incorrect colors in Chromium.
  It is not promoted to a delivery profile.

`diagnostics/` retains selected failed fixtures, reference images, reports and
comparisons. Every experiment's command, source ZIP and log remains in evidence/Q2.
The fixture JSON records original runtime paths; on a fresh checkout regenerate
with `color_fixture.py` rather than assuming these absolute paths exist.

`../web-review/R*/review.mp4` are explicitly **diagnostic**. Catalog colorStatus is
pending; passing probe/decode alone does not make them acceptable for color approval.
The separate normalized BT709 masters and final native sources remain unchanged.
