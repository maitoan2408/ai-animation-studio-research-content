# M3 — Character / Motion System: thực thi và nghiệm thu

**Authorized:** 2026-11-16. Chủ dự án đã duyệt M2 trong hội thoại, cho phép triển khai M3. Parent: `codex/product-first-m2-studio-v02`; branch: `codex/product-first-m3-character-motion`; PR #11 (Draft). Không tự merge, không bắt đầu M4 trước khi chủ dự án duyệt M3.

## Scope và ranh giới

1. Đăng ký instance nhân vật mới `guest-01` gắn với art model `an` qua `production-cutout-1` / SHA-bound `lantern-art-1`; cho phép tạo instance mới trên cùng rig/asset có sẵn. Không tự nhận đã thiết kế hình mẫu nhân vật hoàn toàn mới.
2. Bộ action thực thi thật qua Three: `walk-stop` (đặt chân stance/swing và dừng), `turn-head`, `wave`, `pick-place` (grip/prop anchoring). Dữ liệu action đầu vào được kiểm chặt; unsupported action/rig/prop fail closed.
3. Random-access sampling deterministic, transitions không nhảy vị trí ở biên clip, chân khóa đúng tọa độ world qua stance, grip marker trùng anchor của cup.
4. Showcase native Three/Chromium 1080p@24fps, bốn đoạn hành động và so sánh pose nghỉ với pose chuyển động (không mô tả nhầm là M2 video A/B). Lưu MP4, frame PNG, contact sheet và manifest nguồn/hash.
5. End-of-stage audit độc lập với bước render đầu tiên: xác minh đầy đủ tiêu chí, lỗi/biên/dữ liệu giả, frame-contact, audio nếu có, native decode, random seek, CI app+workbench và visual QA; lỗi thì sửa → dựng lại → kiểm toàn bộ lần cuối.

## Acceptance gate bắt buộc

- [ ] Source code thực và tests (gồm negative cases) PASS.
- [ ] Clip mới có thể được cấu hình bằng data-only input; character instance ID khác với art model; rig assets/anchor SHA xác thực.
- [ ] No-slip trên các khoảng stance được khai báo đo ở **sole anchor thực**, không suy từ vị trí root.
- [ ] Pickup grip và prop anchor đúng trong khoảng held; frame giới hạn / contact invalid phải fail.
- [ ] Walk-stop, head turn, wave, pick/place và transitions xuất hiện trong actual rendered video.
- [ ] Real MP4 full decode, ffprobe fps/khung hình/kích thước, vẫn PNG from actual frames, contact, reverse seek state & raster parity, manifest source SHA.
- [ ] Full final HEAD production + root application CI PASS sau sửa cuối; regression M0/M1/M2 không suy giảm.
- [ ] Quay lại hậu kiểm lần hai, khắc phục các vấn đề trong scope và giữ failed attempts; không tự đánh giá diễn xuất đã đạt trình độ chuyên nghiệp.
- [ ] Hiển thị media/file & QC trực tiếp trong chat cho owner; chỉ owner đặt `ACCEPTED`.

## Không thuộc M3

Rapier physics/bake tổng quát thuộc M4; orchestration AI Director thuộc M5; art, voice và diễn xuất cao cấp thuộc M6. Current M3 character ID mới sử dụng **compatible existing** cutout model, không phải asset/rig nghệ thuật mới.

## Communication

Không báo cáo giữa chừng. Chỉ bàn giao sản phẩm thật sau vòng hậu kiểm và sửa lỗi cuối. Blocker phải ghi rõ BLOCKED, không được tráo thành pass.
