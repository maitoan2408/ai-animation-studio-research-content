# Đóng góp

Đọc AGENTS.md → plan.md → architecture → skill liên quan. Giữ evidence mốc đã pass.

1. Mô tả input/revision/profile, expected/actual và log.
2. Sửa đúng module; không đặt domain logic vào UI.
3. Chạy format/verify; integration khi đổi render/audio/state, UI test khi đổi API/UI.
4. Cập nhật capability/plan/verification/changelog; không sửa ngưỡng để che lỗi.
5. Commit/push branch; PR ghi test thực và NOT_RUN. Người dùng duyệt trước merge.

Không commit runtime data, secrets, node_modules/cache. Asset cần nguồn/quyền rõ. Giữ nguyên Word/PDF và SHA256SUMS gốc.
