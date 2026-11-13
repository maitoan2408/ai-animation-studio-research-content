# Editable paper art and derived shadows

`build_assets.py` authored the64 SVG originals in `assets/lantern-v1`. Preserve
these files and Q1 artifact history. `build_polish.py` produces a separate117
asset pack: the original64 are byte-identical, one additional cup palette,
51 padded soft masks derived from their own SVG silhouettes, and one floor
shadow. A source hash is retained for every original and derived input.

`rasterize_polish.ts` reuses original textures by source hash and rasterizes
new SVGs through pinned Chromium at4x artwork size. Native scene output is
1920×1080, with no upscaling/interpolation of the finished movie. Paths in the
texture manifest are relative to `out/art-q1` for both Blender adapters.

From repository root, with the Q1 textures already restored/generated:

```bash
python scripts/run-step.py Q2 author-polish -- python production/src/art/build_polish.py
python scripts/run-step.py Q2 raster-polish -- production/node_modules/.bin/tsx production/src/art/rasterize_polish.ts
python scripts/run-step.py Q2 verify-polish-textures -- python production/src/art/check_textures.py polish
```

Generated textures are ignored by Git. Published SVGs, selected PNGs, source
snapshots, result manifests and failed attempts are retained. Once a new design
is accepted, create another pack revision; never overwrite accepted art to
make an earlier review appear to approve the changed image.
