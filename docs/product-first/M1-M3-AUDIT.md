# M1–M3 audit — 2026-11-16

Reviewer: delegated-agent. Scope: latest M3 branch 73adc256, including accepted M1/M2 ancestry. No M4 or change to core roadmap/art acceptance.

## Fixed audit plan

1. Re-run schema/IR/HTTP/storage and production contracts; inspect existing final CI and real media.
2. Challenge M3 save/import under delayed responses, invalid input and data round trips using actual Chromium. Preserve FAIL attempts before repairs.
3. Repair confirmed defects, preserve data-only validation and accepted rendering logic; add regression checks to CI.
4. Run full root/production regression on final source; render M1/M2/M3 evidence and perform separate post-result media/data audit.
5. Record exact source, test outcomes, limitations and media; hand off without self-approving aesthetics or advancing M4.

## Findings under test

- M3 late save response reapplies stale fields and can erase edits entered while saving.
- M3 JSON import projects only visible fields onto the previously saved document, losing imported prop identity and bypassing validation of discarded fields.
- Production workflow path filter omits the root M3 service/UI/harness that its native integration tests exercise.
- M3 RESUME/plan contain obsolete workbench-only statements after Studio integration.

Results: IN_PROGRESS. Logs and source snapshots: production/evidence/U2/*audit* (U2 is recorder namespace only).
