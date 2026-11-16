# M1–M3 audit — 2026-11-16

Reviewer: delegated-agent. Scope: latest M3 branch 73adc256, including accepted M1/M2 ancestry. No M4 or change to core roadmap/art acceptance.

## Fixed audit plan

1. Re-run schema/IR/HTTP/storage and production contracts; inspect existing final CI and real media.
2. Challenge M3 save/import under delayed responses, invalid input and data round trips using actual Chromium. Preserve FAIL attempts before repairs.
3. Repair confirmed defects, preserve data-only validation and accepted rendering logic; add regression checks to CI.
4. Run full root/production regression on final source; render M1/M2/M3 evidence and perform separate post-result media/data audit.
5. Record exact source, test outcomes, limitations and media; hand off without self-approving aesthetics or advancing M4.

## Reproduced findings and repairs

- **M3 draft loss:** late save response erased newer edits. Reproduced in actual Chromium; now advances the saved revision without reapplying stale fields. Pending document operations serialize; newer edits remain dirty and the next save uses the updated revision.
- **M3 import corruption:** imported prop IDs were replaced and unknown fields discarded before validation. The full document now passes a read-only server validation endpoint before touching the draft. Draft collection preserves the imported base and IDs. Invalid imports leave current edits intact.
- **Missing CI coverage:** production workflow now runs on root service/UI/M3 harness changes, covering the native path these changes affect.
- **Stale checkpoint:** RESUME/plan now identify the actual separate `/motion` Studio page.

- Confirmed additional cold-install defect: M3 native render failed ENOENT on missing textures.json; existing CI hid it by preparing art during M1 first. Renderer now bootstraps missing cache through the existing rasterizer, verifies every original/source and raster SHA, rejects corrupt cache, and CI explicitly starts M3 without that cache.

- **Weak negative audit:** the old test only asserted that a digest was not all zeroes; it did not feed corrupt media to the auditor. New post-result regression corrupts private copies of project, MP4 and native PNG and requires a specific integrity rejection. The Studio delivery audit also verifies project bytes against the saved revision.

## Validation and evidence

Executable source under final CI: `f34b206f1631eba26a87936ee955d8d99d16826a`.

- Local root format/typecheck and 26 tests PASS; production typecheck and 122 tests PASS; Python 65 tests PASS.
- Real root integration, CLI build and responsive UI PASS; all draft/async/navigation recovery suites including the new M3 browser cases PASS.
- Genuine pre-fix draft/import FAIL, cold-native missing-texture FAIL and successful regression logs preserved in `evidence/m1-m3-audit-20261116/`. Initial npm cache/PATH setup errors, test typing/formatting failures and interrupted CI runs remain in the immutable local recorder history; they are not reported as successful product runs.
- Final CI: [Studio/M1/M2](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43817836030), [production/M1/M3/native/negative/post-result](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43817835965). Both completed SUCCESS on the exact executable source. CI includes fresh M1 native, cold-cache M3, all three real corruption rejections, Studio custom render and separate post-result audits. Downloaded M1 parity and M2 media passed 26 byte hashes and three full video/audio decodes; local native M3 matches CI video SHA exactly.

M1/M2: no new defect found in the reviewed data/IR/render/storage paths and final CI/media checks. M3: the three reproduced user-facing failures are fixed and verified, including optional prop editing and preservation of imported capabilities. No artistic approval or independent human review claimed.

## Final results

**PASS_TECHNICAL — READY_FOR_USER_REVIEW.** PR #12 contains the scoped repairs and evidence. M1/M2 owner acceptance is retained; M3 artistic/functional owner acceptance is still NOT_REVIEWED. No M4 implementation or merge.

- M1 legacy/IR: two 96-frame movies with identical decoded picture/audio; real Three bridge: 72 frames, native 1080p stills, camera/contact/seek parity PASS.
- M2: 576 frames, 24 seconds, 1920×1080/24fps, AAC 48 kHz; three edited shots, preview/final pixels, aligned voice, export/import and fresh-process reopen PASS.
- M3: 268 frames, 1920×1080/24fps; 488 planted-sole samples with zero drift, 58 grip samples with zero error; 66 px cup lift. Video SHA `2a902307ae4e7fadccae0fbc6b75ecf3af97e90192015739a35d79b8da0434a5` unchanged.
- Studio M3: actual UI-created `guest-qa`, wave-only/no prop, 49 native frames; saved revision matches delivered project; video SHA `922f13ad0c5d10b0774df72aa066279a9f3b796382163cb709f7890b675f7823`. Desktop/mobile evidence and separate post-result audit PASS.
- The large diagnostic artifact exceeds the execution environment's 32 MiB file-transfer limit. CI now additionally publishes a compact milestone review artifact (movies, contact sheets, projects, manifests, audits and UI), preserving the complete diagnostic artifact. The final documentation/workflow commit is rechecked before chat handoff.

Quality boundaries: reused art/rig and bounded right-facing actions; M3 showcase intentionally silent. M2 Vietnamese eSpeak remains a timing draft. Technical decode/waveform checks are not a new human listening or artistic approval. No threshold was relaxed, renderer golden replaced, or prior failed evidence erased.

Results: PASS_TECHNICAL. Logs and source snapshots: production/evidence/U2/*audit* (U2 is recorder namespace only).
