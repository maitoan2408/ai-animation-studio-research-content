# Director M5 — how to run the actual program

The M5 Director is a **bounded offline planner and orchestrator over real Studio executors**, not a general-purpose language model or a generator that invents new assets. It never evaluates user-supplied HTML/JavaScript.

## Local UI
1. Install pinned root dependencies: `npm ci`. To run the native workbench separately, also `npm --prefix production ci`.
2. Start `npm run dev` or `npm run studio -- serve --port 4310`. Open `http://127.0.0.1:4310/director`.
3. Enter a script. Separate scenes with blank lines. To avoid unreliable keyword inference, explicitly set `[title=...; action=wave; camera=static; seconds=6]` at the beginning of a scene. Supported root Studio actions: `idle, wave, walk, pick-up, talk`. Supported cameras: `static,pan`. No orbit/fly/cloth/body collision.
4. Choose `paper-cut`, `multiplane` or `shadow-box`, Vietnamese/English, preview/final and optional draft eSpeak voice. Click **Lập task graph**. The validated graph and all compiled scenes appear with SHA-256.
5. Review the exact graph, then click **Xác nhận và tạo video**. Only this explicit action starts actual Studio project/voice/render/QC; an unsupported action rejects before any project is created. The saved revision and MP4 video SHA appear with the playable result. The main Studio can be used for human edits.
6. Reopening or resubmitting a completed identical plan rechecks the existing artifact and revision, rather than making a duplicate project. If a human has edited its revision, the Director refuses to publish over it; use the main Studio to continue or create a genuinely new plan.

## Data-only API
- `POST /api/director/plan`: `{title,script,style,language,profile,voice}` → `DirectorPlan` schema `director-m5/1` with `graph,notes,spec,specSha256,planSha256`.
- `POST /api/director/run`: `{plan,approved:true}` → `DirectorReceipt` schema `director-m5-receipt/1`, `projectId,revisionId,jobId,artifactId,artifactSha256,qc,tasks,receiptSha256`. Unknown/mutated graph, forged step dependencies, approval missing, concurrent run, changed human revision, invalid media QC or corrupted stored artifact fail closed. Actual generated project remains editable via existing Studio endpoints.
- `GET /api/artifacts/:id/video` remains the only authoritative local MP4 serving path (hash checked and byte-range supported).

## Real skill executor mapping
- `script-to-scenes` → `src/planner.ts` + `Studio.create`
- `prepare-audio` → `src/audio.ts` + `Studio.voice` (local draft; not human-approved)
- `render-review` → `src/render.ts` + `Studio.enqueue/wait/retry`
- `verify-artifact` → `src/store.ts` + full media checks and SHA on the saved output

**Scope boundary:** The root Storyboard Studio v1 compiler/renderer is distinct from the M3 native character workspace and M4 Rapier rigid-body workbench. The M5 root Director does **not** silently invoke M3 or M4 or claim their native animation quality. It composes only implemented root Studio skills. Richer cross-backend render composition needs additional explicit development and evaluation.

## Reproducible QA
`npm run verify`, `npx tsc -p tsconfig.m5.json`, `npx tsx scripts/m5-product-e2e.ts`, and `npx tsx scripts/m5-independent-audit.ts`. M5 workflows install local Chromium/FFmpeg and regenerate two distinct 18-second 1080p24 films with 48kHz voice and UI evidence, verify a denied action and final immutable source/artifact hashes. The independent QA is automated/delegated technical review, **never owner or professional artistic approval**.

**Owner safety:** User explicitly permitted M5 development while M4 owner review remains pending. PR #13 stays Draft/unmerged; M5 PR #15 is also Draft based on M4 branch. Do not mark M4 ACCEPTED, merge, or start M6 automatically.
