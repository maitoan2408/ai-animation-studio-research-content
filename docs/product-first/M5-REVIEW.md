# M5 — Director | post-result review log

**Status:** POST_RESULT_QA_IN_PROGRESS, not final accepted and not owner-approved. Development authorized on 2026-11-17 while M4 owner approval was explicitly deferred. Branch `codex/product-first-m5-director` and [Draft PR #15](https://github.com/maitoan2408/ai-animation-studio-research-content/pull/15) target the unmerged M4 branch.

## First real production run (superseded by QA corrections)
Initial executable implementation `ebb80ea36f7d0c931a569e1e9a1662ead98ab6ae` generated **two different new 18-second 1080p24 movies** using the actual root Studio renderer with 48kHz local voice, editable source JSON, source revision and SHA-bound receipt, and two native browser task graph screenshots. [Initial M5 CI](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43919494355) passed M5 graph tests, M4 contract tests, both real renders, video/audio full decode and separate post-result SHA/source review (15 checks / 2 complete film decodes). Initial movie SHA values: A `63a0fb370861fe1af67de27f2050caec2eafa96dd344aa45ca63dafee957d3b1`; B `945b6bbdf9a648a8d43fee5ef1711e27ef10f01e3f131f0e6e994a218aa712db`.

### Second-pass findings and mandatory remediation
1. **M5-VISUAL-001:** Success screenshot contained a video player loaded only to metadata, so no actual decoded scene was visible inside the preview. Fixed in `web/director.js` and native E2E, which must play/seek to a real decoded frame before screenshot and assert seeking/ready state.
2. **M5-VISUAL-002:** The 3×2 contact sheet requested only five frames and placed a misleading empty black rectangle as sixth tile. Fixed to render six genuine chronological decoded frames and added an independent audit assertion that the last tile is not black.

The initial M5 product CI PASS is retained as **historical**, not used to claim final M5 acceptance after fixes. The complete new films, screenshots, full QA and regression must be rebuilt on final implementation HEAD; record their hashes/CI links here after success. User review remains **NOT_REVIEWED**. Never auto-merge or start M6.
