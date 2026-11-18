# M6 Generalization & Visual Quality Gate — phase G1

## Purpose
Turn a single-fixture M3/M6 pass into a reusable, data-driven production quality process. This document is a **plan and implementation ledger**, not owner acceptance.

## Root findings (audited at 901bb7a1)
- M3 supports only `walk-stop`, `turn-head`, `wave`, `pick-place`; cup/right-hand/right-facing are bounded.
- M4 inherits M3 and supports bounded cup/platform Rapier handoff, not arbitrary props.
- M5 Director currently renders through root M2 rather than production M3/M4/M6.
- M6 critic checks actual geometry/contacts but explicitly disclaims aesthetic certification.

## Milestones / stop gates
1. **G1: reusable QA primitive (5/5 same-SHA CI SUCCESS, 916aaba4)**: arbitrary scene sprites, asset IDs, hand/prop anchor relations, optional rear/foreground layers, finite geometry, temporal jumps and camera continuity. Negative tests must prove failures; no hard-coded `mai`, `an`, `cup` or `right`.
2. **G2: reusable interaction authoring (5/5 same-source CI SUCCESS, 8bc014bd)**: versioned character capabilities, left/right or chosen effector, anchor-driven prop/hand contacts, auto-calculated reach and occlusion by rig configuration, failure for unsupported shapes. No fake generalized support.
3. **G3: reusable motion/physics (G3 native grip→Rapier release source complete; two real 1080p films + independent QA PENDING)**: action library with explicit preconditions, arbitrary duration with validated retiming, scene-space IK with collision and foot constraints, independent immutable physics bake.
4. **G4: Director integration (pending)**: root M5 must choose and invoke the production M3–M6 pipeline; a saved storyboard revision must reproduce the same output.
5. **G5: multi-film adversarial QA (pending)**: at least 6 genuinely different scripts (two characters, two hands, different prop shapes, different action chains, different camera staging); real native MP4 with full decode/hash/AV check, key-frame contact sheets and manual aesthetic review.
6. **G6: owner gate (pending)**: owner reviews all example films; no merge, no M7 until approval.

## QA semantics
G1 detects **mechanically verifiable** violations. `PASS` is not an aesthetic claim. The director must eventually provide contact/occlusion declarations for every intentional interaction; without declarations, G1 cannot know a grasp was intended. Temporal thresholds are authored per-shot, not universal quality scores. G1 is not a generic automatic animator.

## Acceptance
No claim of general video production until G2–G6 are independently validated on diverse actual outputs. Keep original M1–M6 locked artifacts, source SHAs and acceptance histories intact.

## G3 physical handoff acceptance addendum

- The supported G3 film comprises validated JSON keyframes for planted-foot actor(s), left/right anchored prop grips, camera keys, plus explicit per-actor release frames.
- Rapier produces an independent deterministic, SHA-verified, immutable box/ball bake (240 Hz with 24fps snapshots); no live simulation during seek or renderer playback.
- `general-playback.ts` transfers the prop from contact-owned placement to the solver at release without visible coordinate teleport; the visual QA replay identified a frozen waving hand after release, so the actor now eases the released wrist toward a neutral pose over validated `settleFrames` (8–48) while opening the hand and relaxing the head without foot motion. Other actors remain independently animated.
- `general-playback-validate.ts` independently verifies project SHA, last held center, release timelines, and binds physical platform geometry to visible workbench art and collider height to the prop's own support anchor. Forged bakes, hidden surfaces or visually sunken props must fail.
- `demo-g3.ts` generates **two distinct real 1080p24 MP4s**, An/right/cup and Mai/left/lantern, including physical landing on the visible workbench. `audit-g3.ts` checks all files independently, full FFmpeg decode, frame counts, still hashes, source SHA, physics evidence and contact continuity.
- G3 cannot pass by unit tests alone. The new G3 native-film GitHub job and every legacy M0–M6 regression must pass on a single source SHA before G4 begins.
- Do not claim arbitrary walking, all possible body gestures, cloth/hair, natural emotional acting or approved final art. These require later milestones and owner viewing.

## Integration candidate (2026-11-18)

Merge base `901bb7a1`; parents PR18 `b6521f6c` and PR19 `f0e9c676`. Preserve both distinct hand-placement contracts and their tests. PR19 historical plan is archived as `M6-GENERALIZATION-PR19-PLAN.md`; this ledger and the owner's G1–G6 prompt govern current gates. G3 artifacts on PR18 downloaded and independently SHA-verified, full-decoded and inspected as two 128-frame silent films, but are NOT evidence for this new source. The integration must rerender all affected native films and pass all legacy and new workflows before G4. G4–G6 remain pending. No owner acceptance or M7.
