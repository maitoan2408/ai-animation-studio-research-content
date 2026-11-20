# Đóng góp

1. Đọc [AGENTS.md](AGENTS.md) và [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
2. Mô tả input, kết quả mong đợi, kết quả thực tế và log.
3. Sửa đúng module; không đặt logic domain vào UI; không hardcode theo nhân vật/đạo cụ/phim.
4. Chạy các kiểm tra trong `docs/ARCHITECTURE.md`; ghi rõ cái nào `NOT_RUN`.
5. Cập nhật `docs/ROADMAP.md`, `docs/STATE.json`, `CHANGELOG.md` khi trạng thái đổi.
6. Push nhánh, mở PR nháp. Chủ dự án duyệt trước khi merge.

Không commit dữ liệu runtime, secret, `node_modules`, output render. Asset cần ghi rõ nguồn và quyền. Giữ nguyên báo cáo Word/PDF gốc và `SHA256SUMS`.
