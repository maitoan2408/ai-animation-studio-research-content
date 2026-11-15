# M2 — kết quả thẩm định và bàn giao

Trạng thái hiện tại: **VERIFYING**. Người dùng chưa duyệt M2; M3 chưa bắt đầu.
Người thực hiện kiểm tra: `delegated-agent`. Không giả là một chuyên gia độc lập hoặc chủ dự án đã xem/nghe và duyệt.

## Lỗi tìm thấy và sửa

1. Harness so sánh chuỗi SHA-256 với Buffer video thay vì hai hash. Node tạo thông báo diff khổng lồ, vượt 8 GiB và bị OOM kill. Đã tái hiện trên source `84598ab`, giữ nguyên log FAIL và số liệu bộ nhớ. Video đã qua QC trước lỗi này; nhận định trước đó rằng lỗi nằm trong final decode chưa đủ căn cứ và đã được sửa. Bằng chứng: [root cause](evidence/m2-oom-root-cause.json).
2. `doctor` thiếu `rsvg-convert`: thêm lỗi có hướng dẫn cài `librsvg2-bin`, kiểm phiên bản trong fingerprint, cập nhật CI/tài liệu. Sau khi cài công cụ, server có thể thử lại mà không giữ promise lỗi cũ.
3. Preview không vẽ khẩu hình theo audio envelope như final: dùng cùng WAV đã kiểm hash và dữ liệu âm lượng; audio bị sửa ngoài ứng dụng bị từ chối trước khi trả ảnh.
4. Hủy worker render có thể để encoder con chạy tiếp: nhóm tiến trình riêng được dừng cùng nhau; kiểm tra hủy và chạy lại không còn tiến trình con sống.
5. Harness UI chờ nhiều hơn một lựa chọn trong khi chỉ có một video hợp lệ: kiểm đúng artifact ID, metadata và phát thử video trong Studio.

## Đối chiếu kế hoạch

| Yêu cầu | Bằng chứng cần chốt |
|---|---|
| Phim mới 20–30 giây, ≥3 cảnh, native 1920×1080/24fps | Phim `Ngày mới trên giấy`, 3 cảnh × 8 giây; 576 frame; ffprobe và decode toàn bộ |
| Từ script ngoài, chỉnh qua Studio, không viết logic riêng từng cảnh | `examples/m2-new-story.txt`; tạo dự án, đổi tiêu đề/màu cảnh 2 qua browser; ảnh trước/sau |
| Voice local có dữ liệu thật, đúng cảnh | WAV được hash; AAC 48 kHz; waveform cuối đối chiếu nguồn tại độ trễ 0 từng cảnh |
| Lưu revision, export/import/reopen | Phiên bản cũ bất biến; gói dự án giữ nội dung/audio; tiến trình OS mới mở lại đúng revision và artifact hash |
| Preview và final nhất quán | So SVG từ HTTP và pixel native ở đầu/cuối từng cảnh, frame lời thoại mạnh nhất; ngưỡng cố định trước đo |
| Kiểm tra âm tính | Action ngoài phạm vi, schema/path/hash/revision/audio overflow; video sai revision và audio lệch 250 ms phải bị chặn |
| Giữ logic và kiểm thử cũ | Cả CI ứng dụng lẫn workbench; integration/UI/recovery; M1 legacy/IR parity và Three render |
| Bàn giao dùng được | MP4, ảnh Studio desktop/mobile, contact sheet, gói dự án và manifest SHA; video thực sự load/seek/play trong browser |

Các con số, CI cuối và đường dẫn media sẽ được ghi sau khi cả bộ kiểm hoàn tất.

## Phạm vi chất lượng

M2 hoàn thiện luồng sản phẩm và tính đúng của dữ liệu/video trong phạm vi renderer và action sẵn có. Không mở rộng sang bộ chuyển động M3, vật lý M4 hoặc đánh bóng nghệ thuật M6. Voice eSpeak tiếng Việt là giọng nháp để duyệt timing, chưa phải giọng tự nhiên chất lượng cao. Kiểm PCM không thay việc người dùng nghe duyệt.

Kiểm ảnh/pixel/âm thanh do chương trình và review bởi cùng agent không được gắn nhãn duyệt nghệ thuật độc lập. `ACCEPTED` chỉ do chủ dự án quyết định; không auto-merge.
