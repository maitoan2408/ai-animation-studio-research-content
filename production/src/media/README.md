# Q2 media boundary and web-review program

The authoring PNG is display-referred sRGB. The locked master remains BT.709
limited H.264. Prior measurements established a small inverse-decoder error but
a larger Chromium display difference; tags alone were not an acceptance test.

`media-contract-v1.json` adds a distinct sRGB-transfer web-review profile before
running its tests. We transform the pixel values and set the matching transfer
tag. We never relabel the same samples, alter the master or inherit artistic
approval onto a new file. Native size, timing and copied AAC stay the same.

Tests cover known artwork, visible Chromium presentation, straight-alpha assets
on white/black, alpha roundtrip, wrong profiles and intentionally wrong transforms.
Thresholds are fixed in the brief before execution. Any failure keeps its take.
This is Q2 research instrumentation; no production backend is selected here.
