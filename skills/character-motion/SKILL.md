# Character Motion — M3 bounded skill

**ID:** `character-motion` · **Version:** `character-motion/1` · **Executor:** `production/src/motion/character-library.ts` · **Renderer:** `production/src/render/render-m3.ts` using actual Three/Chromium native scene.

## Input

Strict `M3Project` with `schemaVersion`, `character`, `clips`, `prop`. Character has unique runtime instance `id`, compatible source art model (`mai` / `an`), `rigId=production-cutout-1`, art-pack version, a unique nonempty subset of the four supported capabilities, start x/floor/facing. Every clip must declare an action in that character's capability subset and a bounded frame count. `prop` is optional for walk/head/wave-only tracks; pick/place requires a SHA-matching cup with a valid grip anchor and prevalidated IK reach. Source example is the exported `m3-project.json`.

## Supported capabilities

- `walk-stop`: two alternate swing/stance steps followed by 24-frame settle. Locked sole is measured at the **actual boot anchor** in world coordinates, not at the actor root.
- `turn-head`: bounded additive head rotation with same neutral start/end.
- `wave`: supported right arm gesture with validated IK.
- `pick-place`: reach, hand/grip attachment, 66px lift, lower, release, and neutral recovery. Cup and grip share the same actual anchor.

All actions are random-access samples at integer 24fps frames; clip lengths may be retimed inside validated bounds. The renderer samples `sampleM3(project,frame,pack)` and consumes real `SceneFrame` sprites and markers. Use `M3CharacterRegistry.register/resolve` to store a validated, immutable-per-read package and refuse ID collisions.

## Outputs and failures

- `M3Sample`: selected action, clip local frame, actual actor pose, scene sprites/markers, contact report.
- `motion:m3`: native 1080p MP4, 17 PNG frames, timeline contact, standing-vs-motion comparison, project JSON and SHA manifest.
- `motion:m3:audit`: separate post-result `m3-post-result-audit.json` (PASS or FAIL), checking real artifact byte hashes, ffprobe and full decode.
- Fail closed with `M3_PROJECT_INVALID`, `M3_CHARACTER_RIG_OR_CAPABILITIES`, `M3_CHARACTER_DUPLICATE`, `M3_CHARACTER_UNKNOWN`, `M3_ACTION_UNSUPPORTED`, `M3_ACTION_NOT_CAPABLE`, `M3_ACTION_DURATION`, `M3_PROP_REQUIRED`, `M3_PICK_IK_UNREACHABLE`, `M3_PROP_HASH_OR_ANCHOR`, `M3_FRAME_OUT_OF_RANGE`, or underlying IK reachability errors. Never execute user or model-authored JavaScript.

## Gate and exclusions

Run full production tests, real native showcase, *then* second-pass audit. Run root Studio regression on same final HEAD. Publish real images/video directly in chat only after PASS and owner acceptance; do not mark artistic approval yourself. M3 has no generalized Rapier interactions (M4), agent planning (M5), premium acting or voice (M6). `SKILL.md` is guidance, not a substitute for the tested executor.
