# Lộ trình

Nguồn trạng thái duy nhất: [STATE.json](STATE.json). Các kế hoạch cũ (P0–P11, Q0–Q9, U0–U8, F0–F9, M/G/R…) đã gỡ khỏi cây thư mục; xem [HISTORY.md](HISTORY.md) để tra lại theo SHA.

## Mục tiêu

Một studio hoạt hình 2D/2.5D chạy bằng code, **mở rộng bằng dữ liệu**: thêm nhân vật, đạo cụ, cảnh hoặc phim mới bằng cách thêm art pack và file JSON, không viết code riêng cho từng phim. AI chỉ điều phối các bộ thực thi đã được kiểm tra; không gọi API tạo hình/video trả phí.

## Quy tắc chung cho mọi giai đoạn

- Code không biết tên nhân vật, đạo cụ, phim hay số frame cụ thể. Mọi thứ đó nằm trong art pack hoặc file phim.
- Mỗi tính năng mới phải chạy được trên ít nhất hai phim/nhân vật/đạo cụ khác nhau trước khi coi là xong.
- Technical PASS (test, CI) khác với chấp nhận nghệ thuật. Chỉ chủ dự án đặt `ACCEPTED`.
- Trạng thái dùng: `PASS_TECHNICAL`, `ART_REWORK_REQUIRED`, `READY_FOR_USER_REVIEW`, `ACCEPTED`, `BLOCKED`, `NOT_RUN`.

## Giai đoạn

| Giai đoạn | Nội dung | Trạng thái |
| --- | --- | --- |
| Đã hoàn tất trước đợt dọn | M0–M5: baseline, IR, Studio có revision, thư viện chuyển động M3, vật lý M4, Director M5 | Chủ dự án đã `ACCEPTED` tại các SHA ghi trong `STATE.json`. Renderer SVG cũ, trang M3 và các renderer riêng M3/M4/M6 đã gỡ khỏi cây (xem phần "Khoảng trống") |
| G1–G2 | Kiểm tra cảnh tổng quát (sprite, anchor, layer, camera); chọn tay trái/phải, cầm đạo cụ, giới hạn tầm với | `PASS_TECHNICAL` |
| **G3 (đang làm)** | Cầm → thả → đạo cụ rơi bằng Rapier; lớp diễn xuất (performance layer) | Kỹ thuật PASS; **`ART_REWORK_REQUIRED`**: khuỷu/tay áo lộ đường cắt, tay chuyển nắm→mở đột ngột, tay đè đùi khi nghỉ, thân chưa dồn trọng lượng |
| G4 | Nối Studio (kịch bản → storyboard → revision) với engine phim `production/`; Studio render lại được | Chưa bắt đầu. Chỉ bắt đầu khi chủ dự án duyệt G3 |
| G5 | ≥ 6 phim thực sự khác nhau, chỉ khác dữ liệu | Chưa bắt đầu |
| G6 | Regression đầy đủ + chủ dự án duyệt toàn bộ | Chưa bắt đầu |
| M7 | Phim pilot dài | Chưa được phép |

## Hướng xử lý G3 đã thống nhất

Các lỗi G3 chủ yếu nằm ở **art và rig**, không ở solver: art tay chỉ có 3 trạng thái rời (`hand-open`, `hand-grip`, `hand-point`) và hai mảnh cắt cứng cho cánh tay. Bước tiếp theo là pack art có phiên bản mới (khớp chồng mép, tư thế tay trung gian, tư thế nghỉ thiết kế sẵn), thử nhanh trên một phim, rồi mới chạy đủ bộ phim mẫu. Không lật nhánh IK toàn cục, không vẽ đĩa che khớp.

## Khoảng trống sau đợt dọn (phải làm lại theo cách tổng quát)

- **Studio chưa render được.** Job render trả `RENDERER_NOT_CONFIGURED` cho đến G4.
- **Hành động đi bộ, vẫy tay, quay đầu** (thư viện M3 cũ) đã gỡ vì gắn cứng vào một phim showcase (model `mai|an`, bàn ở x=1060, bước đi +120px). Engine hiện chỉ hỗ trợ đứng yên cầm/thả đạo cụ. Thêm lại dưới dạng hành động dữ liệu khi cần.
- **Âm thanh/lip-sync trong phim native**: chưa có trong engine `production/`; giọng đọc vẫn có ở Studio.
