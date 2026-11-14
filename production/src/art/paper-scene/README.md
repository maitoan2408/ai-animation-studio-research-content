# F2 paper scene experiments

These are isolated workbench candidates, not the product renderer or approved art.

1. Restore the hash-verified R3 textures: `python production/src/motion/prepare_textures.py`.
2. Assemble a fresh development overlay with `python production/src/art/build_f2_overlay_v2.py`; use the printed output directory.
3. Build its bound S05 frame stream using `production/node_modules/.bin/tsx production/src/motion/build_f2_hero.ts <overlay-directory>`. This compares all original S05 numeric bake frames and scene frames and runs ground, ownership and projected-alpha checks. Draft expressions are not animated by this baseline.
4. Run `production/node_modules/.bin/tsx production/src/art/paper-scene/animate.ts <f2-hero-output>/S05.json production/artifacts/quality/v2-f2/overlay-foreground-contours-4x.json` for 640 × 360, or add `1080` for 1920 × 1080. For the mixed 86-contour experiment use `production/artifacts/quality/v2-f2/overlay-physical-contours.json preview physical`; `physical` fails closed if a background contour is absent. It writes a fresh directory in `production/out/f2-animation/`, 192 PNGs and a silent MP4. Run `python production/src/art/paper-scene/verify_animation.py <output>` to recheck every frame hash, PNG decode, video hash, frame count/fps/dimensions and full video decode.
5. Wrap commands in `scripts/run-step.py U1` or `U3`, retain failed attempts, and do not commit generated video or all frame PNGs.

The animation uses indexed absolute frame state and tests repeat/reverse seeks. Bodies are alpha-threshold contours with oblique per-sprite shear; face textures and existing authored shadows are retained. The render made so far uses 79 foreground contours and leaves seven background sprites flat; separately generated 86-contour stills include those backgrounds. A silent video or identical seek does not establish artistic timing, speech, audio, edge quality, shadow correctness, 3D collision or user approval. Rendering may take several minutes under software rendering. The new expression/mouth overlay is not animated by this candidate.

The bounded still harness accepts optional `look` and profile arguments after coverage: `basic|standard|lambert|fold|depth|depth-lit|depth-soft|contact|edge|fiber|glow` and `1080|preview`. Default remains `basic 1080`. The look modes are isolated T1/T2 experiments, not an approved preset. Compare equally sized PNGs with `python production/src/art/paper-scene/compare_before_after.py <before> <after> <regions.json> <output-directory>`; means are ΔE00 in sRGB-derived Lab D65 and do not establish a visual/art gate. See `docs/quality/F2-DECISIONS.md` for scope and unverified thresholds.

The contact, edge, fiber and glow modes are independent experiments: contact uses the SHA-checked S05 development ground fixture, edge only displaces the back surface, fiber is UV color modulation, and glow is a sprite controlled by a final optional intensity argument (0–1). None is an approved look.
