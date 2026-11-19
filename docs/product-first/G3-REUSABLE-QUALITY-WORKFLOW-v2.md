# G3 — Reusable artistic quality workflow (active, 2026-11-19)

**Scope:** G1/G2 contracts + G3 planted interaction and recovery only. Source: PR #22, branch `codex/m6-unified-integration-20261118`. This augments, never replaces, [G3 quality redesign v1](G3-VISUAL-QUALITY-REDESIGN-v1.md). Keep M1–M5 pinned art and goldens unchanged. No paid APIs, merge, G4/G5/G6 advancement or unilateral artistic acceptance.

## Reproducible execution gates (must follow in order)

1. **Evidence/reference gate.** Record exact HEAD, fixture IDs, asset manifests and native A/B source hashes. Review actual source-paired 128f output: anticipation (0–47), held/grip (48–63), release (64–85), physical landing/recovery (86–127). Capture 1× / 0.5× playback judgment and close crops at 48/63/64/65/79/95/127. Historical green runs are not final-HEAD proof.
2. **Root-cause gate.** Separate image-semantic problems from physically wrong contacts. Tag failure as joint silhouette/garment overlap, finger-ownership transition, rest clearances, anchored foot/hip balance or physics support. Describe why previous metadata-only checks missed it; do not paint an unverified opaque disk or suppress defects.
3. **Reusable corrective gate.** Apply opt-in actor-independent algorithms driven by manifest pivots/anchors, camera, target positions, IK and actual sprite art. Validate both hands, both facings, models, zoom/scales, prop support height and random seek. No production branches based on actor names, cup/lantern IDs or screenshot frame numbers.
4. **Adversarial pre-render gate.** Inject bad elbow branch, invalid anchor/art, crowding palm, stale or spoofed source, release boundaries, contact drift, z-order pop, silhouette discontinuity, nonfinite values and inaccessible reach. Reject defects (fail closed) before any expensive media render. Preserve existing G1–G3 + M1–M6 tests.
5. **Native product gate.** Four *actual* 1920×1080/24fps MP4s: An/right/cup + Mai/left/lantern, each archived baseline vs enhanced, same editable playback/asset/camera/Rapier inputs. SHA link media, source, performance plan, output manifest and stills. Independent after-render audit must fully decode MP4, check per-frame native art/contact/foot/release/landing, source matches and no black/freeze defects. Separate 1×/0.5× art review of **both** complete films from automated QC.
6. **Regression / decision gate.** After the final source patch, rerun only necessary targeted tests and *once* run the full inherited G1–G3 and M0–M6 regression on that identical HEAD. A visual defect keeps `ART_REWORK_REQUIRED` even when all workflows succeed. Owner determines final artistic acceptance; stop before G4.

## Current unresolved visual gates

- **P0:** Outstretched/hinged shoulder–elbow–forearm silhouette during held pose, cutout seams; 0.56–1 foreshortening is geometry preservation, not a proof of natural garment continuity.
- **P0:** Grip-to-open silhouette transition at handoff is an immediate asset switch, not anatomical finger articulation.
- **P0:** Recovery/rest can crowd hand onto thigh because the previous candidate search used only hand–thigh AABB and cleared the landed prop by moving inward. The new deterministic rest score considers hand, forearm, torso, both thighs and native arm span; its AABBs remain a heuristic pending native-alpha/pixel and timed film review.
- **P1:** Subtle torso/head movement without clearly readable hip/knee weight transfer. Frozen planted feet are correct only inside G3's supported stationary interaction.

## G3 acceptance receipt (fill from exact final HEAD)

| Criterion | Evidence required | Status |
| --- | --- | --- |
| Contact/physics/soles + G1/G2 | same-HEAD source, adversarial tests, independent Rapier bake | OPEN until final run |
| Arm/hand rest silhouette and joint seams | native full-res crops, A/B timeline, alpha and occlusion review | REWORK |
| Finger release, ownership and visual grip | 60–85 dense stills + entire 1×/0.5× movie | REWORK |
| Body/leg planted balance | visible native sequence + continuity test | REWORK |
| Non-hardcoded reuse | both models/hand/facing/scales, non-default release and props | OPEN |
| Full same-HEAD regression | logs, media SHA, manifests and complete decoder | OPEN |
| User artistic acceptance | user review of final paired native films | NOT_ACCEPTED |

Technical green only proves technical green, never aesthetic acceptance.
