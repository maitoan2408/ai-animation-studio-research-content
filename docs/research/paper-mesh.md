# F2 — chuẩn bị: SVG và độ dày giấy trong Three.js

Ngày 14/11/2026. Câu hỏi: Three phiên bản đã khóa có primitive nào cho art nhiều lớp? [Tài liệu ExtrudeGeometry](https://archive.threejs.org/docs/api/en/geometries/ExtrudeGeometry.html) mô tả depth, bevel và hai nhóm vật liệu mặt/cạnh. [Tài liệu SVGLoader](https://threejs.org/docs/pages/SVGLoader.html) mô tả parse SVG; ví dụ trang vẫn gọi `createShapes`, nhưng API ghi deprecated từ r185. Mã `production/node_modules/three` bản 0.187.0 đã cài cũng cảnh báo dùng `ShapePath.toShapes()` thay thế.

Thử local với `THREE.Shape` hình vuông, `ExtrudeGeometry` depth0,2/bevel0,05: revision187,84 vertex positions, hai geometry groups (12 và72). VERIFIED: primitive và metadata của phiên bản thực. PARTIAL: chưa parse asset của dự án, chưa render shadow/material, chưa đo chi phí, chưa chứng minh SVG masks/strokes/texture đều được giữ; không suy hình vuông là pipeline hoàn chỉnh.

Đường an toàn F2: thử một asset có hash trước, kiểm path/fill/stroke/mask/alpha và pivot bằng fixture rồi so baseline; nếu SVG không biểu diễn được, báo capability gap hoặc giữ texture plate có độ dày, không âm thầm bỏ hiệu ứng. Art hiện là development; không tự nhận là final art hoặc vượt gate cảm quan. Chưa tải texture bên ngoài/chưa dùng dịch vụ có phí.

## Thử nghiệm torso có hash

Three 0.187 `ShapePath.toShapes()` + `ExtrudeGeometry` chạy Chromium thực; chỉ path ngoài torso được chọn thủ công, mặt trước là SVG Chromium raster ở 4× và cạnh dùng nhiễu có seed. Xem `docs/reports/F2.md` và ảnh so sánh. PARTIAL: bóng/độ dày nhìn thấy nhưng chưa chứng minh tính đúng cho mask, opacity, stroke, image, rig, pivot và các asset khác; không coi hai pixel kiểm clipping là kiểm chất lượng hình tổng thể. Chưa dùng texture ngoài.

Pivot torso đã được tính theo manifest và kiểm toán so với `assetPoint` của rig (quay và scale âm); Chromium render lại xác minh hai pixel bị che trước đó. PARTIAL: chỉ một torso, chưa kiểm toàn bộ asset và motion, chưa suy chất lượng art.
