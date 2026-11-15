# M1 Animation IR — architecture and verification

## Compatibility contract

M1 adds a strict `animation-ir/1` schema with a 1920×1080 Y-down stage, 24fps
integer half-open shot intervals, character/rig capabilities, shot actions,
camera, narration, color and hash-bound voice references.

The application `compile()` path converts an existing validated Studio v1.0
project to IR, validates it and converts it back through a fail-closed
compatibility adapter before passing data to the **unchanged** procedural
SVG/GSAP renderer. Previous project revisions and export packages stay v1.0.

This is a genuine application compiler boundary, not yet a general character
engine. The legacy actor is explicitly `studio-primary`, rig
`studio-procedural-v0.1`. Other rigs are rejected rather than silently replaced.

The production workbench adapter accepts a structural subset of the IR contract,
maps shot-local frame intervals and converts legacy 640-wide pan offsets to
the canonical 1920-stage pixel convention. It deliberately returns no invented
sprites or physics contacts. The actual Three/Blender art rig is not generalized
by this adapter.

## Verified scope required

- Lossless v1.0 legacy→IR→legacy round trip.
- Strict negative tests for unknown fields, invalid intervals, missing actor
  capability, wrong rig, stale voice binding and out-of-range frame.
- Existing application tests, integration render, web UI, recovery suite
  and production workbench tests.
- A/B real HyperFrames MP4s from the *same* smoke script/voice: one with
  legacy compilation, one with IR compilation; both must pass full decode/QC,
  identical decoded frame hashes and identical decoded PCM audio.
- Contact sheet and SHA-bound manifest in GitHub Actions artifact.

## State and ownership

M0 is ACCEPTED by owner as baseline (15 November 2026).
M1 is IN_PROGRESS until all tests and render evidence pass; user acceptance
requires viewing actual A/B video. Do not infer natural animation quality from
pixel parity; M2 will test a *new* 20–30 second editable product.

Code references: `src/animation-ir.ts`,
`production/src/scene/animation-ir-adapter.ts`,
`scripts/render-ir-ab.ts`, `tests/animation-ir.test.ts`,
`production/tests/animation-ir.test.ts`.
