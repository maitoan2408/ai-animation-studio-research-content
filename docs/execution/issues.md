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
