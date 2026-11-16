# M4 audit and repair plan — 2026-11-16

Reviewer: delegated-agent. Base: latest M4 `081ee51cf7fb95ca1defe5f772449c5a7cf275a5`; original PR #13. Preserve accepted M1–M3 logic, bounded single-cup/platform contract and locked S05 physics/goldens. No M5 or automatic merge/owner approval.

1. Run existing contracts and inspect latest native OFF/ON evidence, including the newer finite-platform repair rather than relying on the older review report.
2. Reproduce boundary weaknesses: short valid timelines versus hardcoded frame 150 in render/audit; frozen-but-unvalidated replay; checksum-consistent invalid handoff/penetration; collision events observed between output frames.
3. Repair confirmed failures with regression tests and explicit errors; retain all FAIL attempts. Verify output/provenance paths and actual negative media audit.
4. Run full root, production and M4 suites on final executable source. Render both OFF/ON for default and a second valid short configuration, then independently decode/verify actual media and contacts after production.
5. Publish source-bound videos, comparison images, editable inputs and concise report. M4 remains READY_FOR_USER_REVIEW until explicit owner acceptance.

Status: PASS_TECHNICAL / READY_FOR_USER_REVIEW on executable source `fc1eaf82d6a38f884f9baab8b4a04d6e9656c951`. Owner acceptance: NOT_REVIEWED. Recorder attempts use U2 only as the evidence namespace, not as milestone progress.

## Reproduced and repaired

- Existing two M4 contracts passed, but four adversarial cases failed: frozen-unvalidated replay, rehashed handoff teleport, rehashed floor penetration, and a missed actual solver impulse. All six original+new tests then passed. Added timeline/short-fixture coverage brings M4 to eight tests.
- A valid 105-frame project failed the native renderer's `frames > 150` assertion. Renderer, contact sheets, browser seeks and auditor now derive indices from the actual timeline.
- The consumer previously trusted declared frame hashes for OFF/ON difference. It now re-simulates the bake, decodes actual comparison pixels, binds stored stills to captured-frame hashes, regenerates the comparison from both films, and records FAIL on any rejection. Nine corruption cases will run against real media.
- Production-only installation regression caught the new fixture's root-folder dependency. The fixture now lives in `production/examples/`; the six new tests passed from an extracted production-only Git archive.
- CI run `43912830263` exposed the recorder's Git ownership assumption in the container. Scoped per-command Git trust fixes it without changing global configuration or child environments. Two new recorder regressions first failed, then passed: different-owner execution and inclusion of physics JSON fixtures in the immutable source snapshot.
- Local root verify passed (26 tests); production suite passed before the final short-fixture addition (129 tests); Python passed before the two recorder additions (65 tests). Final complete CI must include the resulting 130 production and 67 Python tests, fresh M1–M3 media, and both M4 native scenarios. These intermediate counts are not a final gate claim.

Immutable requests/results/logs are selected under `evidence/m4-audit-20261116`; original full source snapshots and failed native attempts remain in local `production/evidence/U2` and `production/out`. U2 denotes the recorder namespace only.

## Final measured result — 2026-11-16 UTC

All three complete workflows passed on executable source `fc1eaf82d6a38f884f9baab8b4a04d6e9656c951`: [Studio/M2 43913746879](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43913746879), [production/M1/M3 43913746771](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43913746771), [M4 native 43913746997](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43913746997). Exact job/artifact metadata: [CI receipt](evidence/m4-audit-20261116/ci-source-fc1eaf8.json). Subsequent documentation-only HEAD still requires these three checks to pass before chat delivery; current PR checks and artifact `sourceCommit` provide that exact HEAD binding.

- **223 unit tests passed:** 26 root, 130 production (including eight M4 contracts), 67 Python. Also passed real integration, CLI long render, browser UI/recovery, isolated production install, unchanged locked S05 physics, M1 real pixel/audio parity, a new 24-second M2 film, and M3 native/Studio/negative-media QA.
- **Four native films:** OFF/ON for the 169-frame default and 105-frame short project, all 1920×1080, 24fps H264, silent. CI output downloaded, 50 manifest file hashes rechecked, all four videos fully decoded, both inputs re-baked exactly and both comparison images reconstructed from actual video pixels.
- **Contact:** grip frame 18, release 62, first positive Rapier support impulse in frame 63. Each input has 44 held samples, maximum grip error 0px, handoff jump 0px and measured box penetration 0m. Repeated arbitrary seek reproduces native PNG/state hashes. The previous frame-64 label missed an earlier substep impulse; the simulation timebase/golden thresholds were not relaxed.
- **Actual failure reproduced:** the old auditor returned technical PASS with exactly identical OFF/ON movie hashes after substituting OFF for ON and updating the file hash. The diagnostic correctly failed; retained log `20261116T214656Z-m4-audit-media-substitution-before-d70e4222/stdout.log` proves it. The current consumer rejects this and eight other media/input/receipt corruptions with explicit errors and a new FAIL report, both in CI and again on downloaded media.
- **Visual inspection:** examined actual native comparison, chronological sheets and decoded grip/lift/release/settle crops. Actor/camera/bench remain intact; the cup follows the held motion, releases without teleport and slides/settles on the finite visible bench. No new art/acting optimization; accepted M1–M3 logic and all locked S05 files/goldens remain unchanged.

[Compact editable review ZIP](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43913746997/artifacts/14249123538) contains four original videos, source/bake JSON, manifests, sheets and post-result reports. Full native still artifacts are separately listed in the CI receipt (under 32MiB each). Git contains only source and selected small evidence; failed attempts and older renders are retained.

No unresolved in-scope technical defects found after repair and second pass. Limitations remain deliberate: one supported cup and level bench with existing M3 rig; box collision proxy with declared 2mm skin; no arbitrary rigid bodies/cloth or finished voice/acting polish. Review is **delegated-agent**, not independent human artistic approval. **Do not merge or begin M5 before owner approval.**
