> **2026-11-17 deeper independent audit: this earlier technical-PASS conclusion is superseded by `M5-RECHECK-20261117.md`. M5 is `REWORK_REQUIRED` pending three source-path acceptance gaps and new regression tests. The films/CI below remain authentic historical evidence, not complete acceptance.**

# M5 — Director: final technical and media review

**Date:** 2026-11-17 (Asia/Bangkok). **Technical verdict: PASSED / READY_FOR_USER_REVIEW.** **User acceptance: NOT_REVIEWED.** M4 remains awaiting owner assessment; no project merge or M6 authorized. M5 implementation source: `f70e165ff7f955165f2921faf947681970f7e01a`; isolated branch `codex/product-first-m5-director`; [Draft PR #15](https://github.com/maitoan2408/ai-animation-studio-research-content/pull/15), based on unmerged M4 branch.

## Implemented executable product, not merely videos

`src/director.ts` is a versioned **offline deterministic bounded Director** generating validated, source-bound task graphs from script and exact root Studio capability registry. `/director` is an actual browser UI showing exact graph and compiled scenes before the user explicitly approves execution. `POST /api/director/run` executes existing `Studio.create`, local `Studio.voice`, `Studio.enqueue/wait/retry`, and hash/QC verification, returning a SHA-bound persisted receipt and editable root Studio source project. No model-produced JavaScript, paid APIs, automatic artistic approvals, fabricated jobs or hidden reinterpretation of human edits. Already completed plans return the same verified receipt; conflicting human revisions, forged plans, unknown actions, invalid engine and corrupt assets fail closed.

**Important scope:** the M5 Director orchestrates the **root M2 Storyboard Studio**, not the separate M3 cutout-rig and M4 native physics engines. It is not an LLM story director or a general art generator. Skill names map to real root executors only. M3/M4 regressions were rerun but their functions are not falsely presented as automatically incorporated into M5 videos.

## Final original evidence

Source `f70e165ff7f955165f2921faf947681970f7e01a`; genuine native Chromium UI and original root Studio/HyperFrames FFmpeg MP4s, not still mock-ups. **[Download M5 original review archive / GH Actions artifact ID 14253168961](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43922045093/artifacts/14253168961)** (expiry 2026-11-30). Includes both original 18s H264 movies, two 6-tile genuine contact sheets, two task-graph and two rendered-UI screenshots, rejected-skill screenshot, editable portable audio+storyboard JSON, plan and receipt JSONs, `manifest.json`, and independently recomputed `m5-independent-post-result-audit.json`.

| Deliverable | Original SHA-256 | Profile/observations |
|---|---|---|
| `m5-script-a-final-1080p.mp4` | `63a0fb370861fe1af67de27f2050caec2eafa96dd344aa45ca63dafee957d3b1` | Vietnamese paper-cut, 3 scenes `wave → walk → talk`, **432 frames**, 1920×1080/24fps, local voice at 48kHz, decoded audio RMS 2041.12 |
| `m5-script-b-final-1080p.mp4` | `945b6bbdf9a648a8d43fee5ef1711e27ef10f01e3f131f0e6e994a218aa712db` | English multiplane, 3 scenes `walk → pick-up → wave`, same exact frame and video profile, 48kHz local voice, RMS 1670.81 |
| Plan A | `56051dfa81b0a1b1602fb896afbee18ef07a7e9476863f80ce11e4888cb21a54` | SHA-bound validated four-node task graph |
| Plan B | `263990ccaf3c6c4ecc0d759d8d095d68ba45762c23bd131bddfc556efa2b2a2e` | Different script, shot/action/camera order and independent source |
| Unsupported request | Browser `m5-unsupported-skill-rejected.png` | Action `fly` rejected `INVALID_PROJECT` before execution and approval button disabled |

## Final source CI verification (every workflow rerun after last executable source fix)

- [M5 native two movies + independent post-result video/voice/source QA: **SUCCESS**](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43922045093). 15/15 delivered artifact SHA hashes independently downloaded/recomputed; two complete FFmpeg movie decodes; two verified 48kHz tracks with nonzero sound; six genuine contact frames per film; true decoded UI video preview; negative UI screenshot.
- [Paper Studio root full verify, integration, UI, M1 and actual M2 native product: **SUCCESS**](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43922045061).
- [Q2 production full contract/golden, Python and M1–M3 native showcase/editor/regression: **SUCCESS**](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43922045140).
- [M4 physics native OFF/ON, Rapier and independent M4 audit: **SUCCESS**](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43922045332). Confirms M5 change did not break M4 physics; does not substitute for owner's M4 acceptance.

### Second-pass independent visual inspection

The first completed M5 end-to-end run on `ebb80ea` passed automated SHA/media audits, but true screenshot/contact inspection independently found two in-scope visual-evidence defects:
- **M5-VISUAL-001:** success screenshot was blank inside HTML5 video player (metadata alone had loaded). Fixed in `17a43c95` with real browser playback and seek to frame 48, waiting for actual decoded video before screenshot. Final screenshot visibly displays a correct extracted real movie frame and source hash receipt.
- **M5-VISUAL-002:** five frames were tiled into a 3×2 sheet, producing a false black sixth tile. Fixed in `17a43c95` to sample six actual decoded frames with a new independent check for last tile occupancy. Both final chronological contact sheets show six actual movie frames.

After these fixes all four full CI workflows on the above source SHA passed. The **final original artifact ZIP** was downloaded and its **15 original file hashes** independently checked; native UI screenshots/contact sheets visibly inspected and confirmed no blank preview, no empty contact tiles, correct graph, obvious fail-closed bad-skill rejection. Actual two movies with correct codec/resolution/frame/audio verified by FFprobe and complete independent FFmpeg decoding. The art/voice are intentionally a bounded root M2 prototype; technical pass is **not** human cinematic quality approval.

## Remaining documented limitations, not in-scope failures

Only root Studio's existing five actions, two cameras and styles. No true LLM creativity, new character/asset generation, M3-native animator or M4-Rapier cross-engine compilation; these systems remain separate and any unsupported request must reject. Local eSpeak voice is a provisional draft, not natural acting. Both 18-second movies demonstrate reusable software on **new stories**, not an automatic all-purpose animation platform.

## Owner review gate

**PASSED / READY_FOR_USER_REVIEW** for executable bounded M5 scope; **M5 userAcceptance=NOT_REVIEWED**. M4 owner decision similarly remains `NOT_REVIEWED`; M4 and M5 PRs stay Draft and unmerged. No M6 may start until explicit owner authorization. Final documentation checkpoint commits after source should be followed by CI rerun; media manifest `sourceCommit` is bound to exact executing source, never guessed.
