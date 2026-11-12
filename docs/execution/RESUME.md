# Điểm tiếp tục — production Q0–Q9

- Branch: `codex/production-q0-q9`; baseline `6862c9e`.
- Chỉ thị hiện hành của người dùng: thực hiện từng giai đoạn, kiểm thử từng bước,
  lập plan/sửa lỗi tự động, toàn quyền quyết định, đẩy Git và lưu log sau mỗi bước.
- Phạm vi đã được phép: chọn brief/art/backend, viết prototype/harness và code
  sản phẩm theo gates; không cần hỏi lại các quyết định triển khai thường lệ.
- Các quyết định nghệ thuật do agent thực hiện theo ủy quyền phải ghi đúng reviewer.
  Không tạo review dưới tên người dùng. Không tuyên bố có người độc lập đã xem phim.
- Giữ ngân sách dịch vụ trả phí bằng 0; dùng môi trường/công cụ local có sẵn.

## Trạng thái gần nhất

Q0 DONE_DELEGATED: brief/rubric/source references khóa, 16 app tests + brief gate PASS.
Q1 TECHNICAL_READY_REVIEW_PENDING: 64 SVG, draft-3 và textures/hash/IK/typecheck PASS;
Blender + Three thực sự render được, local voice đã tạo và kiểm dữ liệu.
EX-006–010 đã đóng. EX-011 nghe duyệt voice còn mở vì tool không hỗ trợ audio input.
Q2 IN_PROGRESS ở phần hợp đồng kỹ thuật, chưa có six-shot video/gate mỹ thuật.
Q3–Q9 chưa bắt đầu. Không coi technical ready là Q1/Q2 hoàn thành toàn bộ.
Nguồn trạng thái máy đọc: [state.json](state.json). Các phase và điều kiện đầy đủ:
[kế hoạch](../toolchain-future-plan.md); snapshot này không bị sửa lại thành DONE.

## Lệnh tiếp theo

```bash
git status --short --branch
cat production/evidence/Q0/gate.json
cat production/brief/Q0-brief.md
```

Tiếp tục Q2.1: explicit asset readiness/hash/timeout + random seek adapter Three/HF.
Sau đó Q2.2 action evaluator cho sáu shot; kiểm contact/ground độc lập trước render.
Blender Eevee smoke 320×320 mất 35.864 s; đo cấu hình full scene trước batch.
Q1 voice fixture cố định dùng cho đối chứng kỹ thuật; nghe duyệt vẫn mở. Không
đóng gate âm thanh bằng kiểm PCM hoặc cho rằng AI đã nghe. Dependencies workbench
đã khóa; textures generated trong production/out/art-q1, có lệnh tái tạo ENVIRONMENT.md.

## Quy tắc phục hồi

`request.json` được ghi trước process. Thiếu `result.json` = INCOMPLETE, không phải
PASS; giữ thư mục và tạo run mới. Không chạy lại vào artifacts/logs cũ. Nếu remote
đã có checkpoint mới, đọc delta trước khi tiếp tục. Tiến độ test tự động không đóng
gate hình/chuyển động nếu chưa có media và review tương ứng.

### Q2.1 checkpoint

Explicit readiness 6 ca + 48 HyperFrames captures (36 repeat comparisons, gồm
browser mới) PASS; EX-001/014 đóng. Entry /index.html đã sửa, fail log giữ nguyên.
All 1152 frame geometry/contact/stance tests PASS. Six-shot A blocking 640 đang
render ở run `six-shot-blocking-a-retest`; xem result trước rerun. Tiếp: review
blocking, bổ sung test/sửa EX-015 giảm tốc bước cuối, native Blender B samples.

### Q2 blocking checkpoint — 12/11/2026 (thay các next steps cũ ở trên)

12 native 1080p clips A/B đã PASS frame/profile/decode. A lấy S02 từ take
2026-11-11T23-44-36-157Z-1920-43ae6ea7, các shot khác từ
2026-11-11T23-48-27-176Z-1920-9a530ebc. B mapping: out/b-r0-selection.json.
B six-shot portable native bundle và clips đã chọn vào artifacts/Q2/blocking-r0.
EX-015 giảm tốc, EX-016 exception exit, EX-017 mirror đã sửa/retest; EX-018 bóng
mềm/tiếp đất đang mở. Tiếp Q2 polish pack riêng (không ghi đè blocking), R1/R2,
performance/handoff/review trước Q3. Q1 voice listening vẫn chờ nhận xét người dùng
qua câu hỏi async đã gửi; không hỏi lại quyền triển khai. Xem COMPLETED.md.
