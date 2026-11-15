# M3 checkpoint — 2026-11-16 | TECHNICAL PASS; OWNER REVIEW PENDING

## Sequential gate

M0, M1, M2 are explicitly owner ACCEPTED. M3 is **READY_FOR_USER_REVIEW**, technical evidence PASS, but owner artistic/functional assessment **NOT_REVIEWED**. No M4 work and no merge of stacked PRs until owner accepts. No interim reporting.

## Reproducible M3 product and code

- Development branch: `codex/product-first-m3-character-motion`; Draft PR #11; base is owner-accepted M2 branch.
- Executable source and post-result re-audit passed on `7aa1ce284662d65bda8d2d421492d0a74ea43ab5`. Later documentation-only commit does not alter renderer or locked media.
- Studio full CI: https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43751133720 — SUCCESS (including M2 native edited video regression).
- Production workbench full CI: https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43751133731 — SUCCESS (includes M1 native video, M3 native 1080p film and separate post-result audit).
- Media ZIP: https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43751133731/artifacts/14175973462 (expires 2026-11-29).
- Native `m3-character-motion-final-1080p.mp4`: 268 frames, 1920x1080, 24fps, duration 11.1667s, H264, intentionally silent. SHA-256 `2a902307ae4e7fadccae0fbc6b75ecf3af97e90192015739a35d79b8da0434a5`.
- New ID `guest-01` reuses validated art model `an`; project file is hash-bound, registry guards duplicate IDs.
- Four actions: walk-stop, turn-head, wave, pick-place. 488 planted foot contact samples show zero sole drift; 58 held grip samples zero misalignment; cup lifts 66 stage pixels.
- Actual full-encoded video independently downloaded and decoded; project bytes, native stills and contacts match all SHA. 17 native screenshots and actual before/after image retained.

## Defect recovery & final review

Review report: `docs/product-first/M3-REVIEW.md`. Initial render technically succeeded but second pass found incorrect project-file digest and misleading standing baseline. Both corrected; registry collisions tested; native media redone; independent auditor verifies real artifact bytes as separate job step. Historical FAIL test runs are retained. No unresolved M3-scoped technical issues found in last audit.

## Human caveats

- Visual puppet reuses existing verified model; no novel character artwork was created.
- This M3 film demonstrates actual motion and contacts but not M4 generalized physics, M5 Director or M6 acting/voice polish.
- Do not equate screenshot/hash parity with subjective quality approval. Show actual MP4/GIF/contact and concise QA in chat, then owner decides `ACCEPTED`.
