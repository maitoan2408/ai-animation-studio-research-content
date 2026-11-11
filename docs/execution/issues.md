# Issue ledger — vòng thực hiện production

Mỗi lỗi giữ log ban đầu, plan sửa, attempt kiểm lại và giới hạn. CLOSED chỉ khi
ca lỗi lẫn regression liên quan đã chạy; chưa chạy ghi OPEN/BLOCKED.

| ID | Phase | Vấn đề | Plan/expected | Evidence | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| EX-001 | Q2 | Native Three LoadingManager/HyperFrames readiness chưa chứng minh | Explicit readiness + timeout/error; slow/404/corrupt assets phải chặn | Research C03; test mới ở Q2 | OPEN |
| EX-002 | Q7 | QC hiện tại chưa chặn sai color/channel/loudness | Khóa media profile; probe + full decode + loudness; negative cases | Research E10/E11 | OPEN |
| EX-003 | F10 | Manim CE thiếu pangocairo | Chỉ mở khi pilot có shot giải thích; không bắt pipeline chính phụ thuộc | Research E12 | DEFERRED_CONDITIONAL |
| EX-004 | Q6 | Preview SVG không khớp audio envelope final | Preview dùng cùng shot/cue evaluator với final; parity test | Research C11 | OPEN |
| EX-005 | Q7 | Cache fingerprint và restore chưa đủ production | Hash dependency graph; fault/restore tests | Research C11/P9 | OPEN |
| EX-006 | Q1 | Neutral pose khuỵu, bàn tay nghỉ quay lên | Hip cao hơn trong IK reach, hand rest 180°, soles cố định | production/artifacts/Q1/draft-1/review.json | CLOSED — test + draft-2 review |
| EX-007 | Q1 | Contact styleframe lệch tay–cốc khoảng 31 px | Test cả hai anchor qua transform, sửa wrist từ anchor thật | production/artifacts/Q1/draft-1/contact.png | CLOSED — test + draft-2 review |
| EX-008 | Q1 | Eyebrow worried đọc thành angry, miệng profile lộ mép | Sửa art/mouth width, xem lại model sheet/close-up | draft-3 close/model-sheet được xem; art tests PASS | CLOSED |
| EX-009 | Q1 | Torso chưa có drawing riêng cho front/profile | Tạo variant + pivot/shoulder metadata, rig đọc metadata, kiểm pose cực trị | draft-3 model-sheet/rig-extremes được xem; 64 textures PASS | CLOSED |
| EX-010 | Q1 | uv venv dùng cache HOME chỉ đọc; pip chưa có interpreter | Tạo venv với --cache-dir /tmp rồi cài lại; không đổi quyền HOME | install-local-voice-retry-0389a2d8 PASS + voice-fixture PASS | CLOSED |
| EX-011 | Q1/Q5 | Không có khả năng nghe audio trong tool hiện tại | Giữ WAV/timing để nghe duyệt; kỹ thuật và viseme benchmark tiếp tục, không tự nhận voice production | Audio tool trả về unsupported input; Q1 gate | OPEN — listening review |
| EX-012 | Q2 | Extreme pose giơ tay che mặt | Khi author S06, đổi wrist arc/torso/eye-line; inspect frames trước khi polish | Q1 draft-3 rig-extremes | OPEN |
| EX-013 | Q2 | Blender software render chậm | Đo engine/sample/scene thật và native output; ghi chi phí, không suy từ README | Q1 smoke 320×320/64 samples 35.864 s | OPEN |
