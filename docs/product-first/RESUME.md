## Final CLI compatibility follow-up

A real 16-second segmented CLI render exposed progress messages on stdout, breaking JSON consumers. Fix moves diagnostics to stderr and adds tests/cli-long.ts to CI. Recheck complete workflows before restoring READY_FOR_USER_REVIEW. Prior UI/media receipts below remain valid.

# M2 — technical complete, ready for owner review

Source `a6399e293b5c68c2637c295a4d36e929b7526dea` passed both full workflows: app [43736478725](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43736478725) and workbench [43736478822](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43736478822). Both media and UI/reopen gates passed. [Review/report](M2-REVIEW.md), [state](STATE.json), [exact CI manifest](evidence/m2-ci-a6399e2/manifest.json).

New film: 24 seconds, 3 editable shots, 1920×1080, 24fps, 576 frames, AAC 48kHz draft Vietnamese voice. SHA-256 `cc3177c7c71393fb54778f12c05023e102ff229cd6111a161cbf3ff61b8ed109`. [Download full review bundle](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43736478725/artifacts/14171210679); expires 2026-11-29. Includes movie, portable final revision with audio, actual Studio screenshots, contact sheet and provenance.

`technicalStatus=PASSED`, `evidenceStatus=READY_FOR_USER_REVIEW`, `userAcceptance=NOT_REVIEWED`. Next action is owner viewing/listening and acceptance of this M2 artifact. Do not start M3, auto-merge or reinterpret technical checks as artistic/human approval. Keep all failed attempts and earlier F3 work separate.

Reproduce from this branch: install Chromium, FFmpeg and librsvg2-bin; `npm ci`; `npm run studio -- doctor`; `npx tsx scripts/m2-product-e2e.ts`. M0/M1 recorded acceptance remains unchanged. Only bounded existing actions and draft voice are claimed.
