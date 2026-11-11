# Lantern art pack

`lantern-v1/manifest.json` khai 64 SVG gốc, source SHA-256, pivot, anchors và quyền.
Nguồn authoring là `../src/art/build_assets.py`; sửa paths/palette/metadata tại đó,
chạy generator rồi review diff. Generator không tải asset bên ngoài.

## Hợp đồng hình học

- Stage 1920×1080, x phải/y xuống, độ quay thuận chiều kim đồng hồ.
- Sprite x/y là **pivot**, không phải góc trên hoặc tâm hình.
- Mọi point trong manifest tính bằng native SVG units, bao gồm vùng trong suốt.
- Actor origin ở mặt sàn; IK dùng chiều dài arm 105+98 và leg 115+115.
- `grip` của bàn tay phải trùng `grip` prop trong world; không chấp nhận chỉ trùng
  một marker tự khai. Test transform điểm của cả hai sprite qua cùng phép chiếu.
- Front/quarter/profile có torso/head riêng, không dùng quay camera để giả mặt sau.
- PNG textures là cache sRGB/straight alpha, native vector raster 1.5–4×. Không dùng
  AI upscale/interpolation. Texture manifest gắn source hash và PNG hash.

## Authoring và review

`src/art/preview.ts` dùng cùng rig để dựng wide/close/contact/model-sheet/extremes.
Art history ở `../artifacts/Q1/draft-1..3`; không ghi đè take bị loại. `src/art/check_textures.py`
kiểm texture/hash/alpha, `tests/art.test.ts` kiểm metadata/sole/contact/IK reach.
`src/art/check_three.ts` kiểm shader, alpha trên trắng/đen bằng actual texture.

Rig extremes là kiểm vùng hoạt động, không phải pose diễn xuất đã duyệt: Q2 phải
tránh tay che mặt và chỉnh silhouette theo từng beat. Chưa hỗ trợ back view, xoay
360°, costume dynamics hoặc replacement drawing ngoài manifest. Thêm asset cần
version/hash mới và kiểm lại mọi shot phụ thuộc.
