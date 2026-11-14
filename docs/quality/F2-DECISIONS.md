# F2 — quyết định có thể tái lập

- Baseline cố định: `production/artifacts/quality/v2-f2/s05-scene/flat.png` và `physical-scene/volume.png`, frame 108 ở 1920×1080. Bốn vùng và SHA trong `t0/`.
- Màu đo theo sRGB D65 → CIELAB D65 → CIEDE2000 với kL=kC=kH=1. Công thức kiểm ba cặp công bố bởi [Sharma và cộng sự](https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/ciede2000noteCRNA.pdf). Các cặp không thay toàn bộ test chuẩn.
- Ngưỡng ΔE00 2 (ảnh hưởng) và 3 (parity) là đề xuất CHƯA ĐƯỢC HIỆU CHỈNH; không tự nhận là chuẩn phổ quát hoặc gate PASS. Nghiên cứu [Ghinea và cộng sự](https://pubmed.ncbi.nlm.nih.gov/20670670/) đo vật liệu nha khoa, không thể áp trực tiếp vào phim giấy. Cần review thị giác và hiệu chỉnh theo cảnh/màn hình.
- Giữ sRGBColorSpace/NoToneMapping. [Three color management](https://threejs.org/manual/pages/color-management.html) phân biệt linear-sRGB cho tính sáng và sRGB cho hiển thị; phép thử phải so ảnh thực, không giả định giá trị đèn tự giữ màu.

- T1 chỉ thay thân Mai trên frame 108: Standard và Lambert (ánh sáng mặc định 1,1 ambient + 1,2 directional) làm áo tối gần như đồng đều; ΔE vùng thân lần lượt 8,13 và 7,86. Thử thứ ba dùng normal giả tạo nếp ±0,32 và emissive map 0,25 giảm ΔE còn 1,89 nhưng thay đổi nhìn rất nhẹ và chưa áp dụng lên tay; không nhận T1 PASS hay đưa vào preset. Normal giả không phải hình học giấy thật.
- T2 thử độ sâu theo thứ tự mỗi sprite cách 6 đơn vị, mặt giấy alphaTest 0,5; sau đó thử vật liệu nhận sáng có shadow và ẩn bóng authored; cuối cùng thử blend alpha với depthWrite tắt. Bản nhận sáng làm trời lệch ΔE 11,57 và tối toàn cảnh; bản blend giữ mép tốt hơn nhưng chưa chứng minh bóng theo lớp hay đúng thứ tự mọi overlap. Cả ba chỉ là ứng viên riêng, không chọn làm final.
