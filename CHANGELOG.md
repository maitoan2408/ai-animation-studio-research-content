# Changelog

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
