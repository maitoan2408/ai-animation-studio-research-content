# M6 native Director integration and independent acceptance protocol

This is a **capability-bounded** native animation workflow. Current source implements a
candidate integrated M6 path; implementation is not itself acceptance.

## Versioned architecture

- The M1–M5 Paper Studio and M5 Director retain their previous contracts and
  renderer. They are not silently replaced by M3, G3 or vice versa.
- A new opt-in `native-director/1` input binds narrative script and a typed,
  explicit `m3` or `g3` storyboard. **Narrative script is not interpreted as
  arbitrary motions.** Unknown actions, missing rig/prop capabilities, bad asset
  SHA, invalid IK, invalid physics and forged plans fail closed.
- The native Director compiles a SHA-verified task graph, saves an immutable
  revision, reopens and verifies it, invokes the actual M3/Chromium or
  G3/Rapier+Chromium executor, checks FFprobe/FFmpeg and media SHA, and publishes
  an idempotent receipt. No M2 fallback is permitted for a native request.
- The localhost Studio exposes separate
  `/api/director/native/plan`, `/api/director/native/save`,
  `/api/director/native/projects/:revision`,
  `/api/director/native/jobs/:revision`, and
  `/api/director/native/jobs/:revision/video` endpoints.
  POST jobs requires `{"approved":true}`; rendering runs in a separate
  worker and GET jobs reports status. Source data and receipts are stored under
  `director-native/`, separate from legacy revisions. Video responses recheck
  the media SHA before serving.
- Saved draft inputs are JSON. An edited storyboard gets a new immutable revision
  and does not overwrite an earlier approved user edit.

## Six-source scenario matrix

| ID | Renderer | Character | Motion and interaction |
| --- | --- | --- | --- |
| 01 | G3 Rapier | An | Right hand lifts/releases cup on drawn workbench |
| 02 | G3 Rapier | Mai | Left hand lifts/releases lantern on drawn workbench |
| 03 | M3 enhanced | Mai | Wave and head turn; no prop |
| 04 | M3 enhanced | An | Walk, stop, wave, head turn; no prop |
| 05 | M3 enhanced | Mai | Head turn + left-hand cup pick/place |
| 06 | M3 enhanced | An | Head turn + right-hand lantern pick/place |

The six authored JSON projects, native MP4s, frame SHA manifests,
contact sheets and independent second-pass reports are produced by
`npm --prefix production run native:director:demo`, then
`npm --prefix production run native:director:audit`.

## Required evidence and go/no-go conditions

1. All M1–M5 compatibility, G1/G2/G3, root API and native production tests must
   pass against **one exact final HEAD SHA**. A workflow marked SUCCESS is not
   enough without downloaded artifacts and independent review.
2. Six distinct native sources must produce six valid 1920x1080/24fps MP4s.
   Each revision, source manifest, art catalog, media and receipt must be
   cryptographically bound to the verified source. Random seeking, frame count,
   full decode and real contact/physics checks must pass.
3. The second auditor must inspect all actual media, chrono sheets and key
   interaction frames. Negative controls must be rejected, with no changed
   thresholds and no replaced accepted art.
4. A human reviewer must still check movement at normal speed and 0.5x,
   believable acting, silhouette/hand layering, pacing, storytelling, audio
   suitability, and visual polish. Technical tests cannot certify aesthetics.

## Capability restrictions

Only the registered production cutout rigs (An and Mai) and their supported,
SHA-pinned compatible props are demonstrated. G3 uses validated box/ball
collision proxies, not arbitrary deformable rigid bodies or accurate fingertips.
No generic natural-language story-to-rig solver, arbitrary character upload,
voice acting, lip synchronizer or auto-selected emotional acting is claimed.

**Release rule:** Never mark M6 completed until the exact final source SHA
passes full regression, the six genuinely different final videos are
re-rendered and independently reviewed, and G6 is ready for the owner's
own artistic acceptance. `userAcceptance = NOT_REVIEWED` until their decision.
Never merge main, move to M7 or delete historical failures automatically.
