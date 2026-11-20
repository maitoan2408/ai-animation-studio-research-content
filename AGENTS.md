# Hướng dẫn cho agent

Đọc file này, rồi chỉ mở tài liệu/code cần cho việc đang làm. Trạng thái hiện tại: [docs/STATE.json](docs/STATE.json); lộ trình: [docs/ROADMAP.md](docs/ROADMAP.md); kiến trúc: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Mục tiêu

Workflow làm phim 2D/2.5D **tái sử dụng được** và phim **thực sự đẹp**. Không chuyển sang 3D, không gọi API tạo hình/video, không hardcode theo nhân vật, đạo cụ, cảnh hay số frame.

## Quy tắc bắt buộc

- **Tổng quát từ dữ liệu.** Không có `if (actor === 'an')`, điều kiện riêng cho cốc/đèn, hay vá ở frame 95. Nhân vật, đạo cụ, phim nằm trong art pack và `production/examples/films/*.json`. Tính năng mới phải chạy trên ≥2 nhân vật/tay/đạo cụ.
- **Không mở thêm tầng kế hoạch.** Khi một giai đoạn thất bại, sửa nguyên nhân gốc trong giai đoạn đó và cập nhật `docs/ROADMAP.md`/`docs/STATE.json`. Không tạo file kế hoạch mới, không đặt bộ ký hiệu giai đoạn mới.
- **Tất định.** Lấy mẫu thuần theo frame, tua ngẫu nhiên được; input, art và bake đều có SHA; bake vật lý bất biến. Tay giữ đạo cụ đến khi thả, sau đó bake Rapier giữ.
- **Dừng khi sai.** Hành động không hỗ trợ, bake cũ, hash sai, hình học sai, tầm với không tới → lỗi có mã. Không fallback âm thầm rồi báo thành công.
- **Không che lỗi.** Không nới ngưỡng, không xóa test để lấy màu xanh, không sửa code chỉ để khớp một ảnh chụp.
- **Báo cáo trung thực:** `PASS_TECHNICAL`, `ART_REWORK_REQUIRED`, `READY_FOR_USER_REVIEW`, `ACCEPTED` (chỉ chủ dự án đặt), `BLOCKED`, `NOT_RUN`. Không nói đã xem phim nếu chưa xem.
- **Bảo mật.** Không chạy HTML/JS do người dùng hoặc model tạo. Validate ở biên vào và trước render. Không đặt key vào repo/log.
- **Git.** Làm trên nhánh feature + PR nháp; commit nhỏ, giải thích được. Không force-push, không tự merge, không sửa `main`. Không commit MP4/ZIP/evidence lớn; video lấy từ CI artifact.

## Vòng làm việc

1. `git status -sb && git rev-parse HEAD`; đọc `docs/STATE.json`.
2. Xác định lỗi cụ thể, frame/đoạn bị lỗi và ai sở hữu nó (art, rig, motion, physics, renderer).
3. Viết test thất bại trước (cả hai nhân vật/tay/hướng, tua frame, biên thả đạo cụ…), sửa nguyên nhân gốc, chạy test liên quan.
4. Render phim mẫu, audit, **xem phim thật** ở 1× và 0.5× cho mọi nhân vật trước khi nói đã cải thiện.
5. Sau lần sửa cuối, chạy toàn bộ kiểm tra trên cùng HEAD (bảng trong `docs/ARCHITECTURE.md`).
6. Bàn giao một lần: HEAD, thay đổi, kết quả test, ảnh/video thật, lỗi nghệ thuật còn lại, trạng thái. Hiển thị media trực tiếp nếu được.

Quy tắc quyết định: **test xanh mà phim xấu hơn là FAIL.**
