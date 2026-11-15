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

## Verified production IR scope and independent quality audit

- Real 2-shot production scene has two authored cutout actors, one lantern prop with
  verified source SHA and grip anchor, full background layers, bounded camera,
  per-frame marker/rig evaluation and stage coordinate center (960, 540).
- Three/Chromium, not the legacy SVG canvas, renders every IR frame via actual
  image textures and puppet rig. The benchmark evaluator is not the IR renderer.
- Automated media gate: 72-frame 640x360 silent demo (24fps), four native
  1920x1080 still frames from the same pure IR evaluator, contact sheet and
  SHA-256 manifest. Full MP4 decode, random reverse seek image-state parity and
  preview/final *scene-state* parity are required.
- Both root/production full regression suites must remain green on final
  source. The production workbench runs a Git-only isolated install/review audit.
- The example is intentionally a bounded architectural proof, **not** a
  generalized character/physics skill, final delivery soundtrack or 1080p
  movie. Artistic acceptance remains with the owner.
- Evidence is tied to PR **head commit** (not the ephemeral synthetic merge
  commit); the checkout commit is tracked independently.
- Future M2 production must generate a genuinely new, editable 20-30s
  1080p voiced film; this architectural demo cannot count for M2.

## State and ownership

M0 is ACCEPTED by owner as baseline (15 November 2026).
M1 was reopened for mandatory remediation following a deeper audit. Technical
completion requires the full root and production CI **after all fixes**, plus
reviewable original production IR video and native stills. User acceptance
requires reviewing those actual media. Do not infer natural animation quality from
pixel parity; M2 will test a *new* 20–30 second editable product.

Code references: `src/animation-ir.ts`,
`production/src/scene/animation-ir-adapter.ts`,
`scripts/render-ir-ab.ts`, `tests/animation-ir.test.ts`,
`production/tests/animation-ir.test.ts`.

## Final independently re-tested M1 evidence

Root and production CI both passed on implementation SHA `2b28317bbf15550204ebef1952b3938c222bb5f0`. Actual native Three-backed scene proof: [workbench run 43710867255](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43710867255); [root CI run 43710867218](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43710867218). Real scene includes 2 rigged characters, verified prop with grip anchor, correct absolute camera, 72 decoded 640p frames and 4 native 1080p stills. Full reverse seek and scene parity checks passed. Visual review still belongs to owner; no artistic/voice acceptance inferred. End-of-stage audit found no open **M1-scoped** technical defects. Strict stage gate remains mandatory for M2–M7.
