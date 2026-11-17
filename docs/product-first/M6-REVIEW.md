# M6 — Animation Quality: owner review package and post-result audit

**Authorization:** owner explicitly accepted M4 and M5 and permitted M6 on 2026-11-17. Scope remains code-driven 2D/2.5D, not 3D/AI video generator. Branch `codex/product-first-m6-animation-quality`, Draft [PR #18](https://github.com/maitoan2408/ai-animation-studio-research-content/pull/18), base `codex/integration-m1-m5-20261117` at `ea79a67ec755c8946eafa919558fad280dc2ca1f`. No main merge/M7.

## Implementation and integration

- `production/src/motion/m6-quality.ts`: data-only versioned `quality-motion/1` motion/acting layer over reusable M3 rig actions. Bounded body lean, hip compression, arm follow-through, head reaction and settle; pure deterministic random seek. Keeps original hand/cup anchor, planted world soles, art, stage camera and action timeline. No unauthorized bake or golden edits.
- `production/src/motion/m6-critic.ts`: full-frame root velocity/acceleration/jerk, head angular kinetics, planted-foot/contact discrepancy, per-frame diagnostics; never aesthetic score.
- `production/src/render/{browser,server,render-m3,render-m6}.ts` and `production/src/qa/audit-m6.ts`: two separate real native Three/Chromium MP4s, same input project/art/frames, FFprobe/full FFmpeg decode, PNG hashes and source SHA, independently derived critic reports and same-shot paired contact sheet.
- Root Studio `/motion`: explicit M3 baseline vs M6 quality toggle on the existing editable, revision-locked native Character Motion workspace; strict unsupported-mode rejection in HTTP and tests. M5 Director still executes root M2, **not** a general M3/M4 task graph.
- Root M2 audio pipeline retains 48kHz PCM data; `src/audio-quality.ts` writes descriptive non-destructive PCM peak/silence diagnostics. Opt-in `scripts/m6-audio-post.mjs` two-pass EBU R128 processing for genuine M5 narrated movies preserves the native video bitstream. eSpeak remains draft voice, not production vocal artistry.

## A/B native proof on executable SHA 9edd174221600d5162c1667d938f1775fc8ee1cb

| Technical measure | A: M3 baseline | B: M6 enhanced |
| --- | --- | --- |
| Original 1080p24 MP4 SHA-256 | `2a902307ae4e7fadccae0fbc6b75ecf3af97e90192015739a35d79b8da0434a5` | `4a2c7e44eb453bd426862146e6c3d9afd01a8c8f9f82c9496ffb674c4e3d0a04` |
| Length | 268 frames / 11.1667 sec | 268 frames / 11.1667 sec |
| Native frames with changed pixels | — | 258/268 |
| Planted contact samples | 488, max drift 0px | 488, max drift 0px |
| Held hand/cup samples | 58, max contact error 0px | 58, max contact error 0px |
| Camera deviations | 0 | 0 |
| Root speed maximum (px/s) | 89.7917 | 89.7917 |
| Head angular speed maximum (deg/s) | 47.47 | 53.73 |
| Full independent FFmpeg decode | PASS | PASS |
| Audio | Intentionally silent | Intentionally silent |

M6 run [44035353836](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/44035353836) SUCCESS; review artifact ID 14307243112 includes both MP4s, editable identical M3 project JSON, contact/chronological sheets, native PNG frames, per-frame motion critic JSON, and final independent audit JSON. Combined contact-sheet SHA `12dfe20a30fed5a23cfed3db541e5df60982140932cf6a7808284ecb56258494`. The video was delivered directly in the chat. Frame changes are real but moderate; they are not a human judgment of naturally acted motion.

## Audio improvement, verified on real M5 voiced source at 9edd174

Independent two-pass FFmpeg trial and full decode on original 432-frame 1080p24 AAC 48kHz M5 films:

| Movie | Original loudness / TP | M6 postmaster loudness / TP | Postmaster SHA |
| --- | --- | --- | --- |
| Script A | -19.5 LUFS / -3.0 dBTP | -16.1 LUFS / -1.5 dBTP | `55a10859c5a47c74699b65bf6d0d1807bf14c3555146c7f1f440c18d959fe97f` |
| Script B | -20.8 LUFS / -4.7 dBTP | -16.0 LUFS / -1.4 dBTP | `27c51d9f215724d886e47d118b1bdabe1ef355c52e769a33087b3478c705e39e` |

Original encoded video stream SHA unchanged, original MP4 immutable and derived output duration exactly 18 sec. This is a measurable **level/peak** improvement, not a quality certificate for voice realism, lyric sync or expressive performance. Final workflow must reproduce this on final code SHA.

## Five-workflow code regression 9edd174

| Workflow | GitHub run | Result |
| --- | --- | --- |
| M6 native paired and independent audit | 44035353836 | SUCCESS |
| Root M0–M2 app, UI, audio, integration, 1080p24 edited film | 44035353832 | SUCCESS |
| Q2 production TS/Python, M3 real native, standalone | 44035353828 | SUCCESS |
| M4 Rapier/off-on/short case and independent audit | 44035353847 | SUCCESS |
| M5 Director two real narrated films and independent audit | 44035353867 | SUCCESS |

Initial FAILs during development were reproduced, including eight Prettier violations and a malformed-WAV error-code assertion, repaired without changing quality thresholds; historical GitHub logs preserved. Independent media audit checked hashes, project parity, actual decoded full videos, all authored contacts, reverse random-access. Additional visual inspection of actual 1080p stills/contact sheets found no blank/corrupt frame in sampled evidence, no apparent hand/sole disconnect; do not conflate this with owner subjective approval.

## Limits and next gate

This evidence proves **bounded native M3 motion/acting technical changes** plus non-destructive M5 sound-level improvement. The existing development art remains development art; no human approves style, licensed assets or natural voice via these tests. There is no general Director→M3/M4 adapter, arbitrary character retargeting, cloth/hair simulation, full facial lip-sync, upgraded production voice or M7 pilot. Film motion is stylized and the artistic gain modest. New audio CI must pass on final implementation SHA before M6 is `READY_FOR_USER_REVIEW`.

**Status at review-file creation: M6 TECHNICAL_A_B_PASS; final-audio CI PENDING; userAcceptance NOT_REVIEWED.** Never self mark ACCEPTED or merge.
