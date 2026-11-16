# Physics bake workbench

This module implements the measurable U3 spike; it is not the application v0.1
planner or a production backend selection. Run from repo root:

```bash
npm --prefix production ci
python scripts/run-step.py U3 physics -- npm --prefix production run physics:spike
python scripts/run-step.py U3 hero -- npm --prefix production run quality:hero
python scripts/run-step.py U3 contracts -- npm --prefix production run test:physics
```

`engines.ts`: Planck1.5.1 vs Rapier0.21.0 deterministic-compat, exact package lock.
`measure.ts`: independent raw position/velocity measurements vs locked analytic
criteria. `spike.ts`: two runs per engine, report and raw data in a unique out
folder; reference hash checked for Rapier. `hero.ts`: kinematic hand plus dynamic
lantern, fixed240Hz, ten substeps per 24fps sample. `bake.ts`: strict payload/hash,
finite ranges, contiguous192frames, immutable replay, events and input binding.

Units: physics metres / y-up / radiansCCW; stage1920×1080 / y-down / degreesCW.
200stage pixels=1metre, camera projection measured separately. Lantern's light
anchor [80,116] is the declared COM; mass0.6kg, rectangle half-extents[.246,.267]m,
angular damping2.4. This is an art-directed approximation; no measured real prop
inertia. Hand anchor[110,27] is 0.09m right /0.267m above COM. Body is unlocked
only after frame107; dual grip and all prior poses keep exact R3 data. Physics
acts on the prop; primary acting/camera/reaction timing remain R3.

Raw drop penetration first failed strict0 for both engines. Preserved baseline
report: Planck3.242mm / Rapier1.094mm. Rapier's declared2mm contact skin repaired
this fixture to0penetration without editing output samples or relaxing limits.
It changes the collision envelope: evaluate any visible hovering before a new
scene uses it. Planck remains an engineering comparison, not strict0 accepted.

Frame consumers load a validated BakeFile; seeking never advances a simulation.
No cache hit silently accepts changed input/art/hash. NaN, wrong fps, changed
frames, missing events, wrong art and detached physical joints have rejection
tests. Event intensities are authored cues for future foley, not measured
collision impulses or evidence of finished sound design. Critic metrics are
not an artistic rating. No cloth/hair/body collision solver is implemented.

## Execution binding (14 November)

New hero envelopes retain the exact old `data`/motion SHA and add `binding`.
The execution SHA binds that data/input to gravity,240Hz, solver iterations,
engine/algorithm, package lock SHA and source hashes of the simulation modules.
`heroFrame` checks the expected recipe before sampling; a gravity/source/lock
change rejects an old receipt instead of treating input geometry alone as enough.
Physics configuration is passed explicitly to both bake and replay. No mutable
global gravity is consulted while baking. The current motion golden is unchanged.

`validateBake` and three-argument `sampleBake` retain historical payload inspection.
An unbound archived bake is refused by the new hero adapter until rebuilt with
the expected recipe. Never invent a receipt for old media without reproducing
its exact input/configuration. The QA workflow compares new input/data to archived
input/data before reporting preservation. This is provenance binding, not signing
against a malicious local user or proof of aesthetic quality.

Cross-runner golden hashes lock exact inputs/engine. Runtime logs retain host,
Node/platform and package lock SHA. Matching local/CI Linuxx64 establishes only
those runs, not every architecture. Do not update a golden to hide unexplained
failures: preserve attempt, explain input/solver change, compare analytic gates.

## M4 generalized product adapter (new; does not alter locked S05 hero contract)

`m4.ts` is a bounded production physics input/recipe/bake/replay system for versioned M3 authored cutout motion with one cup grip/release and a flat physical platform. Parameters (mass/gravity/damping/friction/restitution/initial velocity/collider/floor) are validated from data. It simulates with Rapier 0.21.0 at fixed 240Hz/24fps (10 substeps), SHA-binds exact input/art/recipe/package lock/implementation, and replays frozen frames on arbitrary seeks. Unsupported rigs, duplicate contacts, stale bakes, tampered frames and non-finite values reject. `m4-adapter.ts` updates only the prop transform and contact marker after the actual M3 release; all authored actors and camera remain M3-owned.

`M4_PROJECT_FILE=/path/to/m4-project.json npm --prefix production run physics:m4` renders two native Three/Chromium 1920x1080@24 films (OFF/ON), source/bake JSON, real stills, chronological sheets and side-by-side comparison. `npm --prefix production run physics:m4:audit` independently validates real media and collision/grip/ownership metrics after render; `npm --prefix production run test:physics:m4` tests two distinct scenarios and hostile data. M4 technical claims require successful final-head CI; do not infer human art approval from geometry metrics. Rapier collision skin is a **declared 2mm proxy**, not visually measured perfect contact across every pixel. No generalized cloth, hair, third-party arbitrary art/rigs or simultaneous multiple-body constraints.
