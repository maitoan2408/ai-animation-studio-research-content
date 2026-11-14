# F2 — chuẩn bị: SVG và độ dày giấy trong Three.js

Ngày 14/11/2026. Câu hỏi: Three phiên bản đã khóa có primitive nào cho art nhiều lớp? [Tài liệu ExtrudeGeometry](https://archive.threejs.org/docs/api/en/geometries/ExtrudeGeometry.html) mô tả depth, bevel và hai nhóm vật liệu mặt/cạnh. [Tài liệu SVGLoader](https://threejs.org/docs/pages/SVGLoader.html) mô tả parse SVG; ví dụ trang vẫn gọi `createShapes`, nhưng API ghi deprecated từ r185. Mã `production/node_modules/three` bản 0.187.0 đã cài cũng cảnh báo dùng `ShapePath.toShapes()` thay thế.

Thử local với `THREE.Shape` hình vuông, `ExtrudeGeometry` depth0,2/bevel0,05: revision187,84 vertex positions, hai geometry groups (12 và72). VERIFIED: primitive và metadata của phiên bản thực. PARTIAL: chưa parse asset của dự án, chưa render shadow/material, chưa đo chi phí, chưa chứng minh SVG masks/strokes/texture đều được giữ; không suy hình vuông là pipeline hoàn chỉnh.

Đường an toàn F2: thử một asset có hash trước, kiểm path/fill/stroke/mask/alpha và pivot bằng fixture rồi so baseline; nếu SVG không biểu diễn được, báo capability gap hoặc giữ texture plate có độ dày, không âm thầm bỏ hiệu ứng. Art hiện là development; không tự nhận là final art hoặc vượt gate cảm quan. Chưa tải texture bên ngoài/chưa dùng dịch vụ có phí.

## Thử nghiệm torso có hash

Three 0.187 `ShapePath.toShapes()` + `ExtrudeGeometry` chạy Chromium thực; chỉ path ngoài torso được chọn thủ công, mặt trước là SVG Chromium raster ở 4× và cạnh dùng nhiễu có seed. Xem `docs/reports/F2.md` và ảnh so sánh. PARTIAL: bóng/độ dày nhìn thấy nhưng chưa chứng minh tính đúng cho mask, opacity, stroke, image, rig, pivot và các asset khác; không coi hai pixel kiểm clipping là kiểm chất lượng hình tổng thể. Chưa dùng texture ngoài.

Pivot torso đã được tính theo manifest và kiểm toán so với `assetPoint` của rig (quay và scale âm); Chromium render lại xác minh hai pixel bị che trước đó. PARTIAL: chỉ một torso, chưa kiểm toàn bộ asset và motion, chưa suy chất lượng art.

## Contour alpha và cảnh thử S05

Contour nhị phân của 22 asset S05 được tạo từ PNG R3 xác minh hash ở alpha ≥128; roundtrip mask và triangulation tổng diện tích khớp. Đây không chứng minh trung thực subpixel, shadow hay motion. So frame 108 trong Chromium: 31/71 sprite đùn, còn dùng nền/shadow phẳng và yaw minh họa có thể lệch anchor. Đo ảnh khác nhau 9.501 pixel, không đánh giá art. Xem `docs/reports/F2.md` và `s05-scene/`.

## Shear và shadow thử S05

Face giữ nguyên transform 2D; body dùng oblique depth shear riêng, không phải camera 3D chung. Three VSM directional light đổ lên một receiver sau foreground; so ảnh có/không shadow cùng input cho 41.497 pixel khác. PARTIAL: đo đó không xác minh độ mềm/đúng vật lý, tiếp xúc sàn hay layering; shadow authored cũ vẫn còn và có thể bị nhân đôi. Đã giữ các hình và hash trong `s05-oblique`.

## Art pack đầy đủ

Đã kiểm hash/decode 117 raster phát triển; 51 là R3 giữ byte gốc, 66 raster Chromium mới. Contour nhị phân 58 actor/prop/mouth roundtrip và triangulation diện tích PASS; 51 shadow, 7 background, 1 effect chưa là mesh. RGB opaque chỉ được chấp nhận với background. Chưa có phép đo parity pixel đa nền hay artistic approval.

## Overlay 156 asset

Bản development rebake theo hash art mới, texture 156 được kiểm decode/SHA, contour nhị phân 79 foreground roundtrip và triangulation diện tích. Preview 1080p frame 108 có thay sáu selector. Chỉ xác minh geometric scope và output, không suy lip-sync, full-motion, bóng theo layer, hay duyệt art; nền/shadow/effect vẫn là plate.
