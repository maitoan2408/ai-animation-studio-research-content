# M6 — Animation Quality & Production Polish (implementation plan)

Owner authorization: 2026-11-17, explicitly accepted both M4 and M5 in ChatGPT and instructed M6 implementation.
Base: `codex/integration-m1-m5-20261117` at `ea79a67ec755c8946eafa919558fad280dc2ca1f`.
Branch: `codex/product-first-m6-animation-quality`; Draft PR #18. **No main merge or M7.**

## Product contract and scope

Preserve M0–M5 workflows. Quality improvements must be demonstrated by paired, real 1920×1080/24fps MP4 renders using identical project, art, camera, timeline, lighting, renderer and audio configuration. Preserve every visually authored grip/sole contact and ensure deterministic frame random access. Do not use generative video output as evidence.

- Current root Studio M2 + M5 Director: validated script/project/voice/render/review. M5 calls the M2 engine, **not** native M3/M4.
- Native M3: data-only character package, walk-stop/turn-head/wave/pick-place, exact authored foot/hand targets, Three/Chromium renderer.
- Native M4: validated Rapier 240Hz physics bake and replay, hand/prop ownership; do not modify engine or immutable bakes.
- Existing PerformanceScript + ScalarClip exist; do not create a second broad PerformanceIR or retarget unsupported rigs.
- Existing U2 S05 critic is hero-specific. M6 critic must measure actual generic supported M3 clips without claiming artistic approval.
- Art pack `lantern-v1` and draft mouth/expression sheets are development assets. Legal provenance and human style approval remain separate requirements.
- eSpeak draft voice is a timing fixture, not a production-grade natural voice; preserve zero-credential local audio and do not misrepresent voice quality.

## A. Frozen baseline and experimental design

The first reproducible A/B subject is `makeM3Showcase(pack, 'guest-01','an')`, 268 frames, four supported action clips, locked art pack/camera and real native Three backend. Video A uses M3 sample unchanged. Video B adds the data-driven `quality-motion/1` overlay to the *same* validated M3 project. The baseline implementation is evaluated from the same checkout with an explicit mode; no edits to accepted M3 data, M4 bake, historical reports or golden media.

Quality controls are bounded (lean, hip bounce, arm follow-through, head emphasis and settling); all time-dependent sampling is pure. Held hand/prop target and both stage-space sole targets are unchanged. No live Rapier stepping occurs during random seeking. All settings are explicit, versioned and validated; unsupported actions refuse via M3 validation.

A/B questions:
1. **Walk/stop:** Does measured planted-sole drift remain zero while more layered weight and follow-through become visually apparent?
2. **Head turn, waving:** Does timing/gaze/torso staging show an observable but bounded change without rig discontinuity?
3. **Pick-place:** Does attention/head performance improve without shifting hand/prop grip, cup motion or camera?
4. **Audio/performance:** Inspect synchronized voice and peak/silence using separate M2/M5 voiced outputs; native M3/M6 comparison is intentionally silent. Do not claim audio improvements beyond actual implemented checks.

A/B audit must explicitly measure frames changed, fixed camera, editable project SHA, same action/contact intervals, planted sole world coordinates, held grip error and complete video decode. Do not use changed pixels alone as proof of improved acting.

## B. Ordered engineering work

1. Add motion/acting quality evaluator on native M3 actions: no new rig, no changed soles, no grip contract change, no new art.
2. Add a reusable M3-clip-quality critic with per-frame issue code, severity, actual value and evidence marker, plus descriptive velocity/acceleration/jerk. Never invent an aesthetics score.
3. Reuse `serveM3` and native `render-m3.ts` for two separate encodes, adding validated mode flags; preserve original M3 default.
4. Generate paired 1080p/24fps videos, MP4/PNG manifests, contact sheets and independent byte/geometry audit.
5. Evaluate art/layer continuity, render quality and audio duration/peak of the **existing** production pipelines without changing historical media. Only implement targeted fixes with failing regression evidence.
6. Audit whole M6 against acceptance. For every in-scope defect: FAIL reproduction → root cause fix → test → rerender → re-audit → full regression on final implementation HEAD.
7. Update `STATE.json`, `RESUME.md`, `M6-REVIEW.md`, quality reports and Draft PR. Leave owner artistic review pending. No automatic merge or M7.

## C. Non-negotiable acceptance matrix

| Area | Evidence required | Gate |
| --- | --- | --- |
| Contracts | Strict schemas, unsupported/malformed action, nonfinite transforms, unreachable IK and invalid asset fail closed | PASS / FAIL / NOT_RUN |
| Motion & rig | Full supported-clip contact and seek regression; real native pixels visibly differ while all planted/held contacts preserve | PASS / FAIL / NOT_RUN |
| Art and render | Exact same art/camera/frame count/alpha/layering; no missing/blank frames; lawful provenance; no fake art rating | PASS / FAIL / NOT_RUN |
| Secondary & physics | No drift of M3 grip/sole or M4 baked ownership; random seek parity; M4 regression | PASS / FAIL / NOT_RUN |
| Audio | M2 voiced film preserved and probed; draft/production distinction, voice timing/clip/silence checks | PASS / FAIL / NOT_RUN |
| Product | Both actual 268-frame native MP4s at 1080p24 full-decode; SHA-256; editable project; paired board | PASS / FAIL / NOT_RUN |
| Regression | Root verify, integration, UI/recovery, production TS+Python, M3, M4, M5, M6; after last code edit | PASS / FAIL / NOT_RUN |
| Human gate | Real video/screenshots and all limitations supplied to owner; only owner decides aesthetics and ACCEPTED | READY / BLOCKED |

## D. Dependencies, exclusions and risk

The bounded native evaluator is **not** an integrated Director → M3 → Rapier workflow. That separate product architecture requires adapter design, versioning and tested owner-approved sequencing. A premium studio-grade voice cannot be declared with eSpeak or numeric audio statistics. Generic cloth/hair, entirely new character artwork, broad retargeting, feature-film quality, licensed voice procurement and M7 pilot are outside this bounded implementation unless separately authorized. If any target not met, report M6 IN_PROGRESS / BLOCKED, not READY_FOR_USER_REVIEW.

Before approval, keep source/revision/asset hashes, failed attempts and limitations intact; never alter locked goldens or thresholds to make tests green.

## Verified real voiced-film postmaster extension

`scripts/m6-audio-post.mjs` is an optional, fail-closed FFmpeg two-pass loudnorm consumer for immutable root M5 voice-bearing native MP4s: target -16 LUFS and true-peak maximum -1dBTP (filter target -1.5), 48kHz AAC. It refuses unsupported input/no-audio/mismatched output/existing files, measures initial EBU R128, remeasures final true peak, enforces original 1920×1080/24fps and exact decoded frame count, compares FFmpeg video stream SHA256 before and after, full-decodes final media, and SHA-binds original/derived media in a report. Two real M5 story MP4s are CI inputs. This does not change eSpeak voice timbre, generate viseme timing or modify the original accepted files.
