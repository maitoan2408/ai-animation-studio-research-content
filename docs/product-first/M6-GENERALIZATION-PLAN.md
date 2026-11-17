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
2. **G2: reusable interaction authoring (implementation in validation, no final PASS yet)**: versioned character capabilities, left/right or chosen effector, anchor-driven prop/hand contacts, auto-calculated reach and occlusion by rig configuration, failure for unsupported shapes. No fake generalized support.
3. **G3: reusable motion/physics (pending)**: action library with explicit preconditions, arbitrary duration with validated retiming, scene-space IK with collision and foot constraints, independent immutable physics bake.
4. **G4: Director integration (pending)**: root M5 must choose and invoke the production M3–M6 pipeline; a saved storyboard revision must reproduce the same output.
5. **G5: multi-film adversarial QA (pending)**: at least 6 genuinely different scripts (two characters, two hands, different prop shapes, different action chains, different camera staging); real native MP4 with full decode/hash/AV check, key-frame contact sheets and manual aesthetic review.
6. **G6: owner gate (pending)**: owner reviews all example films; no merge, no M7 until approval.

## QA semantics
G1 detects **mechanically verifiable** violations. `PASS` is not an aesthetic claim. The director must eventually provide contact/occlusion declarations for every intentional interaction; without declarations, G1 cannot know a grasp was intended. Temporal thresholds are authored per-shot, not universal quality scores. G1 is not a generic automatic animator.

## Acceptance
No claim of general video production until G2–G6 are independently validated on diverse actual outputs. Keep original M1–M6 locked artifacts, source SHAs and acceptance histories intact.
