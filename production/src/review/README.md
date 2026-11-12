# Q2 local review workbench

Working instrumentation for Q2 review, separate from the v0.1 application and
the future Q4–Q7 production implementation. It does not choose a backend or
automatically close an art, audio, independent-handoff or release gate.

## Run

From the repository root, Node24/npm11, FFprobe/FFmpeg7.1 and the committed media:

```bash
npm --prefix production ci
python production/src/media/review_bundle.py restore production/artifacts/Q2/web-review-v2
npm --prefix production run review -- check
npm --prefix production run review -- serve
```

Open the exact printed `http://127.0.0.1:4311` URL in a current Chromium browser.
Only loopback is bound. This is a trusted local workstation tool, without user
accounts, TLS, remote-access configuration or an identity-verification service.
The pinned test browser is Chromium156.0.8078.79. No external APIs or paid services.

CLI options: `--root` fixes the media allowlist root; `--catalog` selects a JSON
catalog; `--data` selects a journal directory; `--port` selects the local port.
Defaults resolve from the module location, so commands work from another cwd.
Current default catalog is `production/artifacts/Q2/web-review-v2/catalog.json`.
The unchanged diagnostic v1 catalog remains available via `--catalog` for regression.
V2 review MP4s are restored from Git chunks, then verified before serving. Each
is about114MB; this is a local review profile, not a distribution bitrate preset.
Restoring only requires Python's standard library. No native rerender is needed
to review the committed media. The original BT709 masters are separate downloads.

Choose a revision, play at1×/0.5×, pause, then use the slider or arrow buttons.
The frame index is zero-based; shot intervals are `[startFrame,endFrame)`. Notes
bind to the actual presented frame from `requestVideoFrameCallback`, not merely
the requested video time. Pending seek/playback blocks saving. Shot changes clear
viewing/listening declarations; version changes reset the unsubmitted form.
Save an unfinished note before switching versions.

Reviewer role and viewing/listening declarations are self-reported. Accepted
requires the catalog color gate, all five rubric scores, total≥80, art/acting≥4,
normal+slow viewing, listening for a speech shot, no blocking issue, and a reason.
Passing this validation records an opinion; it never changes `state.json`.
Automated tests use a separate `automated-test` mode and isolated runtime data.

## Code map and boundaries

| Module | Responsibility |
| --- | --- |
| `domain.ts` | Strict runtime validation, timeline/rubric, canonical JSON, typed errors |
| `catalog.ts` | Path containment/realpath, SHA checks, FFprobe profile/timing validation |
| `journal.ts` | One writer, optimistic head, immutable hash chain, idempotent retry, fsync/rename |
| `server.ts` | Loopback HTTP, same Host/Origin, write token,16KiB JSON limit, verified Range206/416 |
| `cli.ts` | Serve/check/export without browser dependencies |
| `web/` | Authored plain HTML/CSS/JS; no evaluation or HTML rendering of review text |

| Endpoint | Contract |
| --- | --- |
| `GET /api/catalog` | Verified catalog, mode, per-session write token |
| `GET /api/reviews` | Current journal head and immutable records |
| `POST /api/reviews` | JSON + `x-review-token`; expectedHead and UUIDv4 requestId required |
| `GET /api/export` | Catalog and complete journal; `phaseApproval:false` |
| `GET/HEAD /media/:sha` | Catalogued review bytes, hash checked on every request, single byte range |
| `GET/HEAD /media/:sha/master` | Unchanged BT709 master download |
| `GET/HEAD /native` | Hash-verified native R2 ZIP |

POST input fields: `requestId, expectedHead, artifactId, masterSha256, revision,
shotId, frame, reviewer{name,kind}, decision, note, scores, observed{normalSpeed,
slowSpeed,listened}, blockingIssue`. Unknown fields, wrong artifact/master or
frame/shot binding, invalid scores and stale heads fail explicitly. Same request
ID with identical payload returns its original record; changed payload rejects409.
After stale-head409, reload the journal and review the new state before resubmitting.

## Persistence and resume

Default data: `production/out/review-data/` (ignored by Git). Each record is
`00000001-<sha>.json`; its hash includes sequence, previous hash, UTC time and
validated request. Snapshot/export returns copies, never mutable store references.
Writes serialize and acknowledge after file fsync → atomic rename → directory
fsync. Startup verifies the full chain and refuses corrupted or unexpected files.
Unfinished `.tmp` files remain as interruption evidence and are not published.

Use Ctrl+C/SIGTERM for a clean stop. A second writer is refused. After a hard kill,
`.writer.lock` intentionally blocks automatic takeover. Check its PID and confirm
that the previous process is stopped before moving that one lock **outside** the
journal directory; preserve it with the incident log, then restart. Never remove
a live writer's lock. Restore corrupted journals from an exported backup instead
of editing hash-linked records. No silent repair or overwrite is performed.

Export while running via the UI, or stop the server and run:

```bash
production/node_modules/.bin/tsx production/src/review/cli.ts export > /tmp/q2-review-export.json
```

This direct CLI command writes JSON without npm banners.
Back up the whole journal and an external export/head. Hashes detect modified
records and missing internal links; without an external head they cannot detect
deleting an entire valid suffix or maliciously rebuilding a complete chain.
Local file locks and fsync are not a distributed database guarantee.

## Reproduce verification

```bash
python scripts/run-step.py Q2 review-typecheck -- npm --prefix production run typecheck
python scripts/run-step.py Q2 review-tests -- npm --prefix production run test:review
python scripts/run-step.py Q2 review-ui -- npm --prefix production run test:review-ui
```

Tests cover domain rejection, idempotency, conflicting writes, lock, restart,
corrupt chain, traversal/symlink escape, actual media hash changes, byte ranges,
Host/Origin/token controls, frame seek/step, markup as text, two-window conflict,
version isolation, export and390px mobile layout. Browser test output includes
screenshots, report and a clearly labelled test-only journal under
`production/out/review-ui/<uuid>`. Successful playback is muted and is not audio
audition. Historical first failures are retained in `production/evidence/Q2`.
