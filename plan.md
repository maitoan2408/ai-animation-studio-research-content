# Kế hoạch xây dựng Studio nội bộ

## Thực hiện theo ủy quyền — hiện hành

Người dùng đã cho phép tự quyết định, viết code, kiểm thử/sửa lỗi và push từng bước.
Trạng thái tiếp tục ở [RESUME](docs/execution/RESUME.md), [state](docs/execution/state.json),
[issue ledger](docs/execution/issues.md). Q0 đã khóa; Q1 art kỹ thuật sẵn sàng, còn nghe duyệt voice;
Q2 đã có 12 blocking clip 1080p, polish và hai vòng sửa B-VSE; ba sequence đã kiểm frame/audio/loudness. Màu trên player tham chiếu và công cụ review đã kiểm xong; motion/voice review, handoff độc lập và performance còn mở. [Tổng kết](docs/execution/COMPLETED.md).
Các mục nghiên cứu bên dưới là snapshot lịch sử, giữ nguyên kết quả.

Checkpoint13/11/2026: công cụ review local (`production/src/review`) đạt13 thao tác
browser và4 nhóm contract/API/recovery. V1 chart FAIL giữ nguyên; v2 từ PNG với
full-range/losslessYUV đạt chart max1 dưới ngưỡng3, ba sequence khớp1.152YUV frame
và AAC từng bản. R2 phát48s không có render đồng thời:0dropped. Đây là tiến độQ2,
chưa là hoàn tấtQ6/production hoặc thay thế rubric chuyển động và nghe thoại.
Kiểm Git-only sạch đã bắt và sửa EX-028 lock layout; commit065a02c đạt install,
restore3video, typecheck,19tests và13browser checks bằng cache mới ngoài cây repo.
[Bằng chứng](production/artifacts/Q2/fresh-review-20261113/README.md).

Review bổ sung13/11: EX-030/031 về mất draft và trùng note khi retry đã được tái
hiện/sửa; thêm3ca recovery,13ca UI cũ vẫn PASS. [Bản review](docs/execution/REVIEW-2026-11-13.md)
đề nghị ưu tiên review chất lượng từng shot trước các phase production còn lại.

## Tổng kết vòng nghiên cứu toolchain — 11/11/2026

- **Đã hoàn thành trong vòng nghiên cứu:** đối chiếu Word/kế hoạch/code/tests; khảo sát Three.js, HyperFrames, FFmpeg, Manim CE/GL và các ứng viên liên quan; chạy test/harness/CLI được phép; soạn kế hoạch chi tiết, backlog và đường quay lại khi fail.
- **Bằng chứng mới:** app verify 16 tests PASS; HF 0.9.30/0.9.33 seek và missing-asset; harness Three upstream ở 320×180; FFmpeg alpha/color/loudness. Lần encode thiếu color tags giữ FAIL, lần đổi cấu hình đã kiểm lại; Manim CE cài bị thiếu pangocairo, render NOT_RUN. Không suy kết quả fixture thành art approval.
- **Chưa thực hiện:** Q0–Q9 vẫn NOT_STARTED; A/B sáu shot, hai vòng sửa và chi phí/phút accepted chưa đo. Code, schema, dependencies ứng dụng và evidence cũ giữ nguyên.
- **Bàn giao:** [báo cáo tổng hợp](reports/Nghien_cuu_toolchain_va_ke_hoach_mo_rong.md), [Q0–Q9/F01–F11 và quyết định cần duyệt](docs/toolchain-future-plan.md), [verification/tái lập](docs/research/toolchain-verification.md), [nguồn/nhật ký đọc](docs/research/toolchain-reading-and-sources.md). Nhánh `codex/toolchain-research-plan` từ research snapshot `8e58ffc`.
- **Tiếp theo sau duyệt:** Q0 khóa art/motion target → Q1 chuẩn bị art pack → Q2 thử A/B Three/Canvas + HyperFrames và Blender; Q3 mới quyết định backend/code sản phẩm. FFmpeg dùng chung; Manim là nhánh shot giải thích có điều kiện.

## Cập nhật yêu cầu — nghiên cứu production, 11/11/2026

Người dùng đánh giá demo phù hợp nhưng chất lượng hình ảnh/chuyển động chưa đạt production; yêu cầu nghiên cứu công cụ/mã nguồn và lên plan trước, chưa code. Vòng mới đã có [phân tích](reports/Nghien_cuu_chat_luong_production.md), [kế hoạch Q0–Q9](docs/production-quality-plan.md), [sổ nguồn](docs/research/production-quality-sources.md) và [manifest khảo sát](docs/research/production-quality-evidence.json). Q0–Q9 **NOT_STARTED**; backend/model benchmarks mới **NOT_RUN**. Không coi phản hồi về demo là duyệt art target hay production release.

Các mốc/bằng chứng v0.1 bên dưới được giữ nguyên như snapshot bàn giao. Kế hoạch mới bổ sung cách hoàn tất chất lượng production và đối chiếu đủ P0–P11, không thay trạng thái đã đạt của prototype. Sau khi duyệt kế hoạch, bắt đầu Q0 → Q1 → Q2 trước khi chọn backend và mở rộng ứng dụng.

## Mục tiêu vòng prototype đã bàn giao

