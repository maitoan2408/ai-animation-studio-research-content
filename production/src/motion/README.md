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

For this locked hero on a fresh checkout, restore the exact S05 texture bytes
from the already committed native package. No previous browser cache is needed:

```bash
python production/src/motion/prepare_textures.py
npm --prefix production run quality:hero -- --native-input --textures out/hero-textures/d5a8aa9c807b9c95f4ddcfbc9c1b0591f6035e601e285053d614a7e7ed06c309/textures.json
```

The helper verifies the archive, source JSON, asset bindings and all PNG bytes.
It restores 51 asset bindings, sharing identical texture files where appropriate.
Existing corrupted bytes are rejected, never silently overwritten. When art is
intentionally revised, prepare a new texture manifest and candidate instead of
changing the pinned archive/hash to hide a mismatch.

Use the printed hero output path as BENCHMARK_INPUT_DIR:

```bash
python scripts/run-step.py U6 hero-native -- env BENCHMARK_INPUT_DIR=/absolute/path/printed/by/hero BLENDER_USER_CONFIG=/tmp/studio-blender-config blender --background --factory-startup --python-exit-code 1 --python production/src/blender/vse_probe.py -- S05 1920 all
```

Versions/runtime: production/ENVIRONMENT.md. New media and native packages stay
under out (gitignored); Git retains source, input/bake and small measured reports.
Preserve the old attempt; repairs create another output and their own source
snapshot. Native output is a candidate, never an automatic artistic approval.

## Performance contract and visual diagnostics

`performance.ts` validates actor/prop/clip capabilities, continuous beat coverage,
frame bounds, emphasis, gaze and contact intervals. Unknown targets, overlapping
contacts on one control and unsupported clips reject before render. S05 stores
both hand grip intervals; the `secondary` instance is `lamp` (the former metadata
label `lantern` was not an instance ID). The authored S05 adapter rejects arbitrary
schema-valid variations: emotion/emphasis fields describe its fixed intent and
are not a claim that an AI can execute new acting without an implemented clip.

Generate a fresh bound hero, then use its printed absolute path:

```bash
npm --prefix production run quality:hero
npm --prefix production run quality:diagnostics -- --hero /absolute/hero/output
```

Outputs have unique directories under `out/quality-diagnostics`:10frame contact
sheet, onion skin at100/108/116/124, lantern pivot motion trail, rotation/contact/
foot/velocity/acceleration/jerk plots, per-frame measurements and SHA manifest.
The SVG preview uses verified development asset source; it is not native renderer
or color parity. Derivatives are measured at24fps, descriptive rather than an
acting score. The final lantern angle is still nonzero: do not connect the next
shot to an upright state without a matching transition or authored reset.

Local/CI end-to-end check (exact texture restore,192frame export, baseline input/
motion equality, actual Chromium diagnostic render and output SHA verification):

```bash
python scripts/run-step.py U7 diagnostic-workflow -- python production/src/qa/check_quality_diagnostics.py
```

No new media/native ZIP is committed. Human art/voice/reference and six acted
clips remain open; this instrumentation does not advance Q3 or close Q2.

The S05 candidate exporter now validates all four declared sole tracks against
`brief/quality/ground-fixture.json` before generating native input; it writes
`ground-critic.json` with fixture and bake hashes, and aborts on ground failure.
The test gate checks declared stance only: it does not check torso/prop overlap,
other shots, artistic quality or final approval. Legacy `footPixels` and
`maxFootDriftPixels` remain for compatibility; the identical explicitly named
`footPreservationPixels` / `maxFootPreservationPixels` describe difference from
the authored baseline, not actual ground contact or measured foot slip.

For `--native-input`, the exporter writes a pending S05 frame stream, evaluates
projected alpha overlap of the lantern and both torsos against hash-verified R3
textures, validates report/source hashes and only then renames it to `S05.json`.
An overlap or malformed report fails closed. `alpha-critic.json` is evidence for
alpha >= 128 at nearest stage-pixel sampling only; it does not prove 3D collision,
cover translucent pixels or constitute artistic approval. Python 3 and Pillow are
required for this development workbench gate.
