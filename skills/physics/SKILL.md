---
name: physics
version: 1
---
# M4 Physics skill — real executor, bounded support

Capability: `m4-rigid-prop-platform-v1`. This skill invokes actual TypeScript module `production/src/physics/m4.ts`, not a prose-only stand-in.

Input: `PhysicsProject` (schema `physics-m4/1`): validated M3 `character-motion/1` with one `pick-place` prop grip/release, named SHA-locked cup, fixed 200 stage px/m, gravity, mass, rectangular collider, damping, platform support, initial velocity, spin, tail frame count.

Output: `PhysicsBake` (schema `m4-bake/1`): validated immutable 24fps stage transform array, Rapier 240Hz recipe, 10 substeps/frame, SHA-256 input/art/recipe/bake bindings, locked toolchain/implementation SHA, authored grip/release and solver platform contact events.

Executor: `bakeM4(raw, artPack)` then `validateM4Bake(receipt, project, pack)`; `sampleM4Bake(receipt, frame)` for random seek; `sampleM4Scene({project,bake,enabled}, frame, pack)` renders using M3 actor/camera + prop override under explicit ownership. For native film evidence: `npm --prefix production run physics:m4` and `npm --prefix production run physics:m4:audit`.

Failure semantics: `M4_PROJECT_SCHEMA`, `M4_PROP_CONTACT_UNSUPPORTED`, `M4_PHYSICS_PARAMETERS`, `M4_GRIP_RELEASE_REQUIRED`, `M4_PLATFORM_INITIAL_PENETRATION`, `M4_BAKE_INPUT_OR_ART_STALE`, `M4_BAKE_RECIPE_OR_IMPLEMENTATION_STALE`, `M4_BAKE_SHA_MISMATCH`, `M4_FRAME_OUT_OF_RANGE`, `M4_REPLAY_OWNERSHIP`. Never accept stale cache, execute model-generated JS, fake collider contact or change motion golden.

Not supported: arbitrary 3D, cloth/hair, multiple props/colliders, custom rig authoring, general shot-independent actor dynamics, unexplained prop-vs-art silhouette intersections. Future Director agents must refuse unsupported input instead of retrying with an unbound receipt.
