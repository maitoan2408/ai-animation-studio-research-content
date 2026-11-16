# M1–M5 unified engineering QA and repair plan — 2026-11-17

## Source and approval boundaries

This integration uses M4-audit PR #14 at `3bbc337c3294e6dfa7570e463e6724a6990d64d9` as its base, then adds the distinct M5 Director implementation from PR #15. The joint change is isolated in Draft PR #16 (`codex/integration-m1-m5-20261117`), without merging or rewriting the original branches. M4 technical evidence passes but **M4 owner acceptance is NOT_REVIEWED**. M5 started as REWORK_REQUIRED, with its own review pending.

**This is a unified source, acceptance and testing workflow, NOT yet a universal film-creation pipeline.** The bounded M5 Director calls root M2 Storyboard Studio; native M3 rig and M4 Rapier physics remain separately callable modules. No script-driven Director-to-M4 native compilation is claimed. This is a substantive P1 integration gap for product evolution, not license to report a capability that does not exist.

## Consolidated reproducible workflow

The executable `scripts/m1-m5-workflow.sh` invokes the existing Stage M1–M5 verifiers in sequence with one SHA, including both real-native engines and new M5 outputs. The four focused GitHub Actions workflows remain independently required: root Paper Studio; Q2 production; M4 true physics/media; M5 Director/UI/media. All must run on **the same final implementation HEAD**. Shell syntax verification of the consolidated driver is separate from executing its entire expensive suite; no unrun command is labeled PASS.

## Stage-level regression matrix

| Layer | Required contract and evidence | Failure cases to protect | Owner review |
| --- | --- | --- | --- |
| M1 Integration IR | 24fps/frame-half-open intervals; stage/world transforms; actual Three sprite/anchor parity; native IR vs legacy A/B video and voice | malformed version, nonfinite camera, SHA mismatch, silent fallback | Previous acceptance retained; full regression |
| M2 Studio v0.2 | actual 20–30s editable 1080p multi-shot film; local voice; save/reopen, revision and import/export | stale edits, duplicate render, changed WAV, timeline overflow, cancellation, interrupted job | Previous acceptance retained; full regression |
| M3 Character/Motion | native rig/action clip renderer; feet and hand contact metrics; valid character registry, repeatable frame seek | unsupported rig/action, foot sliding, misplaced hand grip, stale asset and abandoned UI draft | Previous acceptance retained; full regression |
| M4 Physics audit | 240Hz Rapier, 10 substeps/frame; finite bench art support; immutable validated bake, zero unexplained handoff/penetration; 169- and 105-frame native OFF/ON, genuine pixel comparison | frozen invalid bake, forged receipt, sub-frame missed impulse, fake OFF=ON comparison, short timeline | Technical PASS PR #14; owner pending |
| M5 Director | explicit approved task graph, exact known capabilities, stable project identity, recovery journal, voice/revision and provenance binding; two new voiced 1080p films and native browser graph UI | stale async plan, crashed successful render before receipt, forged journal, post-approval audio timing drift, concurrent duplicate, tampered assets | REWORK_REQUIRED until all new and existing gates PASS |

## P0 / P1 / P2 priorities

**P0 — Completion blockers:** M5-RECHECK-001: delayed A response may authorize an obsolete script. M5-RECHECK-002: duplicate project/job after incomplete receipt and restart. M5-RECHECK-003: voice extends approved scene duration without consent. Each requires failing-first evidence, a source fix and an actual passing regression. Repeat test for input mutation after approval, full render/reopen, partial Store creation, interrupted job, forged progress journal, denied action, unchanged project after human edit and audio overflow.

**P1 — Cross-stage engineering robustness:** keep M4 audit's strengthened solver and media QA intact; validate ArtPack/rig/replay provenance across engine versions; enforce no silent backend fallback; keep root/M3/M4 asset identity explicit. Add a dedicated approved native M3/M4 skill adapter for the Director only if a real supported input-to-output contract and cross-engine artistic acceptance are designed. Test multiple accepted scripts, long narration, malformed inputs, browser reconnect, loss of HTTP response, and worst-case memory. The current M5 cannot be described as executing M4 physics.

**P1 — Dependency/security triage:** the final CI `npm ci` logs reported 13 high-severity advisory counts in both root and production dependency trees. This is a warning, not proof of exploitability. Inventory exact vulnerable packages and paths with `npm audit --json`; prioritize packages reachable at runtime, plan pinned compatible updates and regression before any upgrade. Do not use force upgrades to hide warnings. Review localhost-only host/origin/CSP boundaries, script injection and asset path traversal; expose no keys.

**P2 — Artistic and throughput evaluation:** decode whole movies, verify nonblank frames, shot transitions, voice alignment and native image/fps parity. Human reviewer evaluates acting, color, pacing, visual continuity, audible naturalness, contact believability and usability. Automated contact/hash/CI metrics alone are **not** evidence of professional animation quality. A 72s genuine pilot and quality iteration belong to future M6–M7 authorization, not automatic acceptance.

## Delivery gate / audit evidence

1. Source + failing test for each confirmed defect; keep unsuccessful runs and their logs.
2. Patch root cause, rerun focused negative + UI + recovery tests; no threshold/golden regeneration without justified review.
3. Produce fresh M5 native voiced films, M4 short/default physics A/B and M2/M3 regression from the same executable source; preserve original/editable projects.
4. Separate post-result downloaded artifact review: SHA checks, FFprobe frame/fps/dimensions/audio, full FFmpeg decode, real screenshot contact/foot/prop comparisons and explicit failure demonstrations.
5. Four full workflows **SUCCESS** against the *last code commit*; documentation-only commits must not falsely imply differently sourced media.
6. Mark M5 technical `PASSED` / `READY_FOR_USER_REVIEW` only if all in-scope findings close; keep M4 and M5 `userAcceptance=NOT_REVIEWED` until owner's explicit decision. Do not merge or start M6 automatically.

Status update 2026-11-17: all four full workflows were SUCCESS on executable source `74596bd1d1c8b0d97345bd676440dbadd2acdfc2`; media downloaded, SHA and full decode independently rechecked. See [final measured report](M1-M5-REVIEW-20261117.md). The complete combined shell driver was syntax-checked, not independently executed in one run. M4/M5 technical evidence is READY_FOR_USER_REVIEW; both owner acceptances remain NOT_REVIEWED; P1 cross-engine/native Director compilation and dependency/security advisory review are future engineering gates.
