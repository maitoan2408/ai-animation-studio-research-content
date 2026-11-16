# M4 audit and repair plan — 2026-11-16

Reviewer: delegated-agent. Base: latest M4 `081ee51cf7fb95ca1defe5f772449c5a7cf275a5`; original PR #13. Preserve accepted M1–M3 logic, bounded single-cup/platform contract and locked S05 physics/goldens. No M5 or automatic merge/owner approval.

1. Run existing contracts and inspect latest native OFF/ON evidence, including the newer finite-platform repair rather than relying on the older review report.
2. Reproduce boundary weaknesses: short valid timelines versus hardcoded frame 150 in render/audit; frozen-but-unvalidated replay; checksum-consistent invalid handoff/penetration; collision events observed between output frames.
3. Repair confirmed failures with regression tests and explicit errors; retain all FAIL attempts. Verify output/provenance paths and actual negative media audit.
4. Run full root, production and M4 suites on final executable source. Render both OFF/ON for default and a second valid short configuration, then independently decode/verify actual media and contacts after production.
5. Publish source-bound videos, comparison images, editable inputs and concise report. M4 remains READY_FOR_USER_REVIEW until explicit owner acceptance.

Status: IN_PROGRESS. Recorder attempts use U2 only as the evidence namespace, not as milestone progress.
