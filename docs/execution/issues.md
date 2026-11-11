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

| EX-006 | Q1 | Neutral pose khuỵu, bàn tay nghỉ quay lên | Hip cao hơn trong IK reach, hand rest 180°, soles cố định | production/artifacts/Q1/draft-1/review.json | OPEN |
| EX-007 | Q1 | Contact styleframe lệch tay–cốc khoảng 31 px | Test cả hai anchor qua transform, sửa wrist từ anchor thật | production/artifacts/Q1/draft-1/contact.png | OPEN |
| EX-008 | Q1 | Eyebrow worried đọc thành angry, miệng profile lộ mép | Sửa art/mouth width, xem lại model sheet/close-up | production/artifacts/Q1/draft-1/review.json | OPEN |
