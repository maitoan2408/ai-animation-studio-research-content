# Diagnostic web copies — color gate pending

R0/R1/R2 are sRGB-transfer derivatives of the unchanged normalized BT709 masters.
Each retains 1,152 frames at24fps and identical AAC elementary packets. Full decode
and profile validation pass. The synthetic chart fails the stricter pixel gate:
do not use this catalog to claim color acceptance. See ../media-contract-v1/README.md.

All catalog paths are relative to `production/artifacts/Q2`, not this directory.
Reviews must bind to the derivative's exact SHA plus the original master's SHA.
Replacing a video requires a new hash/record; old opinions are not inherited.
