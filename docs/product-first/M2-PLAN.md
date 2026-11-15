# Studio v0.2 — M2 execution checklist

**Authorized 2026-11-15** after owner accepted M1. Branch `codex/product-first-m2-studio-v02` starts from `codex/product-first-m1-animation-ir` at `2042ad49e4e7f5456a49bc696d820044017f5643`. No merge to main and no M3 implementation before M2 is owner accepted.

## Accepted scope

1. An original NEW 20–30 second 1920×1080, 24fps film containing >=3 editable shots.
2. Script→storyboard→save new revision→persist/reopen→local narrated voice→final MP4 via existing constrained renderer. All scenes generated from external script and editor instructions, no hard-coded scene-specific logic.
3. Save/export/import round trip retains new revision, the edited script, audio refs and scene timing; explicit proof of visual change after revision.
4. Real 1080p rendered delivery, browser Studio screenshots, review stills and contact sheet; full decode, frame count, AAC 48kHz, voice presence, SHA-bound artifacts.
5. Mandatory independent end-of-stage audit of script support, unsupported actions, timeline, audio overflow, security, revision persistence and UI/render behavior; fix bugs and re-run BOTH complete existing regression suites on the final HEAD.

## Gate protocol

- `IN_PROGRESS` until final video, independent test and media evidence are verified.
- Green unit tests alone are NOT a completion criterion.
- `READY_FOR_USER_REVIEW` requires no unresolved in-scope issues and an actual playable video plus screenshots directly accessible to the owner.
- User alone can decide `ACCEPTED`. M3 cannot begin earlier.

## Scope boundaries

- Motion/character reuse work is M3, physics M4, Director M5, art polish M6.
- No arbitrary generated JS; only strict ProjectSpec, deterministic planner, supported existing animation actions.
- Voice is offline timing draft unless user provides a reviewed WAV; never claim premium natural narration.
- Produce technically honest frame/audio/source reports; retain failed attempts.
