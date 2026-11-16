# M5 — Director Agent implementation and QA plan

**User authorization:** 2026-11-17 — Begin M5 while user defers review of M4. This explicitly authorizes M5 development only; it does NOT accept M4, override unrelated safety constraints, merge PRs or authorize M6. Baseline: M4 draft head `081ee51cf7fb95ca1defe5f772449c5a7cf275a5`; target branch `codex/product-first-m5-director`; draft PR must target the M4 branch and remain unmerged until owner gate.

## Goal
Build an *executable bounded Director* that receives Vietnamese/English script, derives and validates a versioned task graph, previews the graph and calls **real internal Studio skill executors**. This is a deterministic offline planner/orchestrator, not a claim of general-purpose LLM story comprehension. Users explicitly approve a compiled plan before execution. Unsupported capabilities, directives, unsafe actions or stale revisions must fail closed; never generate/evaluate JavaScript from story text.

## Architecture and IO
`script + style + language + voice + profile → planScript() + strict capability registry → DirectorGraph (data, SHA-256 receipt, exact dependencies) → user plan confirmation → Studio.create → optional Studio.voice → Studio.enqueue/wait/retry → verify saved artifact QC, content SHA and revisions → DirectorReceipt`.

- **Plan executor**: validated `director-m5/1` input/graph schema, deterministic graph SHA, explicit root Studio capability registry; supported action and camera IDs are from current root `domain.ts` only (M3/M4 remain separate workbench skills, never pretended to be automatically invoked by this root Studio output). Off-line inference notes must be surfaced before user approval.
- **Skill execution**: `script-to-scenes` uses existing `planScript` & `Studio.create`; `prepare-audio` invokes real `Studio.voice` to generate local eSpeak draft; `render-review` calls the existing queued Studio renderer and verifies artifact SHA/QC on disk. Every task node has a parent/dependency. No automatic artistic approval.
- **Revision binding**: immediately after create, compare project spec to compiled plan; before and after rendering verify immutable expected revision and refuse stale human changes. Human edits remain stored and are never overwritten by the Director. A user may create a new plan or render their own revision in existing Studio.
- **Retries & recovery**: a bounded single render retry only for explicitly transient renderer failures; no retries on malformed input, stale revisions, revoked assets, or authorization. Return structured failed receipts/trace, not false PASS.
- **UI**: localhost `/director` with script input, task-graph nodes, manual approve/run, progress, video and output digest. No innerHTML/eval; same-origin/host checks as Studio. Existing storyboard and Character Motion workspaces stay intact.

## Acceptance matrix
1. Two distinct *fresh* scripts (not M0–M4 golden media) each produce valid editable source, genuine 1920×1080@24fps native final MP4 and optional local voice (with checked 48kHz audio). At least two different action/camera/story orders; do not hardcode scene IDs in Director code.
2. Real native Chromium screenshots of planned task graphs for both scripts, success/failure demonstration UI; user-visible preview/final parity is grounded in Studio and video hashes.
3. Typed graph contract: unique step IDs, acyclic exact dependencies, approved capability registry and content SHA; reject corrupted graph, unknown/unsafe actions, missing/duplicate nodes, unexpected keys, unsupported camera/style and unsupported execution semantics.
4. No automatic approval, execute only after explicit confirmed plan; stale input/revision and concurrent operations fail safely. Render failure/retry/recovery tested with injected renderer fault and actual state-machine attempts.
5. Provenance records input/plan/source SHA, revision IDs, final video SHA, frame/fps/dimensions/audio checks and exact CI run/commit, with no credentials or giant binaries committed.
6. After actual products exist: independent second-pass audit of both MP4s, contact/screenshot review, error demo, full decode + audio checks, source/artifact hashes, and **full root+production+M4 regression on final implementation HEAD**. If failed: reproduce → fix → add test → rerender → reaudit → full regression.
7. Mark `READY_FOR_USER_REVIEW` only when every M5 technical/media gate passes. Never change M4 acceptance. Owner only may set M5 `ACCEPTED`. No M6, merge or force-push.

## Explicit scope boundary
The root M2 Studio renderer currently supports `idle,wave,walk,pick-up,talk` and `static,pan`. M3 native rig and M4 rigid-cup physics are distinct backends, not silently interchangeable with root M2 output. The Director must document the exact executor it uses and refuse any attempt to label root videos as M3/M4 physics demonstrations. No external paid APIs, generalized semantic LLM planning, new art generation or perfect acting/voice is claimed. Building a test video is evidence of the **program's** capability, not the entire product goal.
