# Báo cáo thiết kế studio hoạt hình 2D/2.5D do AI điều khiển

Nghiên cứu HyperFrames và Remotion cho hệ thống sản xuất hoạt hình bằng code, AI Agent và Skills.

## Tải báo cáo

- [Bản Word (.docx)](reports/Bao_cao_Studio_hoat_hinh_AI_HyperFrames_Remotion.docx?raw=true)
- [Bản PDF — 59 trang](reports/Bao_cao_Studio_hoat_hinh_AI_HyperFrames_Remotion.pdf?raw=true)

Nếu GitHub mở trang xem tệp, chọn **Download raw file** để tải xuống.

## Nội dung

Báo cáo gồm 25 chương, 10 sơ đồ, kế hoạch triển khai 12 giai đoạn, 4 phụ lục và 48 nguồn tham khảo. Phạm vi bao gồm:

- Cách hoạt động, cách sử dụng và luồng render của HyperFrames, Remotion.
- Workflow sản xuất 2D, 2.5D, paper-cut, layered shadow-box và multiplane.
- Asset, rig, animation, camera, voice, alignment, lip-sync và compositing.
- Scene IR, AI Agent + Skills, điều phối job, cache, recovery và QC.
- Benchmark đề xuất, kế hoạch triển khai, mô hình chi phí, giấy phép và rủi ro.

Báo cáo phân biệt thông tin đã xác minh từ tài liệu, đề xuất thiết kế và những điểm chưa được kiểm chứng. Chưa thực hiện benchmark render hoặc sản xuất phim pilot trong nghiên cứu này. Dẫn chứng và URL nguồn nằm trong các bản báo cáo.

## Thẩm định và kế hoạch triển khai (10/11/2026)

Đã bổ sung bộ kiểm thử chạy thực tế với HyperFrames 0.9.30 và Remotion 4.0.542:

- [Bản thẩm định kỹ thuật](reports/Tham_dinh_ky_thuat.md): phát hiện, bằng chứng, phạm vi đã/chưa kiểm chứng.
- [Kế hoạch triển khai studio nội bộ](reports/Ke_hoach_trien_khai.md): các chặng, backlog và tiêu chí nghiệm thu.
- [Bản Word thẩm định và kế hoạch](reports/Tham_dinh_va_ke_hoach_Studio_AI.docx?raw=true).
- [Source và hướng dẫn chạy kiểm thử](validation/README.md).

Thử nghiệm xác nhận ví dụ chạy được và tìm thấy trường hợp render thiếu ảnh vẫn báo thành công khi dùng cấu hình/primitive không chặn lỗi. Đây là thử nghiệm khả thi trên fixture nhỏ; chưa phải benchmark production hoặc phim pilot đã được duyệt.

## Phiên bản báo cáo gốc

- Bản 1.0, biên soạn ngày **10/11/2026**.
- Nguồn khảo sát ngày **09–10/11/2026**.
- Hai tệp được giữ nguyên nội dung so với bản đã bàn giao.
- [SHA256SUMS](SHA256SUMS) chứa mã kiểm tra tính toàn vẹn của các tệp.
