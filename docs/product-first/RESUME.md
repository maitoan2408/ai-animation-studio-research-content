# Resume checkpoint — 2026-11-16 | M2 technical PASS, pending owner review

## Strict stage gate

M0 and M1 are owner ACCEPTED. **M2 READY_FOR_USER_REVIEW (NOT_ACCEPTED)**. Do not start M3 or merge any stacked PR until owner explicitly approves. Mandatory for every stage: implement, independent defect/quality audit, repair findings, full final-source CI regressions, inspect actual rendered media, then present owner review.

## Latest verified source and real evidence

- Source code HEAD for M2 media: `bc351255374a7aac499e056daf8ed194167bb74a`. The documentation status update that follows is documentation-only; the executable revision and verified movie are unchanged.
- Full Studio & product CI SUCCESS: https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43737952273
- Full production workbench CI SUCCESS: https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43737952293
- Latest actual M2 evidence: https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43737952273/artifacts/14170989211 (`paper-studio-m2-145`, expires 2026-11-29).
- The 24 sec 3-shot editable Studio movie is native 1920x1080/24fps, 576 decoded H264 frames with 48kHz AAC Vietnamese draft speech. SHA-256 `cc3177c7c71393fb54778f12c05023e102ff229cd6111a161cbf3ff61b8ed109`.
- On 2026-11-16 downloaded the latest artifact and independently verified all 23 manifest hashes, MP4 SHA, ffprobe frame count, full ffmpeg video+audio decode, 3-scene portable project/voice references, sample frames/contact and browser-run reopen evidence.
- The old long-render CLI JSON contract was repaired in commit `bc351255`; `tests/cli-long.ts` now runs in CI and passed. Earlier root-cause evidence persists in M2-REVIEW.md.

## Owner review boundary

The pipeline, save/reopen, draft voice, editing and media output passed technical requirements. Visual motion is **basic**: simple wave, rigid walk and mechanical cup pick-up; natural motion remains future M3/M6. Draft eSpeak Vietnamese voice is not human quality certified. No automated evidence is an owner visual or listening approval. No M3 progress unless the owner says yes.

## Files to read first

- `docs/product-first/ROADMAP.md` for stage requirements and mandatory post-stage QA.
- `docs/product-first/STATE.json` for machine-readable state.
- `docs/product-first/M2-REVIEW.md` for detailed M2 defects, checks, evidence and scope.
- `scripts/m2-product-e2e.ts` and `.github/workflows/ci.yml` for reproducible workflow.
