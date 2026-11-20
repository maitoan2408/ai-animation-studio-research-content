---
name: director
version: 1
---
# Bounded Director — operational skill and real executor

**ID:** `director-m5/1`. **Executor:** `src/director.ts`; **UI:** `/director`, `web/director.js`; **Service:** `src/server.ts`. No hypothetical or prose-only skill: `planDirector()`, `validateDirectorPlan()`, `executeDirectorPlan()` and `DirectorService.run()` call actual `Studio` methods.

**Input:** strict `{title,script,style,language,profile,voice}`. Script scenes are separated by blank lines, with optional `[action=...; camera=...; seconds=...]` directives. Only root Studio's currently implemented `idle,wave,walk,pick-up,talk`, `static,pan` and known styles are allowed. Heuristic inferred actions are explicitly described in plan notes and require user approval. Root Studio is not the M3 native rig or M4 native physics pipeline.

**Output:** SHA-bound `DirectorPlan` with full validated storyboard and exact acyclic task graph (scenes → voice if requested → render → verify); after explicit approval, one actual editable Studio project and a `DirectorReceipt` binding plan/revision/job/MP4 SHA and QC. Every node maps to a specific executable `Studio` action. No review record or artistic PASS is written.

**Guards:** strict reconstructed graph, schema and SHA binding, no arbitrary JS or external keys; one active Director run, SHA-bound idempotent recovery of completed plans, render retry only for `RENDER_TEMPORARY`, `PROCESS_FAILED` or `WORKER_INTERRUPTED`, never retry unsupported/invalid inputs; fail closed if project revision changed by a human. Do not overwrite authored changes or assume a browser/user approved a rendered film.

**Verification:** `tests/director.test.ts` negative/security/ownership/retry tests. **Current limit:** no film renderer is connected to the Studio (roadmap G4), so the render node fails closed with `RENDERER_NOT_CONFIGURED` and no receipt is produced until G4.
