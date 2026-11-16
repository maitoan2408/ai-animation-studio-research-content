> **Owner acceptance — 2026-11-16:** “Oce rồi mình duyệt”. The delivered M3 result and M1–M3 audit on `618e50a` are **ACCEPTED**. Pending-owner statements below describe earlier checkpoints. M4 is next in the unchanged roadmap; its own implementation/verification gates remain open. No automatic PR merge.

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
| Full final executable HEAD CI | PASS: Studio 43753767435 and production 43753767459 |

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

## Supplemental post-review defect audit and repairs — 2026-11-16

At the owner's request, M3 was **reopened for a second functional limitation audit**, even though the earlier native film and tests had passed. The additional examination found three genuine M3-scoped design/data-contract weaknesses and all were repaired before this review:

1. **Capabilities were all-or-nothing:** the registry rejected a character package intentionally supporting only one or two actions; declared capabilities therefore did not express actual supported actions. Now any nonempty unique subset of `walk-stop`, `turn-head`, `wave` and `pick-place` is allowed; undeclared clips and malformed/duplicate capabilities reject explicitly.
2. **Unnecessary cup dependency:** the schema insisted on a cup for simple walk/head/wave sequences. `prop` is now optional unless `pick-place` is included; corresponding animation frame results omit unused cup/bench markers/sprites.
3. **Late IK configuration failure:** accepted data could position the cup beyond the validated arm's 105+98 stage-pixel reach; the sample/render then failed later. Project validation now checks the hand-to-cup reach envelope for each pick/place clip **before rendering** and returns `M3_PICK_IK_UNREACHABLE`.

Added regressions for all three repaired behaviors plus invalid/boundary cases. Existing M0/M1/M2/M3 app/workbench tests were rerun on `61020373e6b64c9901fb6d3f5b7d19827363ec92`. The resulting complete Studio CI <https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43753767435> and workbench CI <https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43753767459> both passed, including a fresh M3 native 1080p render and independent **post-result** auditor.

Latest artifact `q2-workbench-142`: <https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43753767459/artifacts/14178155027>. Externally downloaded ZIP was checked directly: **21/21** manifest hashes of the video, portable project, 17 full-resolution frames, contact sheet and A/B comparison matched. Full FFmpeg decode and ffprobe 1920×1080 24fps/268 frames passed. The new binary movie remains SHA-256 `2a902307ae4e7fadccae0fbc6b75ecf3af97e90192015739a35d79b8da0434a5`, byte-identical to the previous verified movie, confirming the showcase itself did not regress. No human artistic approval has been claimed.

### Disclosed remaining limitations (not silently marked fixed)

- This is a **bounded demonstration with existing `mai`/`an` character art and `production-cutout-1` rig**; it does not create new character drawings or automatically fit arbitrary third-party rigs. Right-facing motion, a two-step walk-stop and a SHA-locked cup are supported; generalized directional gait, arbitrary props and broad rig authoring are not yet implemented.
- The reusable action executor currently runs in the **production Three/Chromium workbench**; new actions are **not yet available as user-selectable M2 Studio UI actions**. This is a product integration limit to resolve in a future approved milestone if the owner requires it before moving on.
- Real generalized physics is M4; Director Agent is M5; natural character acting/voice finish is M6. Native no-slip/contact results are technical measures, not proof of lifelike animation.
- PR #11 stays Draft. `READY_FOR_USER_REVIEW` is for the bounded M3 gate only. **M4 is blocked until owner expressly accepts M3 and its disclosed boundaries.**


## M3 final product integration closure — 2026-11-16

After the supplemental audit, the owner requested completion of M3, including the outstanding Studio integration. The root Paper Studio now has a real **Character Motion** page at `/motion` (source: `web/motion.html`, `web/motion.js`, `src/motion-service.ts`) with character/model selection, ordered editable action clips, frame durations, optional cup controls, revision save/reload, project JSON import/export, and native 1080p MP4 rendering/download. This is a separate Studio workspace connected to the root HTTP server; it is **not** an action selector embedded in the old storyboard editor. M2's original schema and renderer remain unchanged.

The integration validates project data through the real workbench M3 contract, rejects unrecognized or unsupported actions, protects against stale revisions and simultaneous render requests, and verifies the native MP4 SHA before exposing the result. The UI-to-render end-to-end test generates a **new non-default wave-only, prop-free 49-frame 1080p/24fps native video** from a saved Studio revision, including actual desktop/mobile screenshots, a chronological contact sheet, exported JSON, and independent post-result media audit. Full production showcase (268 frames) remains in place.

**Final executable commit:** `7030efec1f9d47e1a3815790f8baad6f4a6c1c4b`.
**Full final-commit CI results:** root Studio `43805995843` SUCCESS; production `43805995855` SUCCESS, including negative/concurrent-render regression and M3 Studio independent post-result audit.
**Evidence:** [Studio CI](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43805995843), [Workbench CI](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43805995855), [native evidence artifact](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43805995855/artifacts/14198174989).

Remaining scope boundaries: art/rig reuse, right-facing bounded authored gait, cup-specific pickup, no generalized M4 physics, no M5 Director and no M6 acting polish. The Character Motion page is operational but distinct from the M2 storyboard editor. Technical gate: **PASSED**. Human visual/product gate: **NOT_REVIEWED**. Do not begin M4 without explicit owner approval.
