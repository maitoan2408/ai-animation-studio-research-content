# Art pack

Mỗi thư mục con là một art pack có phiên bản. `manifest.json` khai mọi SVG: `id`, `file`, kích thước, `pivot`, `anchors`, `category`, SHA-256 nguồn. SVG là nguồn chỉnh sửa; sửa SVG thì phải cập nhật SHA, hoặc tạo pack mới có version mới để phim cũ vẫn tái lập được.

## Hợp đồng hình học

- Stage 1920×1080, x sang phải, y xuống, góc quay thuận chiều kim đồng hồ.
- Sprite đặt theo **pivot**, không theo góc hay tâm ảnh. Mọi điểm tính bằng đơn vị SVG gốc.
- Gốc nhân vật nằm trên mặt sàn. Rig `production-cutout-1` lấy **độ dài xương từ chính art**: khoảng cách pivot → anchor `end` của `upper-arm`, `forearm`, `thigh`, `shin`; offset đế từ anchor `sole` của `boot`.
- Bàn tay cầm: anchor `grip` của `hand-grip` phải trùng anchor `grip` của đạo cụ trong world.
- Đạo cụ làm mặt đỡ cần anchor `support` (mặt trên).
- Front/quarter/profile dùng torso/head riêng, không xoay camera để giả mặt sau.

## Bộ phận bắt buộc cho một nhân vật `<model>`

`torso`, `upper-arm`, `forearm`, `thigh`, `shin`, `boot`, `hand-open`, `hand-grip`, `hand-grip-front`, `hand-point`, `head-<view>-<mood>`; miệng dùng chung `mouth/*`.

## Texture

`npm --prefix production run textures -- assets/<pack>` rasterize SVG thành PNG (1.5× nền, 2× tiền cảnh, 4× còn lại) vào `production/out/textures/<pack>/`, kèm SHA từng file. Renderer kiểm hash trước mỗi lần dùng; cache hỏng thì dừng, không tự tạo lại.

## Giới hạn hiện tại của `lantern-v1`

Bàn tay chỉ có ba trạng thái rời (`open`, `grip`, `point`) và cánh tay là hai mảnh cắt cứng; đây là nguyên nhân chính của lỗi G3 (xem `docs/ROADMAP.md`). Sửa bằng pack mới có version mới, không sửa đè `lantern-v1`.
