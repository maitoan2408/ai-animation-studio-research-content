# Product-first resume checkpoint — 2026-11-15

## Source of truth

- Approved plan: [ROADMAP.md](ROADMAP.md); machine state: [STATE.json](STATE.json).
- M0 user review was **ACCEPTED** (13s baseline demo, 2026-11-15). This accepts M0 only, not overall video quality or future milestone completion.
- M0 evidence: source `cf909d0139fe09a2c0e66db509342bedfd2e6059`, CI https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43703073604, artifact `paper-studio-79`.
- Working branch for milestone M0: `codex/product-first-skill-architecture`. M1 implementation should branch from this accepted checkpoint, not bypass it or rewrite history.
- `main` remains historical; do not merge or alter old PRs without explicit owner request.

## Active milestone M1

Build a versioned, validated, tool-neutral AnimationIR and reversible Studio v1.0 compatibility adapter. Produce actual IR-adapted and baseline video from the same fixture, compare decoded frames and publish contacts/MP4 to CI artifacts for owner review. Build production SceneFrame camera/coordinate adapter with unit tests. Existing Studio render/export must remain backward-compatible. Avoid importing experimental physics into root by accident.

## Gates

Use root verification, build, real integration/UI tests; production typecheck/tests when workbench changes. Real MP4 render + full decode + contact sheets and SHA-bound manifest are mandatory. Do not mark M1 ready or accepted from static tests. No reports of completion until evidence is available. Never claim production motion quality from IR parity tests.

## Future handoff

After M1 code and evidence pass, record exact source SHA, CI run, artifact name and expiry in `STATE.json`, create stacked PR relative to M0 branch, and hand video to owner. M2 remains constrained new-script 20–30s 3-shot 1080p project.
