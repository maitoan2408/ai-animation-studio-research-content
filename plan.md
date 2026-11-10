# Kế hoạch xây dựng Studio nội bộ

Mục tiêu bàn giao vòng đầu: chương trình dùng được từ kịch bản → phân cảnh nháp → chỉnh cảnh/audio → render → QC → review → export/reopen, có web UI và CLI. Người dùng sẽ duyệt sau khi chương trình và bằng chứng được đẩy lên Git. Phạm vi phong cách: paper-cut, multiplane và layered shadow-box theo báo cáo.

## Các mốc triển khai

| Mốc | Đầu ra | Gate | Trạng thái |
| --- | --- | --- | --- |
| M0 | Thẩm định, fixture, dependency lock, docs quy trình | Bằng chứng nghiên cứu lưu trong repo | DONE — các kết quả ở reports/ và validation/ |
| M1 | Domain/schema, asset store, revision và script planner | Unit/negative tests; conflict/hash/path tests | DONE — 7 tests đầu tiên PASS |
| M2 | Rig/evaluator, compiler HyperFrames, audio, renderer/QC | Video từ nhiều cảnh; thiếu asset bị chặn; frame/audio đúng | DONE — 3 styles; pilot 13 giây 1080p |
| M3 | Job queue, cancel/retry/restart, cache và review/export | Crash state, idempotency, review revision và import hash tests | DONE trong phạm vi một process; fault matrix production còn ở P9 |
| M4 | HTTP API, web UI và CLI | Luồng create/edit/render/review/export bằng browser + CLI | DONE — 9 browser checks PASS sau sửa mobile |
| M5 | Pilot kỹ thuật, sửa lỗi, cài sạch, tài liệu và CI | verify + integration + UI; artifact review được | IN_PROGRESS |
| M6 | Push code/plan/evidence, PR để người dùng duyệt | Remote commit khớp local; hướng dẫn khởi động đầy đủ | TODO |

Chi tiết đầu vào, việc làm, ca lỗi và điều kiện dừng của từng mốc nằm trong `docs/phases/`. Mỗi mốc có commit riêng. Nếu gate lỗi: ghi lại bằng chứng → sửa nguyên nhân → chạy lại → cập nhật trạng thái. Không chuyển mốc chỉ vì đã viết đủ file.

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
