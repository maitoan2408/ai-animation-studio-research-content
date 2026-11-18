# M6 generalization — production-system implementation plan (2026-11-17)

**Owner objective:** Create a code-driven animation studio whose process and output quality are reusable beyond the original cup film. This is an extension to the M1–M6 technical scope, **not** artistic acceptance of M6 or authorization for M7. Work is isolated on Draft PR #19 against the existing unmerged M6 branch. Keep M0–M5 locked reports and failing historical evidence immutable.

## Source-grounded diagnosis

M3 currently supports only the `production-cutout-1` family with the models `mai` and `an`. Its four clip types are walk-stop, turn-head, wave, pick-place. Before generalization, the pick handler was restricted to a right-hand cup and used a hard-coded right-of-body margin. M6 only modifies the same clip actions. M4 Rapier is deliberately a single released cup/platform profile. The root M5 Director still uses the separate M2 Studio renderer rather than a unified native M3/M4 executor. The previous M6 green checks therefore did **not** establish quality of arbitrary videos.

## Implementation ordered by dependency

**G1 — Authoring contract and reusable contact planner.** Add a data-only side-aware planner with left/right hand, asset SHA, real named grip anchor, shoulder/wrist IK, handedness-aware mirroring and layering. Preserve the old M3 schema and right-hand cup inputs. Allow other registered `prop` assets with a valid grip anchor. Fail closed on across-body staging, reach, missing or tampered art. Limit M4 to its proven physics recipe.

**G2 — Unified technical visual preflight on every supported native project.** Evaluate all frames from the actual project in both M3 and M6 modes, reject missing/duplicate/nonfinite sprites, foot drift, wrong hand/handle occlusion and misaligned actual SVG anchors. Emit frame-specific motion-spike warnings for review. Save data-bound `native-visual-gate.json` before any MP4 export; never call this an artistic grade.

**G3 — Cross-scenario product proof.** Render `mai` picking cup with LEFT hand, `an` picking lantern with RIGHT hand, and `mai` acting with no prop. Each has a new editable project, independent M3 baseline and enhanced M6 film at 1920×1080 / 24fps. An independent process validates SHA, frame count, same input and art, actual PNG frames, full FFmpeg decode, contact statistics and 3×2 real-film review board. No substituted benchmark shots.

**G4 — Regression and compatibility.** Run root M0–M2, native M1/M3 workbench and Python, M4 physics, M5 Director, existing M6 full A/B, plus G1–G3 tests on the exact *final executable SHA*. Preserve old M3 editor/import/export and M4 bakes. New unsupported physics, rig and storyboard transitions must reject rather than secretly fallback.

**G5 — Independent visual review and acceptance.** Inspect actual stills/motion from each video, especially prop hand-overlap and head jerk, not only marker differences. Preserve QA FAIL logs. If any reproducible defect, fix in originating module, rerender all affected clips and repeat full tests. Deliver real movies, visual board, editable projects and a concise report directly to the owner; owner, not CI, marks `ACCEPTED`. Remain Draft, do not merge or start M7.

## Quality standard and honest limits

PASS requires (a) schema and SHA-locked art, (b) deterministic random-access frames, (c) no planted-foot or held grip displacement, (d) correct sprite paint order and actual SVG handle anchors, (e) no invalid/blank media, (f) proper audio profile for voiced films, (g) all 6 independently decoded new movies, (h) visual review of different characters/hands/props plus no-prop case, (i) root/production/M4/M5/M6 regression at final implementation SHA. All warnings and untested artistic criteria are explicit.

This phase **does not promise** automatic animation of arbitrary user-uploaded art, unrestricted gestures, generic multi-character blocking, general-purpose cloth/hair, audio lip-sync, licensed production voices, or a Director-to-native-M3/M4 compiler. Those require separate architecture and artifact evidence. In particular M4 remains cup/right-hand physics, and root M5 Director remains M2-backed. The long-term extension would be a validated Director native-shot adapter, richer action library, retargetable character archetypes and human visual scoring; do not describe these as completed.
