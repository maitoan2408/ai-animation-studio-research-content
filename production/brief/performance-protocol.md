# Q2.5 — protocol đo sau gate hình/chuyển động

Trạng thái: NOT_RUN. Không coi các batch render đang/đã chạy song song là8sample
công bằng. Chỉ bắt đầu sau khi six-shot art/motion review đủ; giữ EX-013 mở.

1. Chốt cùng source revision, six-shot scope, output1080p/24, texture pack, voice,
   codec/color và bộ frame. Lưu hashes/git/source snapshot và mọi argv.
2. Chốt máy vận hành: CPU/GPU/RAM, driver/GL/software flags, Blender/Chrome/FFmpeg.
   Máy thử hiện tại2CPU/8GiB/software graphics không đại diện GPU production.
3. Chạy từng candidate riêng, không batch/job/normalize khác đồng thời.3cold:
   process/browser mới và app caches trống. OS page cache không được xóa trên
   host dùng chung; ghi rõ đó là application-cold, không giả là hardware-cold.
4.5warm: process/scene đã load đúng asset; cache được công bố. Tách "warm-render"
   thực sự tính lại frame và "exact-frame reuse"; không trộn chúng vào một số.
5. Đo load/authoring-conversion/capture/encode/QC riêng; peakRSS toàn process tree,
   including browser/Blender/FFmpeg. GPU memory chỉ ghi nếu có công cụ/devicename;
   không lấy RAM host làm peakRSS hoặc viết0 khi thiếu GPU telemetry.
6. Mỗi sample phải full decode/profile/hash. Giữ retry/fail; không chỉ chọn nhanh
   nhất. Công bố raw8samples, median vàrange, không suy p95/SLA từ8samples.
7. Effort sửa/art/review của con người ghi riêng nếu có; AI command elapsed không
   phải giờ animator. Chỉ tính accepted-minute cost khi có duration đã duyệt,
   đơn giá thật và cách phân bổ setup/retention/retry.

Fail chất lượng: quay Q1/Q2 đúng shot; fail performance: thử optimization có giới
hạn và chứng minh pixel/contact không đổi, sau đó chạy bộ sample mới riêng.
