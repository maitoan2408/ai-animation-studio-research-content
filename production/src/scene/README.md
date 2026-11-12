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
