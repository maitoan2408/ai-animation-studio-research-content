# Changelog

## Q2 follow-up review — 13/11/2026

- Reproduced EX-030: an older save response erased a new draft after switching revisions. Draft generation now guards clearing and the status identifies the saved revision/frame.
- Reproduced EX-031: a committed POST with a lost response, followed by refresh/retry, created duplicate notes. Retry retains the original ID/body across head refresh; definite stale-head rejection allows rebasing. A known commit remains clearly acknowledged if the next refresh fails.
- Added three real-browser recovery cases and CI coverage; all pass, along with the existing13 UI checks,19 workbench tests/typecheck and root verify16. Failed product reproductions and the initial harness syntax failure are preserved separately.
- Added a critical progress review with sampled-art observations, production limits and phase-by-phase next steps. Full motion/listening/handoff/performance gates remain open.
- Both GitHub workflows pass on source71213e9, including the new recovery step and standalone installation. Audit verifies210 completed attempts and162 source snapshots; raw failures and earlier results remain intact.

## Q2 container reproduction repair — 13/11/2026

- New standalone CI caught EX-029 before npm: Git refused container checkout ownership. Kept the actual failure and a local negative; fixed only the two read-only Git calls with trust for the exact authorized checkout path.
- Full workflow under simulated different ownership passes, followed by actual GitHub workbench run43329136529 including the standalone installation/review step. Global and wildcard Git trust are unchanged.

- Source headd82da6e passes both final GitHub workflows (workbench43329136529, v0.1run43329136433); expanded CI includes the standalone6command workflow. Latest audit verifies201 completed attempts and153source snapshots with no integrity error.

## Q2 standalone reproduction — 13/11/2026

- Reproduced EX-028 with a Git-only checkout outside the parent repository. Repaired12 transitive dependency locations while preserving exact direct pins and every package/version/tarball URL/integrity identity.
- Commit065a02c passes a clean-cache npm install, exact restoration of three videos, typecheck,19workbench tests, catalog/profile verification and13actual-browser checks. Kept failed attempts and added the QA runbook. Same-host reproduction does not replace the independent operator gate.

- GitHub workbench run43327652103 and v0.1run43327652106 both succeed for source head065a02c. Final checkpoint audit verifies198 completed attempts and150source snapshots; creative/handoff/performance gates remain open.
- Added the standalone Git-only reproduction to workbench CI, because the earlier full-repo CI passed despite EX-028. Its new run is tracked separately from the pre-change CI evidence.

## Q2 media/review checkpoint — 13/11/2026

- Added a working local review program: exact presented-frame notes, artifact/master/revision binding, strict rubric boundary, immutable journal, idempotent retry, stale-head handling, export/restart and desktop/mobile UI.19 workbench tests and13 browser checks pass; test reviewers are explicitly automated-test.
- Preserved failed color experiments; native full-range sRGB YUV420/CRF0 passes the unchanged chart threshold(max1≤3) and real-art samples. All3review sequences retain1152exactYUV frames and unchanged AAC/master/source. R2 idle playback has0dropped; loaded runs remain diagnostic.
- Added32MiB Git media parts, checked restoration/recovery,6profile tests and3bundle tests; full Python suite16passes. Original v0.1verify16/build/integration13/UI9 pass with old deliverables hash-identical. EX-024–027 fixed within their recorded scope.
- Added workbench CI and current runbook/resume/phase summaries, keeping previous histories and failures. Q2 remains open for real listening, full-motion rubric, independent handoff and then3cold+5warm; Q3–Q9 not started.

## Q0 — bắt đầu thực hiện production theo ủy quyền

- Khóa brief paper-cut/multiplane, pilot 72 giây, sáu shot/48 giây, rubric và output profile.
- Baseline verify 16 tests PASS; brief gate PASS. Chưa đóng gate art/motion Q1/Q2.
- Thêm recorder lưu request trước chạy, log/result riêng mỗi attempt và source hashes; có RESUME/state/issue ledger.
- Review ghi delegated-agent theo quyền người dùng giao; không tạo approval giả dưới tên người dùng.

## Nghiên cứu toolchain và kế hoạch mở rộng — 11/11/2026

- Đối chiếu Word/PDF, kế hoạch P0–P11/Q0–Q9, code và evidence; công khai phạm vi đã đọc và phần chưa kiểm chứng.
- Đọc source/version/license Three r187, HyperFrames 0.9.33, FFmpeg 7.1.5, Manim CE 0.22.1 và ManimGL 1.7.2; giữ source evidence tách runtime results.
- Chạy lại verify 16 tests, HF seek/missing asset 0.9.30/0.9.33, demo Three upstream và FFmpeg alpha/color/loudness trong môi trường nghiên cứu. Lưu cả lỗi setup, encode thiếu tags và kết quả kiểm lại; Manim render chưa chạy do thiếu dependency.
- Ghi errata audio demo là AAC stereo; PCM mixer mono. Giữ nguyên video và hồ sơ bàn giao cũ.
- Bổ sung kế hoạch chi tiết Q0–Q9, 11 nhánh tương lai, test plan/backlog/gates và quyết định trước code; chưa sửa ứng dụng/dependencies hoặc đóng gate production.
- Markdown là nguồn chính; kèm source/environment/input manifests, log, artifacts nhỏ và hướng dẫn tái lập.

