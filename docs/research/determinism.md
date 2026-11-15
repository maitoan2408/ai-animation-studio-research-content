# F0 — tất định dữ liệu và raster: trạng thái ban đầu

Ngày 14/11/2026. Dữ liệu bake và execution receipt hiện có hash bit-exact, có fixture hai runner Linux x64; xem `docs/quality/ci-motion-contracts.json` và `docs/quality/SOURCES.md`. Điều này không chứng minh mọi CPU/OS hay GPU.

Mục tiêu so ảnh SSIM/ΔE: UNVERIFIED về ngưỡng phù hợp style/công cụ của dự án. Không đặt số từ trí nhớ hay thay ngưỡng đã khóa. Thiết kế thử trước khi chốt: khóa scene/asset/profile và baseline, chạy lặp trên các môi trường cụ thể, đo biến thiên cùng môi trường và khác môi trường, kèm negative frames có lỗi alpha/font/contact/màu; chọn ngưỡng trước bộ xác nhận độc lập và ghi false positives/negatives. Không dùng SSIM/ΔE để chứng minh chất lượng diễn xuất.

Chromium software rendering: dự án có log thực về SwiftShader trong các lần chạy cũ, nhưng chưa xác minh tất cả cờ cần để có tính ổn định giữa các bản Chromium và driver. PARTIAL; giữ toolchain/runtime report, thử phiên bản khóa và cờ thực tế trước khi chọn policy. Không tuyên bố test hai tầng F0 đã đạt.

Tra cứu nguồn gốc ngày 14/11: [Chromium SwiftShader](https://chromium.googlesource.com/chromium/src/+/205191a32c9db91062c5342e901b2da2d67a49e5/docs/gpu/swiftshader.md) mô tả `--use-gl=angle --use-angle=swiftshader` cho SwANGLE và cảnh báo fallback unsafe không dành cho nội dung không tin cậy. Log renderer của repo đã ghi đúng cặp cờ trong lần render thật: VERIFIED cờ được tài liệu hóa và đã xuất hiện tại môi trường thử; PARTIAL về khả năng lặp giữa máy/version, không bật fallback unsafe mặc định.

[scikit-image metrics](https://scikit-image.org/docs/stable/api/skimage.metrics.html) mô tả SSIM và yêu cầu chú ý `data_range`; tài liệu nêu hạn chế channel range khác nhau. VERIFIED về định nghĩa API tài liệu; UNVERIFIED ngưỡng chấp nhận cho cảnh này và chưa kiểm phiên bản package được khóa. Quyết định: không gán ngưỡng SSIM/ΔE chung trước protocol và negative fixtures.

[scikit-image color](https://scikit-image.org/docs/stable/api/skimage.color.html) mô tả nhiều biến thể ΔE và chuyển đổi sRGB→Lab; phải ghi rõ biến thể, illuminant, input transfer và alpha handling. VERIFIED API trong tài liệu; version cài và ngưỡng dự án vẫn UNVERIFIED cho tới phép thử trên môi trường khóa.

Triển khai thử: `production/src/qa/determinism_tiers.py` dùng FFmpeg SSIM và Pillow/LittleCMS ΔE76 với Lab 8-bit (có lượng tử hóa), giả định input sRGB, alpha composite trên nền khai báo. Output ghi version và hash. `test_determinism_tiers.py` kiểm dữ liệu thay một byte, ảnh khác, alpha và cặp đen/trắng; 23 Python tests tổng PASS trong môi trường này. Threshold fixture tổng hợp được viết trước thử, không phải ngưỡng production; bỏ threshold thì trả NEEDS_CALIBRATION. Metric này không chứng minh chất lượng diễn xuất.
