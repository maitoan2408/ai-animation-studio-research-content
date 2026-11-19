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

## R8 lowered-elbow experiment and no-false-PASS rule

R7 same-HEAD native 4-film render `d4dd495b83ce91df546f33908d3d53e8e280156f` passed its technical audit but **did not visibly resolve** the hand/thigh overlap; not accepted. R8 tests a G3-only alternative analytical elbow branch with native forearm foreshortening, preserving the archived outward mode, every held-world grip, sole, scene art and Rapier state. The alternative is an *art-quality candidate* until full native 1×/0.5× playback and close-up comparison; no CI outcome can close that gate. If it creates an implausible bend, visible sleeve length change or popping, revert the candidate, retain evidence and redesign instead of lowering acceptance standards.

## R8 rejection and safe code rollback — 2026-11-19

The owner reported R8 visibly **WORSE** than the preceding baseline. Independent native film contact crops support this: a forced opposite-side low elbow branch created unnatural, severely hinged limb pose after release; R7 only changed rest candidate ranking and failed to improve body/thigh separation. Prior claims of artistic progress were too optimistic. **Neither R7 nor R8 is accepted.** Non-negotiable rule: a lower elbow in one still or green G3 contact QA is never evidence of animation improvement.

Immediately roll back the six runtime/QA/test files touched in R7–R8 to their **exact known-working d898b426 blob SHA** and remove experimental `production/src/scene/g3-rest-pose.ts` (no baseline art/goldens changed). Preserve this reusable workflow document for the next design cycle. Follow-up: begin with alpha-accurate silhouette/provenance tests and explicit motion/dof requirements, use test-first negative fixtures and multiple source-native character/prop combinations; develop a staged alternative *without* flipping analytic IK bend branches globally, and require dual actual side-by-side full-film art PASS at 1×/0.5× before accepting visual changes. No forward progress to G4 until the owner approves.

**This rollback restores the pre-R7 image-generating implementation, NOT an artistically accepted G3.** Prior d898 movie remains historical evidence; a new source SHA requires new CI and native media artifact for current-source technical claims.
