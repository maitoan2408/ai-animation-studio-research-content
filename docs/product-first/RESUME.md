# Product-first resume checkpoint — M1 technical gate completed 2026-11-15

## Source of truth / strict sequential execution

- Approved roadmap: [ROADMAP.md](ROADMAP.md); machine state: [STATE.json](STATE.json).
- **M0 ACCEPTED** by owner (13-sec baseline demo).
- **M1 READY_FOR_USER_REVIEW**, not yet ACCEPTED. Do not start M2 before explicit owner approval.
- Working branch `codex/product-first-m1-animation-ir` (PR #9), stacked on M0 accepted branch.
- Never merge/force-push or auto-approve creative work.
- For all stages: implement → independent QA → correct findings → **repeat entire regression on final code HEAD** → inspect actual MP4/PNG → only then request owner acceptance.

## What M1 fixed and verified

- Camera center corrected to stage (960, 540) with pan/zoom test and real native Three frames.
- Strict bounded AnimationIR with puppet model/rig, authored scene camera, art-pack version, SHA-bound prop and contact-anchor references.
- Actual IR evaluator creates stage background, two rigged actors Mai/An with animated head, joints, prop lantern with anchor/verified hashes. Renders directly through trusted WebGL Three backend, no fixed S01–S06 benchmarkFrame path for the IR fixture.
- Root preview uses the same IR compatibility validation as video compiler; existing legacy projects still work unchanged.
- Reverse-seek image and stage-state hashes, cross-viewport normalized state parity, full MP4 decode, 4 native 1080p stills, contact sheet.

## Mandatory final QA evidence (all SUCCESS)

Source implementation commit: `2b28317bbf15550204ebef1952b3938c222bb5f0`.

- Root CI: https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43710867218
- Production CI: https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43710867255
- Production review artifact `q2-workbench-79` (ID 14160368449, expires 2026-11-29): `product-first/m1/m1-ir-production-640.mp4`, `m1-ir-production-contact.png`, `m1-final-native1080-frame-36.png`, `manifest.json`; exactly 72 640x360 24fps silent frames.
- Real video SHA256: `15e228280f0fa634bc772288c785b4fa3be7d9946390ff39d3a27a369f540da0`.
- Root compatibility artifact `paper-studio-101` (ID 14160815154, expires 2026-11-29) contains legacy vs IR A/B MP4 and voice parity.
- Source SHA in final manifest is correctly linked to PR HEAD, while synthetic workflow merge SHA is separately recorded.
- Independent human-visible visual inspection of 1080 still and contact verified visibly framed stage; no artistic approval presumed.

## Owner acceptance outstanding

Present playable actual GIF, linked MP4 and native 1080 still in chat. Ask owner to accept or request visual adjustments. M1 demo is technical 3-sec silent 640p; not a M2 product. M2 only starts after owner explicitly accepts M1.

## Subsequent M2

Create a genuinely new 20–30 sec 1080p /24fps voiced film with >=3 shots, editable scene timeline, export/reopen and revision proof. Motion/physics skill quality are M3/M4. Preserve all previous V2 evidence and PRs.
