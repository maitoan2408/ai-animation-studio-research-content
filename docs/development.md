# Quy trình phát triển và Git

1. Đọc phase plan và xác định contract/gate trước khi code.
2. Viết implementation rõ trách nhiệm; tránh framework/abstraction chưa có nhu cầu.
3. Chạy test thành công và test input lỗi cho phần vừa đổi.
4. Với renderer/UI, kiểm video/trình duyệt thật; lưu bằng chứng và giới hạn.
5. Sửa lỗi, chạy lại gate liên quan; cập nhật plan/changelog/runbook.
6. Commit theo mốc và push branch. PR là nơi người dùng duyệt; không tự merge.

Nghiên cứu ở validation có package-lock riêng; ứng dụng có lockfile root. Không dùng dependencies trong validation như một phụ thuộc ngầm của sản phẩm. Không commit data runtime, credentials, node_modules hoặc browser cache.

Tên file/chức năng dùng tiếng Anh để dễ tra code, tài liệu và giao diện ưu tiên tiếng Việt. Mỗi error code có thông báo và hướng khắc phục. Hướng dẫn tái tạo phải được thử trên cài sạch trước bàn giao.
