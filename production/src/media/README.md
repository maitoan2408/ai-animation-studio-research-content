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

## EX-024 and version2

V1's real-art average passed but the frozen20-patch chart failed(max34). Direct
native PNG→limited-rangeCRF12 still failed(max15); explicit browser sRGB display
did not fix it. RGB H264 was rejected because this player misdisplayed it.
Full-rangeYUV/CRF12 improved to max4; removing YUV encode loss atCRF0 gave max1.
All used the same original max3/inset2 criterion. No false retagging or changed
threshold. This is an observed player-path limitation, not a proven upstream
Chromium root-cause attribution.

`media-contract-v2.json` defines the resulting local review profile: sRGB PNG →
full-range709-matrixYUV420 → libx264CRF0. This preserves converted YUV, **not RGB**
(4:2:0 subsamples chroma). Each native sequence is compared frame-by-frame against
the independently decoded YUV samples. AAC is copied from the normalized master;
packets, start/duration, input hashes and master bytes remain exact. H264's
High444Predictive profile name does not imply the pixels are4:4:4: FFprobe reports
yuvj420p/full-range. Tested pinned Chromium decodes it; other decoders may differ.

```bash
# Regenerate if the corresponding native PNG takes exist (or were rerendered).
python production/src/media/native_review.py <editorial-result.json> <normalized-master.mp4> --sha256 <master-sha256>
# Small-enough Git transport pieces, with no extra media encode.
python production/src/media/review_bundle.py pack <new-output-directory> <new-bundle-directory>
# Restore selected committed review media; no renderer/model installation needed.
python production/src/media/review_bundle.py restore production/artifacts/Q2/web-review-v2
```

Each encode has an immutable output directory, command, source-frame SHA list,
YUV MD5 sequences and result. No output is promoted on profile metadata alone.
Bundle parts are at most32MiB. Restore rejects changed chunks, traversal, symlink
escape and wrong existing output; temporary files survive failures. Whole-file
SHA remains the video identity. Restored `review.mp4` files are ignored by Git;
commit the parts/manifest and selected reports. Python QC arrays/image tests need
`requirements-qc.lock` (NumPy2.3.5/Pillow13.0.0), restoration itself does not.

The larger files and software decoder need playback measurement on the operator's
machine. Concurrent encoder/player runs are functional checks, not fair timing
or proof of smooth playback. Artistic motion review and the3cold+5warm protocol
remain separate gates.
