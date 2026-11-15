# Product First + Skill-Based Animation — Implementation plan

Approved by project owner on 2026-11-15. This plan supersedes V2 for **new implementation priority**; older plans, evidence and code remain as historical references.

## Objective

Deliver an editable, end-to-end paper-cut 2.5D video production workflow **before** generalizing specialist animation skills and adding Director Agent orchestration. Code-based rendering remains authoritative; AI assistance is optional and bounded by supported, validated tools.

## Branch and safety

- Base branch: `codex/v2-continuous` at `61d2de8834cc9e48d3c4c25c329f050e415e6d59`.
- Development branch: `codex/product-first-skill-architecture`.
- Never force-push, merge legacy PRs automatically, delete history, replace pinned assets, or silently revise quality thresholds.
- Preserve the root application (`src/`) and production workbench (`production/`) until real adapters and compatibility tests pass.
- All media evidence must identify its producing commit, hash and test profile.

## Delivery gates

Each milestone is independently reviewable. **Do not report completion to the owner until the complete milestone passes its stated tests and produces actual reviewable image or video evidence.** A commit, draft documentation or green unit tests alone do not satisfy this requirement. Use `READY_FOR_USER_REVIEW` only with genuine media and links. `ACCEPTED` requires owner's assessment; agent reviews must be marked provisional. For blockers, record `BLOCKED` with evidence; never label as done.

| Gate | Deliverable | Required media | Acceptance |
| --- | --- | --- | --- |
| M0 — Baseline | New branch, baseline reproducibility, evidence CI | Freshly rendered 13s 1080p MP4, preview MP4, UI screenshots and contact sheets | Fresh CI running on implementation HEAD; ffprobe full-frame count, full decode, audio, SHA manifest; no original-code regressions |
| M1 — Integration IR | Versioned data-only animation/shot/character/prop/timeline contract; adapters for application and workbench | Identical-scene baseline and IR-adapted visual comparison and contacts | Schema/negative tests; invariant timebase/camera and asset anchors; old project v1.0 still works; new path renders real video |
| M2 — Studio v0.2 | End-to-end user project: script, storyboard edit, supported action/scene, voice, MP4, save/reopen | **New** 20–30s 1080p/24fps with >=3 shots + live Studio screenshot and revised-scene video | Never hardcode shot-specific code; at least one edited revision survives import/export; frames, audio, decode, QC and reproducibility verified |
| M3 — Character/Motion | Registry and reusable character package, capabilities, actions, transitions/contact | Showcase video with walk-stop, head turn, wave and pick/place; before/after and contact sheets | New character ID and compatible rig tested; no foot sliding at locked intervals; unsupported action rejects explicitly |
| M4 — Physics | Generalized existing Rapier/bake adapters, hand/prop contacts, authored-motion ownership | Physics OFF/ON comparison, prop interaction video, contact evidence | Fixed-step bake with recipe hash; deterministic replay; no unexplained penetration; not restricted to S05 |
| M5 — Director | Bounded agent producing validated task graph and calling skill executors | Two fresh script videos and task-graph screenshots; failure demonstration | Capability-aware planning, fail-closed unsupported actions, retries, provenance and human edits respected |
| M6 — Quality | Art/character/acting/secondary motion/audio/critic improvements | Paired A/B videos on same shot and camera, matched visual contacts | No regression to M2 production pipeline; review of visual/acting quality remains human |
| M7 — Pilot | 72s The Last Lantern, editable source, two recorded revision rounds | Full 72s film and A/B revisions | Technical QC plus owner review; benchmark footage cannot substitute for real pilot |

## Integration and version contract (M1 design target)

`AnimationIR.v1`: fps/frame duration and absolute/shot-local half-open intervals; scene IDs and camera/world transform; character package by version/hash; rig/control names and contact anchors; prop ownership and collision metadata; referenced art/audio; authored action clips and physics bake receipts. Renderer consumes validated data rather than untrusted generated code. App v1.0 and workbench coordinate systems must be converted explicitly (640x360 SVG versus 1920x1080 stage; Y-down stage versus physics Y-up).

## Skills (M3–M5)

Each skill defines ID/version, input and output schemas, supported capabilities, executor, validation/failure codes, immutable evidence and tests. `SKILL.md` is operational guidance, not an execution engine. Reuse existing `skills/` for application-level workflow; develop specialized character/motion/physics/audio/scene/render tools as real executors arrive. One Director Agent orchestrates validated tools; specialized agents are deferred until demonstrated value.

## Implementation sequencing

1. M0: CI media gate, stable baseline manifest, review artifact links.
2. M1: Typed IR and compatibility adapters with a real rendered A/B scene.
3. M2: Complete a constrained but genuinely reusable editor-to-video path on a **new** script.
4. M3/M4: Reusable animation tools backed by verified existing motion and physics code.
5. M5: Director orchestration; M6: progressive quality; M7: full pilot.

Maintain `docs/product-first/STATE.json` and milestones with separate fields for technical status, evidence status, and user acceptance. No phase may advance solely because a document or CI config exists.

## Review artifact retention

CI bundles are temporary (currently 14 days). Keep small manifests in source and send stable commit/run artifact links only after verifying existence; arrange longer-term storage before making a deliverable depend on an expiring URL. Do not commit repeated huge video archives to Git.

## Security and reproducibility

No arbitrary AI-generated JavaScript at runtime, no private API keys in content/logs, no unlicensed model/media imports, no browser-sandbox bypass beyond existing trusted CI policy, no auto-approval of acting/art; external paid providers require owner approval. Preserve failed attempts and do not alter tests to camouflage failures.
