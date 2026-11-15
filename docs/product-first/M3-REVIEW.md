# M3 — Product-first character-motion gate / owner review

**2026-11-16 — TECHNICAL PASS, READY_FOR_USER_REVIEW; ownerAcceptance=NOT_REVIEWED.** Gate conducted by delegated-agent and CI, not independent human artistic approval.

## Actual deliverables

- Native Three/Chromium animation: `m3-character-motion-final-1080p.mp4`, 1920×1080, 24fps, 268 frames / 11.1667s; H.264 video only (intentional silent motion clip).
- Actions in order: walk-stop (73 frames), turn-head (49), wave (49), pick-place (97).
- Editable data-only package `m3-project.json` with bounded `character-motion/1` contract, new instance ID `guest-01`, compatible model `an`, art version `lantern-art-1`, rig `production-cutout-1`. The art model is reused, not a newly drawn original character.
- Native stills for 17 locked frames; 3×3 chronological sheet; settled standing pose (frame 72) compared to moving frames 36, 97, 147, 218. Native media directly rendered from the same frame evaluator and source SHA.

## Independent measured acceptance (actual sprites, not root movement)

| Test | Result |
| --- | --- |
| New ID, real rig, capabilities, SHA-locked art | PASS; duplicate ID + untrusted variations fail closed |
| Two alternating swing/stance beats + settling | PASS; 488 planted sole samples, max drift 0 stage-px |
| End/start boundaries, random-order seek parity | PASS; no position/rotation jump at clip seams, byte equality on native reverse seek |
| Wave, head turn, cup lift/return | PASS; 58 held cup grip samples max grip error 0 stage-px; cup lift 66 px |
| Unsupported action/invalid rig/asset/duration/metadata | PASS; explicit error and regression tests |
| Native MP4 integrity | PASS; 268 decoded frames, 1080p24, full FFmpeg decode, actual frame hashes |
| Portable M3 project and evidence hashes | PASS; exact JSON file digest, 17 screenshot digests, contact and comparison digests |
| Independent post-result media auditor | PASS: `m3-post-result-audit.json` (runs only AFTER real video) |
| Full final executable HEAD CI | PASS: Studio 43751133720 and production 43751133731 |

## Genuine second-pass discoveries and repairs

1. Earlier TS test run 43749438061 found unsafe type narrowing of character capabilities; fixed at `04dd297`.
2. Run 43749619818 revealed a negative fixture using a valid walk retiming value; corrected to an actually invalid duration, with indexed failure diagnostics.
3. First native video run 43749804070 succeeded, but **manual reinspection after the video existed** found the manifest claimed a hash of compact JSON while the delivered file was pretty-printed. The delivered project-file hash did not match. Fixed digest-to-file bytes and added a mandatory auditor that reads artifact bytes and aborts on mismatch.
4. The initial “standing” comparison used the walk-start frame 0 rather than a settled pose. Revised comparison to use frame 72 and documented the exact reference.
5. Added a real duplicate-safe character-package registry and a retimed-clip regression, then reran both full CI workflows. Existing M0/M1/M2 tests and real videos remained green.
6. Downloaded the final native ZIP in a separate environment; verified the project hash, film hash `2a902307ae4e7fadccae0fbc6b75ecf3af97e90192015739a35d79b8da0434a5`, all 17 sampled PNG SHA values, contact sheets, FFprobe and full FFmpeg decode. Auditor status is PASS.

Original failures/history preserved in GitHub Actions. No threshold was raised to hide movement or contact problems. All current M3 in-scope technical defects identified in this audit are resolved.

## Reproduction / review

- Studio CI: https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43751133720
- Workbench CI, native media and second audit: https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43751133731
- Artifact: https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43751133731/artifacts/14175973462 ; expires 2026-11-29.
- Run `production/node_modules/.bin/tsx production/src/art/preview.ts` before `npm --prefix production run motion:m3`, then `npm --prefix production run motion:m3:audit`.

## Known limitations and owner gate

Character registration enables a **new instance identity on existing art/rig**, not automatic art design or arbitrary character-model synthesis. No M4 physics/bake or M5 Director; M6 human-quality acting and voice remain future scope. The M3 clip is intentionally silent. Artistic evaluation is NOT automated; only owner can mark M3 `ACCEPTED` before M4 starts. PR #11 remains Draft.