Mục tiêu bàn giao vòng đầu: chương trình dùng được từ kịch bản → phân cảnh nháp → chỉnh cảnh/audio → render → QC → review → export/reopen, có web UI và CLI. Người dùng sẽ duyệt sau khi chương trình và bằng chứng được đẩy lên Git. Phạm vi phong cách: paper-cut, multiplane và layered shadow-box theo báo cáo.

## Các mốc triển khai

| Mốc | Đầu ra | Gate | Trạng thái |
| --- | --- | --- | --- |
| M0 | Thẩm định, fixture, dependency lock, docs quy trình | Bằng chứng nghiên cứu lưu trong repo | DONE — các kết quả ở reports/ và validation/ |
| M1 | Domain/schema, asset store, revision và script planner | Unit/negative tests; conflict/hash/path tests | DONE — 7 tests đầu tiên PASS |
| M2 | Rig/evaluator, compiler HyperFrames, audio, renderer/QC | Video từ nhiều cảnh; thiếu asset bị chặn; frame/audio đúng | DONE — 3 styles; pilot 13 giây 1080p |
| M3 | Job queue, cancel/retry/restart, cache và review/export | Crash state, idempotency, review revision và import hash tests | DONE trong phạm vi một process; fault matrix production còn ở P9 |
| M4 | HTTP API, web UI và CLI | Luồng create/edit/render/review/export bằng browser + CLI | DONE — 9 browser checks PASS sau sửa mobile |
| M5 | Pilot kỹ thuật, sửa lỗi, cài sạch, tài liệu và CI | verify + integration + UI; artifact review được | DONE — clean install và CI thực đã PASS; UI sửa cuối đã retest |
| M6 | Push code/plan/evidence, PR để người dùng duyệt | Remote commit khớp local; hướng dẫn khởi động đầy đủ | DELIVERED_FOR_REVIEW — draft PR #1; người dùng chưa duyệt |

Chi tiết đầu vào, việc làm, ca lỗi và điều kiện dừng của từng mốc nằm trong `docs/phases/`. Mỗi mốc có commit riêng. Nếu gate lỗi: ghi lại bằng chứng → sửa nguyên nhân → chạy lại → cập nhật trạng thái. Không chuyển mốc chỉ vì đã viết đủ file.

**Không bỏ giai đoạn trong Word:** đối chiếu đủ P0–P11 và từng đầu việc còn lại tại [docs/roadmap-full.md](docs/roadmap-full.md). M0–M6 là các mốc prototype phần mềm. Những gate cần art pack, provider/model, pilot production hoặc người dùng duyệt vẫn ghi PARTIAL/NEEDS_REVIEW; không được suy ra đã hoàn tất từ demo 13 giây.

## Quyết định phạm vi vòng đầu

- HyperFrames 0.9.30 là backend sản phẩm đầu tiên; quyết định có thể đổi khi fixture production cung cấp bằng chứng mới.
- Có planner offline dựa trên quy tắc để tái tạo luồng mà không cần API key. Đây là bản nháp, người dùng sửa/duyệt được; không quảng bá như hiểu và diễn xuất mọi kịch bản.
- Asset/rig bằng code có phong cách thống nhất và action hữu hạn. Voice nháp local hoặc WAV do người dùng nhập. Âm thanh, cue, độ dài và metadata được lưu theo phiên bản.
- Chạy một worker, state/files trên máy nội bộ, không dựng SaaS, distributed cluster hoặc nhiều agent ngay từ đầu.
- Review thực tế luôn gắn artifact hash và revision. Test tự động có thể kiểm endpoint review bằng reviewer giả trong dữ liệu test; không thay sự duyệt của người dùng đối với demo bàn giao.

## Sau vòng duyệt đầu

G1 production theo báo cáo thẩm định vẫn cần asset nghệ thuật thật, corpus thoại và ba shot 1080p được duyệt. Các giai đoạn tiếp theo: action/rig nâng cao; planner AI có credentials và evaluation; cache theo shot; nhiều dự án/worker; pilot nghệ thuật và đo chi phí trên phút được duyệt. Các mục này có backlog và không bị gộp vào trạng thái DONE của MVP.

## Bằng chứng mỗi mốc

Ghi command, phiên bản, exit status, input/output hash và giới hạn trong `docs/verification.md`. Các artifact nhỏ dùng để duyệt nằm trong `artifacts/`. Phiên bản runtime và bước cài nằm trong README và `docs/reproduction.md`.

## Điểm bàn giao

- Branch: `codex/studio-internal-mvp`.
- Draft PR: https://github.com/maitoan2408/ai-animation-studio-research-content/pull/1
- Review chương trình/demo theo `docs/review-checklist.md`; kế hoạch production đầy đủ ở `docs/roadmap-full.md`.
- Word/PDF gốc và evidence các mốc đã hoàn thành được giữ nguyên. Bản Word bàn giao mới nằm trong `reports/Ban_giao_Studio_noi_bo_v0.1.docx`.

### Checkpoint Q1 — 2026-11-12

Art/rig/environment technical inputs are ready (64 SVG); Q1 voice listening is
still open. Q2 technical contracts now in progress. Full phase gates are tracked
in `docs/execution/state.json`, not inferred from this checklist.
