# Authored performance + secondary replay

`hero.ts` defines a bounded S05 PerformanceIR (intent, beats, ownership), converts
R3 prop/grip geometry into physical input, and replays baked COM/angle into the
existing IK rig. `critic.ts` measures all192frames: palm-to-handle, simulated
joint-to-authored anchor, actual boot soles, rotation and derivative peaks.
The negative detached-joint test demonstrates why palm/IK coincidence alone
cannot prove the physics constraint is correct. Decorative shadows are not
boots; the first critic attempt failed on their missing sole anchor and remains
in evidence/U3. All four real boots are still checked at every frame.

`build_hero.ts` creates a UUID attempt with input.json, bake.json,
performance.json and critic.json. A failure writes failure.json and exits1;
no output is promoted by presence alone. Native export requires prepared
textures and `--native-input`; it emits S05.json for the existing Blender VSE
adapter. No engine executes inside Blender and every keyed pose is inspectable.

To render on a fresh checkout, prepare textures once with
`production/node_modules/.bin/tsx production/src/art/preview.ts` followed by
`production/node_modules/.bin/tsx production/src/art/rasterize_polish.ts`.
Then run `npm --prefix production run quality:hero -- --native-input` and use
its printed output path as BENCHMARK_INPUT_DIR:

```bash
python scripts/run-step.py U6 hero-native -- env BENCHMARK_INPUT_DIR=/absolute/path/printed/by/hero BLENDER_USER_CONFIG=/tmp/studio-blender-config blender --background --factory-startup --python-exit-code 1 --python production/src/blender/vse_probe.py -- S05 1920 all
```

Versions/runtime: production/ENVIRONMENT.md. New media and native packages stay
under out (gitignored); Git retains source, input/bake and small measured reports.
Preserve the old attempt; repairs create another output and their own source
snapshot. Native output is a candidate, never an automatic artistic approval.
