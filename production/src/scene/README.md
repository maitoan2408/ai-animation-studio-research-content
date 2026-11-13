# Deterministic benchmark authoring

`benchmark.ts` evaluates integer frame→absolute sprites/markers/camera for six
locked shots. It never integrates previous frames. `rig.ts` maps the authored
SVG pivots/anchors into two-bone IK; `geometry.ts` independently reconstructs
actual rendered anchors for tests. Units/origin/rotation are in `types.ts`.

`polish.ts` decorates the same pose with separately authored soft masks and
floor shadows. It must not change original sprites, camera or contact markers.
The all-frame test enforces this for every one of the1,152 benchmark frames.

## Edit revisions

- `brief/polish.json`: baseline R0 + paper/contact shadows.
- `brief/edit-R1.json`: S01 concerned brows begin at12 instead of28 (blink22–25
  stays); head/eye-line−3 degrees; the new known voice fixture replaces both
  cue spans and WAV. S03 uses a separately authored teal cup drawing. All other
  shot states remain identical.
- `brief/edit-R2.json`: S04 pan amplitude70%; S05 receiver An reaction starts168
  instead of156, contact remains identical. Editorial order is a separate file.
- R2 is applied only to S04/S05 and combined with R1's S01/S03. Do not replace
  the whole sequence with R2-exported base voice/cup and lose the earlier notes.

These are trusted research fixtures, not a production input API/schema. Q4 is
responsible for validated persisted revisions and production dependency graphs.
Unit tests cannot decide if acting is good or the voice sounds natural.

## R3 S05 handoff readability

`brief/edit-R3.json` opts into `separateHandoffGrips`. Apply it to S05 only;
other selected takes remain R2's selection (including R1 S01/S03).
The existing lantern's SVG handle has left/right strokes at (51,25)/(110,27).
Their actual prop transforms define the two contact targets. `wristFor` solves
each wrist with its character facing and hand pivot; no limb scaling or image
offset conceals contact errors. Legacy configs retain the shared grip anchor.

At 1080p the two target points have 47.79 px horizontal separation during
frames 72–107. This is a geometric readability constraint, not a motion score.
The prop path, 192-frame duration, R2 reaction delay and camera remain unchanged.
On release, continuity checks use the wrist pivot: the replacement open-hand
drawing has different finger geometry and is no longer a constrained grip.

Run `tsx --test production/tests/handoff.test.ts` from the repo through the
recorder. Export with `export_frames.ts production/brief/edit-R3.json <new-dir>`,
then render S05 with that `BENCHMARK_INPUT_DIR`. Exporting all fixtures does not
authorize replacing the R1 voice/cup or rerendering other shots. Candidate
delivery and review evidence are in `production/artifacts/Q2/s05-r3/`.
