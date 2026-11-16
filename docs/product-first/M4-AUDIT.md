# M4 audit and repair plan — 2026-11-16

Reviewer: delegated-agent. Base: latest M4 `081ee51cf7fb95ca1defe5f772449c5a7cf275a5`; original PR #13. Preserve accepted M1–M3 logic, bounded single-cup/platform contract and locked S05 physics/goldens. No M5 or automatic merge/owner approval.

1. Run existing contracts and inspect latest native OFF/ON evidence, including the newer finite-platform repair rather than relying on the older review report.
2. Reproduce boundary weaknesses: short valid timelines versus hardcoded frame 150 in render/audit; frozen-but-unvalidated replay; checksum-consistent invalid handoff/penetration; collision events observed between output frames.
3. Repair confirmed failures with regression tests and explicit errors; retain all FAIL attempts. Verify output/provenance paths and actual negative media audit.
4. Run full root, production and M4 suites on final executable source. Render both OFF/ON for default and a second valid short configuration, then independently decode/verify actual media and contacts after production.
5. Publish source-bound videos, comparison images, editable inputs and concise report. M4 remains READY_FOR_USER_REVIEW until explicit owner acceptance.

Status: IN_PROGRESS. Recorder attempts use U2 only as the evidence namespace, not as milestone progress.

## Reproduced and repaired

- Existing two M4 contracts passed, but four adversarial cases failed: frozen-unvalidated replay, rehashed handoff teleport, rehashed floor penetration, and a missed actual solver impulse. All six original+new tests then passed. Added timeline/short-fixture coverage brings M4 to eight tests.
- A valid 105-frame project failed the native renderer's `frames > 150` assertion. Renderer, contact sheets, browser seeks and auditor now derive indices from the actual timeline.
- The consumer previously trusted declared frame hashes for OFF/ON difference. It now re-simulates the bake, decodes actual comparison pixels, binds stored stills to captured-frame hashes, regenerates the comparison from both films, and records FAIL on any rejection. Nine corruption cases will run against real media.
- Production-only installation regression caught the new fixture's root-folder dependency. The fixture now lives in `production/examples/`; the six new tests passed from an extracted production-only Git archive.
- CI run `43912830263` exposed the recorder's Git ownership assumption in the container. Scoped per-command Git trust fixes it without changing global configuration or child environments. Two new recorder regressions first failed, then passed: different-owner execution and inclusion of physics JSON fixtures in the immutable source snapshot.
- Local root verify passed (26 tests); production suite passed before the final short-fixture addition (129 tests); Python passed before the two recorder additions (65 tests). Final complete CI must include the resulting 130 production and 67 Python tests, fresh M1–M3 media, and both M4 native scenarios. These intermediate counts are not a final gate claim.

Immutable requests/results/logs are selected under `evidence/m4-audit-20261116`; original full source snapshots and failed native attempts remain in local `production/evidence/U2` and `production/out`. U2 denotes the recorder namespace only.
