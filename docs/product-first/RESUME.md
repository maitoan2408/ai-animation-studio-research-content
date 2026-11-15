# Product-first resume checkpoint — 2026-11-15

## Authoritative execution order

1. Approved plan: [ROADMAP.md](ROADMAP.md); machine state: [STATE.json](STATE.json).
2. M0 **ACCEPTED** by owner. Existing 13-second baseline was reviewed in chat. Do not mistake this for acceptance of future art quality.
3. M1 **READY_FOR_USER_REVIEW**, not yet ACCEPTED. Branch `codex/product-first-m1-animation-ir`, stacked on `codex/product-first-skill-architecture`. PR #9.
4. Continue to M2 only after reviewing M1's actual rendered A/B proof; do not write an M2 completion claim in advance.
5. Never merge or force-push without owner approval.

## M1 implementation

- Strict `src/animation-ir.ts` (Zod, staged frames 1920x1080, 24fps, actor capabilities).
- Existing app `compile()` now routes `ProjectSpec` through IR before producing legacy SVG/GSAP output.
- `production/src/scene/animation-ir-adapter.ts` maps shot frame and camera stage; **does not produce rig sprites**.
- `scripts/render-ir-ab.ts` creates independent MP4s from same script and voice for both compilers, checks full decoded frame and PCM parity, publishes stills and manifests.
- Tests: `tests/animation-ir.test.ts`, `production/tests/animation-ir.test.ts`.

## Evidence (all actual runs succeeded)

- Root app CI `43705819033`: https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43705819033
- Workbench CI `43705819120`: https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43705819120
- Tested source commit `de632e58a1d639d8ef8eabac20141f497d657586`.
- Root artifact `paper-studio-84`, ID 14158681348 (expires 2026-11-29). Inside `artifacts/product-first/m1/`: `m1-ir.mp4`, `m1-legacy.mp4`, `m1-ir-contact.png`, `manifest.json`.
- Video length 4s, 96 frames at 640x360, 24fps; both have 48kHz audio; decoded video frames and PCM are identical. Not a 1080p art review.
- Owner visual acceptance: **NOT_REVIEWED**. Send actual MP4 and GIF to chat for review.

## Next step after owner acceptance

M2 Studio v0.2: new script, 20–30s 1080p with >=3 shots, editable revision, preview/final export. Character and physics generalization are M3/M4; do not claim them from M1 tests.