## Nghiên cứu chất lượng production — 11/11/2026

- Đọc source ở commit cố định của OpenMontage, Lemo-Opuscar, ClaudeAnimationBase và các công cụ liên quan; ghi rõ mức bằng chứng, license và giới hạn.
- Lập phân tích hình/acting/rig/camera/composite, sáu shot thử, rubric, hai vòng sửa và kế hoạch Q0–Q9 nối đủ P0–P11.
- Có bản Word để duyệt, Markdown nguồn và manifest khảo sát. Chưa sửa ứng dụng hoặc dependencies, chưa chạy benchmark/backend/model mới; giữ nguyên báo cáo và evidence cũ.

## 0.1.0 — bản nội bộ chờ duyệt, 11/11/2026

- Bắt đầu dự án studio nội bộ dựa trên báo cáo đã thẩm định.
- Lưu fixture thực nghiệm, log và các lỗi missing-asset đã tái hiện.
- Thiết lập kế hoạch theo mốc và quy tắc phát triển/review.
- Scene schema strict, offline planner, immutable revisions và optimistic conflict.
- Rig SVG procedural với ba styles, năm actions; voice VI/EN nháp, WAV normalize, frame mixer; HyperFrames strict và decode QC.
- Queue một worker, attempts/cancel/retry/reopen, cache verify hash, review theo artifact/revision, portable packages.
- Web UI tiếng Việt, CLI; sửa mobile grid overflow và giữ bằng chứng lần lỗi.
- Clean checkout PASS: 16 tests nhanh, 13 integration checks, 9 browser checks; pilot 13 giây/312 frames 1080p.
- Thêm runbook, API/capability docs, sáu skill contracts, đối chiếu đủ P0–P11, dependency notices/BOM và CI.
- Chưa duyệt art, chưa tích hợp LLM/phoneme lip-sync, chưa vận hành multi-user/production; các gate giữ mở trong roadmap.

## Production Q1 technical checkpoint — 2026-11-12

64 native SVGs, three body views, rig extremes, texture integrity and hand/prop
contact verified. Q1 draft-3 preserves new art beside prior drafts. Blender/Three
rendered real alpha art. Pinned local Kokoro voice fixture generated; listening
review remains OPEN (tool cannot hear). Q2 technical preflight starts with this
fixed fixture; no production voice/motion approval claimed. See execution state.

## Q2.1 checkpoint — 2026-11-12

Pure six-shot evaluator (1152 frames), independent actual-anchor contact/stance
checks, explicit texture readiness, Three + actual HyperFrames seek verification.
6 load cases and 48 captures/36 repeat comparisons PASS after fixing fixture entry
EX-014. Blocking render and native Blender comparison still in progress.

## Q2 blocking + native handoff — 2026-11-12

12 actual 1080p A/B clips, 2,304 frames total, technical QC PASS. Kept initial
blocking/rejected VSE takes. Fixed walk deceleration and native VSE flip; added
Blender exception exit guard and exact source snapshots for new attempts. Native
six-shot package includes relative hashed textures and source frame JSON. Full
creative/polish/edit gates remain open; no production release claim.

### Correct native package replay claim

First fresh-path replay failed EX-019 (missing textures after Save As path remap).
Preserved failed package, repaired destination-relative paths, and verified the
new package in a fresh path/process: 52 hashes and 6 S05 frames match pixels.
The earlier commit subject said "verified" prematurely; the test logs and this
correction are authoritative. Independent operator handoff remains pending.

## Q2 polish/edit-source checkpoint — 2026-11-12

Separate 117-asset pack adds soft paper/contact shadows without changing the
original64 assets. Added deterministic R1/R2 authoring, longer local voice,
fixture hash guards and edit-locality tests. Polish videos are in progress;
no full creative gate or edit-round completion claimed. Fixed stale target-player
seek diagnostic with byte-range serving and actual presented-frame verification.

## Q2 media and sequence checkpoint — 2026-11-12

Six native polish clips and four selective edit clips completed technical QC.
Added picture-preserving sequence assembly, exact PCM timing and all-frame
verification; fixed rejected mono/stereo assumption. Visual review caught a
persistent crouched walk despite planted-foot tests; new regression failed then
passed after reach-derived pelvis correction. Replacement S02 media in progress.

## Q2 review package — 2026-11-12

Completed the replacement upright S02, two selective B-VSE edit rounds and three
48-second sequences. All selected decoded frames match; PCM offsets and AAC
transport lag are verified. Fixed low benchmark voice level from original PCM:
all three AAC deliveries measure −16.02 LUFS with true peak below −1.9 dBTP.
Preserved pre-gain versions and every rejected attempt.

Final native package verifies 70 dependency hashes and exact random-seek pixels;
a native camera note survives save/reopen without modifying its source. Published
before/after scope, frame/playback/color diagnostics, integrity audit and phase
summary. Color display, complete perceptual/acting review, independent handoff
and post-art cold/warm samples remain open; Q3–Q9 are not marked complete.
