
# G3 R2 — Reusable Visual Interaction, Support & Joint Quality

Owner corrective feedback: two real screenshot outcomes do not pass G3 artistic/product gate. This is an **implementation brief**, not acceptance. Branch codex/m6-unified-integration-20261118, Draft PR #22. No main merge, locked art edit, force push, paid API, G4 transition, or no-op CI claiming success.

## Evidence and limitations

- Verified source at request: 0606654b508f4362dcdbe56331270a4b47c97bdd, 7/7 workflow SUCCESS. Native A/B films right-cup An and left-lantern Mai, release at frame 64. Source pinning, FFprobe and full decode previously passed. The owner screenshots lack pinned frame numbers. An open palm and unsupported-looking object can be physically valid during a brief post-release fall, but not indefinitely or after resting. We must inspect states rather than invent solver bugs.
- The current cutout rig uses correct IK endpoint markers but visually exposed joint seams. Anchor QA verifies transformed grip coincidence and z, not perceptual grip silhouette. Source art has cup grip (77,42), support (43,90); lantern grip (80,9), support (80,195); workbench top (176,31). Blue prop is a lantern, not a handbag. Keep all original asset SHAs and legacy goldens intact.

## Finite implementation gates

1. **R2.0 — Source-frame forensic mapping:** mark held frames, falling frames and post-contact support frames. Inspect actual prop world support anchor, rendered surface and clip state at screenshot moments. Do not demand contact during a valid short fall.
2. **R2.1 — Generic visual support contract:** implement a source-bound pure QA over any validated hand, prop with grip/support anchor and visible stage surface. Require grip/front-finger overlay and proper z while held, no hand–prop ownership after release, continuous falling trajectory, real supported/resting art geometry, no surface penetration or hovering at end. A physically correct collision may still fail optical readability; record that separately. Fail on malformed or missing support metadata, detached art or inconsistent state.
3. **R2.2 — G3-only reusable joint silhouette polish:** opt-in elbow/knee caps tied to actual adjacent asset endpoints, rendered using sampled colors from each model’s pinned native limb textures. No changes to baseline art pack or old renderer outputs. Schema and pure spatial constraints should ensure caps follow limbs every frame and preserve prop/hand z and ground.
4. **R2.3 — Action readability:** inspect real held→released→resting video and improve hand/contact or staging if legitimately deficient. No one-off cup/lantern z-index/position hacks or fake physics. Keep source-defined grip and bake.
5. **R2.4 — Adversarial tests:** both hands, two actors, varied prop and scale, mirrored facing, non-default duration/release, no-prop when applicable. Fail explicitly when injected hand/fingers drift, joint cover shifts, sole drifts, support is forged, physics receipt changes or source SHA is stale. Same-SHA M0–M6 and G1–G3 regression.
6. **R2.5 — New output + independent art:** render four current-source paired native 1920x1080/24fps MP4s and compare actual A/B, full FFmpeg -xerror decode, frame/still/manifest/source/bake SHA, every-frame ownership and support, dense critical frames and real-speed/half-speed player review when available. No artistic PASS from CI green alone. Owner alone accepts and only then can G4 begin.

Quality and efficiency: exact current SHA + artifact digest + independent method for every receipt, no repeated unchanged-SHA work. One writer, non-force CAS branch updates. Hourly existing schedule unchanged. G3 visual gate remains REWORK_REQUIRED until evidence and owner approval.
