# F2 style bible — bản phát triển, chưa duyệt

Căn cứ Q0 `lantern-brief-1`. Palette gốc: slate `#294957`, mint xa `#7eaaa3`, kem `#f5dfb3`, vàng áo `#d5a34b`, cam đất `#bc6351`, teal gần `#224f50`. Mai áo vàng/khăn cam, An áo teal/tóc bạc; góc front, quarter, profile có art riêng. Tọa độ stage 1920 × 1080, y tăng xuống; pivot và anchor theo manifest, không đổi tỷ lệ để che lỗi rig.

Thử nghiệm Three hiện có mặt trước raster từ SVG và mép contour alpha 128; độ dày thử 3 đơn vị stage, depth shear 0,25. Đây không phải độ dày vật lý đã hiệu chuẩn. Ánh sáng và bóng: ba hướng `combined`, `receiver-only`, `authored-only`; contact-shadow cũ vẫn là sprite, không suy đó là va chạm thật. [So sánh](../../production/artifacts/quality/v2-f2/shadow-board/board.png) chỉ là một frame đã thu nhỏ, không quyết định art.

Bộ mouth thử: M/A/E/O/F/U/L/teeth cộng rest, tên nội bộ khác mã Rhubarb; không coi là map phoneme đã xác minh. Đầu neutral/worried/happy và ba draft sad/surprised/angry; blink là trạng thái mắt riêng. [Model sheets](../../production/artifacts/quality/v2-f2/model-sheets/draft.png) và pose thử là vector, chưa chứng minh acting, texture/diorama cuối, lip-sync hoặc voice. Nguồn nghiên cứu: `docs/research/viseme-drafts.md`, `paper-mesh.md`.

**Chưa đạt:** shadow theo từng lớp/chạm nền thật, mọi pose/cue trong motion, đánh giá răng cưa ở 1080p và điểm art của người duyệt. Art nguồn, bake và artifact cũ không bị sửa. Lựa chọn mới đều PROVISIONAL; mọi mốc chất lượng Q0/Q2 vẫn mở theo plan.
