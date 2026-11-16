# M4 — Physics System implementation and acceptance plan

**Authorized:** owner approved M3 on 2026-11-16; initial base `79aae2fdfe960e03992e136a6529fe95623a1cdb`, branch `codex/product-first-m4-physics`, Draft PR #13. Owner review gate remains **NOT_REVIEWED**. No merge, M5 or changes to historic golden media.

## Baseline and architecture analysis

- M3 production character registry/evaluator: `production/src/motion/character-library.ts`, 1920×1080 stage/Y-down with actor rig and cup grip markers. The root Studio exposes M3 via a separate `/motion` workspace and native workbench renderer; root M2 projects remain unchanged.
- Existing U3 physics in `engines.ts`, `hero.ts`, `bake.ts`, `recipe.ts` is a tested Rapier/Planck comparison and S05-specific 192-frame hero contract. **Do not alter its locked bake/hash/simulation.**
- Existing Three/Chromium `browser.ts` samples pure frame data. M4 takes the same path, routing through a type-safe, data-only native physics adapter with no simulation at render/seek time.
- M4 scope is a **bounded reusable** one-rigid-prop, one-platform contract for validated M3 cutout projects (not an arbitrary-body, cloth or human physics solver). Two distinct art/motion/physics configurations are covered in executable tests; neither is S05. Contact/release events follow evaluated M3 grip, not guessed timestamps.

## Data flow and module responsibilities

`M3 authored project → validated M4 physics project → Rapier fixed 240Hz bake → input/art/recipe/source-bound receipt → validated immutable replay → M3/native Three renderer → real 1080p MP4`.

- `production/src/physics/m4.ts`: strict project/prop/asset validation, live grip→release derivation, body/collider platform simulation, fixed 10 substeps per 24fps frame, SHA-256 provenance, replay and refusal of stale input/art/toolchain.
- `production/src/physics/m4-adapter.ts`: sampled M3 rig/camera/authoring stays untouched; ownership of the cup switches exclusively at actual release. Physics transform updates the sprite and its measured grip marker; renderer never advances simulation.
- `production/src/render/browser.ts`, `server.ts`: trusted validated M4 render configuration delivered to existing Three/Chromium. M3 and IR routes maintain compatibility.
- `production/src/render/render-m4.ts`: same editable source and timeline generate separate OFF/ON native films, real frame stills, contact sheets, A/B pair, random/reverse seek and media/hash manifest.
- `production/src/qa/audit-m4.ts`: **separate, post-result** second-pass assessment, independent video decode, SHA checks and measured grip/handoff/collision envelopes. Reports delegated-agent technical review, not human aesthetic approval.
- `production/tests/m4-physics.test.ts`: two differently parametrized genuine physics cases, deterministic replay, negative/stale/mismatched revision inputs, contact ownership and boundary assertions.

## Scope and contract

- Supported asset: versioned art `props/cup` with matching SHA; M3 character `production-cutout-1`; exactly one bounded `pick-place` grip/release and platform geometry; user-editable mass, gravity, damping, restitution, initial velocity, angular velocity, platform height and collision half extents.
- Parameter validation is fail-closed; objects or rig types outside this bounded implementation reject clearly. No S05 scene ID or hardcoded frame number; release is discovered in contact data.
- Units explicitly converted: stage pixels/Y-down/CW degrees ↔ Rapier metres/Y-up/CCW radians at declared 200px/m. The collider is an art-directed box proxy, not the rendered silhouette. Declared Rapier collision skin 2mm; any reported penetration must be measured against actual collider envelope. No silent tolerance changes.
- Receipt includes input/art/recipe/bake SHA-256, locked package and implementation hashes, engine/algorithm versions and fixed step settings. Timeline-relative random samples `last→20→release→0→last` read successfully validated, frozen persisted frames, including the 105-frame minimum.
- `M4_PROJECT_FILE` and `M4_OUTPUT_DIR` support custom M3-derived sources, while production's integrated native server consumes validated bake data.

## Acceptance / QA matrix

| Gate | Evidence source | Required |
|---|---|---|
| Generalized non-S05 rigid prop with 2 configs | M4 physics tests | PASS |
| Fixed-step Rapier, recipe/source/art hash and stale refusal | unit/negative tests + bake artifact | PASS |
| Authored grip → release → physics ownership; no seam teleport | transform & contact measurement | PASS |
| Contact against platform; reported collision envelope and no unexplained penetration | real solver contact event & independent metrics | PASS |
| Deterministic repeated bake & random-access replay | tests and native PNG/state hashes | PASS |
| M3/renderer integration with same scene OFF/ON | native Three/Chromium side-by-side 1080p24 films | PASS |
| Full video decode, frame count, hashes, contact sheets, editable input | FFprobe, FFmpeg, native stills, manifest | PASS |
| Separate post-result audit after both videos | `m4-post-result-audit.json` | PASS |
| Full M0–M3 regression on **final HEAD** | root Studio + production CI plus M4 CI | PASS |
| Owner-only acceptance | explicit user decision | NOT_REVIEWED until owner responds |

## Risks, limits and recovery

- Contact and collision proxy ≠ visual silhouette; inspect actual video and disclose artistic approximation. No automatic subjective realism claim.
- Rigid-prop ownership is bounded to the M3 pick-place interaction; more arbitrary Animation IR, custom assets, multiple rigid bodies, broadphase prop–prop collisions, cloth, hair, 3D and Director are outside M4.
- Native frames and MP4s are large; CI uploads artifacts with 14-day retention. Keep hashes and small docs in Git; do not store copies of media in ordinary commits.
- If any metric/test or post-result audit fails: **DETECT → REPRODUCE → RECORD FAILURE → FIX ROOT CAUSE → ADD TEST → REBUILD → RERENDER → REAUDIT**. Full regression after final fix. Never mark milestone ACCEPTED on behalf of owner.
- Only report `READY_FOR_USER_REVIEW` after every in-scope gate and final CI media pass; otherwise record `REWORK_REQUIRED` or `BLOCKED` with proof.
