# M4 — Physics System: Final Review

**Reviewed 2026-11-16.** Technical result: **PASS / READY_FOR_USER_REVIEW**. Owner decision: **NOT_REVIEWED**. Implementation commit: `b44fb8d2f689a756837c291341f3786e9f889a49`. GitHub branch: `codex/product-first-m4-physics` and [Draft PR #13](https://github.com/maitoan2408/ai-animation-studio-research-content/pull/13). Do not merge or begin M5 before owner approval.

## 1. What was implemented

A bounded, reusable M3-to-Rapier physics adapter for the existing cutout-character / cup interaction (not the old S05-specific script). Validated `PhysicsProject` and `PhysicsRecipe` control the mass, box collider, gravity, damping, restitution, friction, floor and velocities through data. Fixed 240Hz Rapier integration, ten substeps per 24fps output frame, produces an immutable, SHA-bound bake; replay reads any frame without live physics. The M3 contact system owns the object until first release; Rapier takes over from the same starting pose; camera and all authored character sprites remain untouched. A versioned physics skill describes the real executor and explicitly rejects unsupported asset/rig/interaction classes.

## 2. Final evidence, source and genuine native media

- **M4 native verification + independent post-result audit:** [SUCCESS run 43863511981](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43863511981), produced from implementation SHA `b44fb8d2f689a756837c291341f3786e9f889a49`.
- **Production full regression:** [SUCCESS run 43863512036](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43863512036), including production TypeScript/Python, existing physics/golden, M1/M3 real media and Studio recovery.
- **Root Studio full regression:** [SUCCESS run 43863512279](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43863512279), including real integration/UI/recovery/M1 and 24s M2 product render.
- **[Download actual M4 review artifact (ID 14224468519)](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43863511981/artifacts/14224468519)**; expires **2026-11-30**. It includes editable `m4-project.json`, validated `m4-bake.json`, `manifest.json`, `m4-post-result-audit.json`, 18 genuine 1080p stills, two chronological contact sheets, OFF/ON decoded-film comparison, and both original MP4s.

| Deliverable | Actual evidence |
|---|---|
| Physics OFF | `m4-physics-off-1080p.mp4` — 169 frames, 1920×1080, 24fps, H264, intentionally silent; SHA-256 `a70d4f6cf9817d715f07f48f768a03e532ed3ce3b8d627f8beb0dd876502c388` |
| Physics ON | `m4-physics-on-1080p.mp4` — same source, framing, character, camera and authored timeline; SHA-256 `1c8c6c6ad926c436a20fd9d6121a5ea986375bf741842b3aa64c090101de22e6` |
| Compare | `m4-physics-off-on-comparison.png` decoded from genuine MP4 frame; SHA-256 `8405b366c535d30a8655cfdc17488b9891cd196767b55588a8a503c0bd92ee5d` |
| Editable source | `m4-project.json` source SHA `41bc3d9dcd2df1e06c78f0c1fcf8521b37f8a408fb2ef44e7fd86b67e0662e78` |
| Physics bake | Immutable-replay `m4-bake.json` receipt `e07d5c09cb878c986651822338eb9ebb3da0322583894ad8c62b29f6e762c603` |

## 3. Acceptance evidence matrix

| Gate | Observed result |
|---|---|
| Schema, negative input, version, supported scope | **PASS** — explicit failures for unknown engine, changed timebase, negative collider, invalid mass, NaN, duplicate prop/actor ID, unsupported schema/action, stale art/input/recipe/bake, unauthorized ownership and corrupted events. Recovery after rejected input tested. |
| Non-S05 reuse / >=2 configurations | **PASS within documented bounded scope** — distinct `tip` and `slide` interactions use different prop position, mass, restitution, friction, velocities and spin, both baked by the same real Rapier engine. |
| Fixed 240Hz + validated recipe/provenance | **PASS** — 10× substep at 24fps; SHA ties exact input, art, toolchain and source implementation to bake. |
| Deterministic bake + random-access seek | **PASS** — repeated bake equality; immutable `150 → 20 → 100 → 0 → 150` gives identical repeat frame; browser frame PNG/state hash checks. |
| Authored vs physics ownership and hand contact | **PASS** — grip onset **frame 18**, release **frame 62**, real Rapier platform contact **frame 64**; 44 held grip samples, max 0px error; 0px release/handoff position jump. |
| Collision, penetration, nonfinite transforms | **PASS for delivered source/collider envelope** — observed real solver contact; max measured rigid-box floor penetration **0m**, within declared 2mm Rapier skin. |
| Native M3/Three renderer integration | **PASS** — both 169-frame 1080p24 H264 films come from actual Chromium/Three frame capture of source + immutable replay. |
| Video integrity and artwork inspection | **PASS** — 25 independently downloaded artifact SHA checks, both MP4s FFprobe 169 frames/24fps/1920×1080, complete FFmpeg video decode, no black scenes. Sampled actual contact sheet and full-size before/at/after-release frames show a visible scene, character and cup, no blank/corrupt/teleport frames, and source-consistent OFF vs ON prop movement. |
| End-of-milestone independent second pass | **PASS** — separate `audit-m4.ts`, actual downloaded artifact independently rechecked; reviewer labeled delegated-agent, **not** independent human art approval. |
| Full M0–M3 regression on executable source | **PASS** — all three above CI workflows SUCCESS at `b44fb8d2f689a756837c291341f3786e9f889a49`. |
| Owner artistic review | **PENDING** — only project owner may change `userAcceptance` to `ACCEPTED`. |

## 4. Defects found and resolved

**M4-CONTACT-001:** Initial M4 emitter incorrectly timestamped the `grip` event as `releaseFrame − 1` (the last held frame), not actual contact onset. Changed the contact-window evaluator to derive and validate the first grip frame and the true release transition. Added tests that assert the transition and reject shifted/fabricated grip events, plus an independent audit comparison against sampled M3 contact. Fixed in commit `022d6b5b32d8158f4d5ecdb0a752a40796404678`.

**M4-NEGATIVE-COVERAGE:** Added explicit wrong-engine, wrong-timestep, invalid-collider, duplicate-ID, unsupported-schema and after-failure recovery tests in `b44fb8d2f689a756837c291341f3786e9f889a49`. Historical failing CI runs remain on GitHub; no thresholds, golden art, locked S05 simulations, or legacy media were changed to make gates pass.

## 5. Visual/technical limitations (not misrepresented as general physics)

- Physics is currently **single validated M3 cup, existing compatible cutout rig, one flat level rectangular platform**, not arbitrary prop geometry, multi-object collisions, cloth/hair or 3D character dynamics. Two distinct parameterized interactions are validated; broad all-scene physics is **not** claimed.
- The box collider and declared 2mm contact skin approximate the artwork; literal silhouette collision/photorealism is **not** claimed. The demonstrated scene displays a simple sliding/tipping cup; richer acting, camera language and artistic polish remain outside M4.
- Video is **intentionally silent**; no foley/audio acceptance implied. No independent human artist or owner evaluation is asserted.
- The technical evidence is tied to exact committed source/assets and verified Linux runner; universal cross-platform bitwise determinism is not asserted.

## 6. Handoff gate

**TECHNICAL_PASS; READY_FOR_USER_REVIEW; userAcceptance=NOT_REVIEWED.** Review both MP4s, actual contact-sheet and OFF/ON difference plus editable project. This is a new stage-specific acceptance decision and **does not automatically authorize PR merge or M5**. Documentation-only checkpoint commits following executable source do not change the verified renderer, but should receive final-head CI verification before the owner-facing handoff.
