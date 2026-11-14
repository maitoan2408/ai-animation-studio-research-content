# U2/U3/U7 — hợp đồng và chẩn đoán S05, 14/11/2026

Tác giả kiểm: delegated-agent. Tiếp tục từ `bad116c` trên nhánh
`codex/quality-motion-contracts`, trước roadmap Q3. Người dùng xác nhận chưa
chọn art/reference và cho tiếp tục kỹ thuật bằng development assets.

- [10 frame kiểm diễn tiến](contact-sheet.jpg), [onion-skin và trail](onion-trail.svg).
- Đồ thị [góc đèn](rotation.svg), [sai số khớp](contact.svg), [chân](foot.svg),
  [vận tốc](velocity.svg), [gia tốc](acceleration.svg), [jerk](jerk.svg).
- [Input](input.json), [bake + execution binding](bake.json), [Performance Script](performance.json),
  [đo từng frame](measurements.json), [workflow](workflow.json), [SHA outputs](manifest.json).

Motion data/golden vẫn `ef8f0bd3…195a`, giống bản đã render trước. Binding mới
khóa gravity/solver/engine/lock/source; thay gravity hoặc source/lock phải có
receipt mới. Không đổi ngưỡng hoặc golden. Archived bake không có binding vẫn
đọc được bằng API lịch sử, nhưng hero adapter mới từ chối dùng nó như receipt mới.

Performance validator đã bắt cả lỗi semantic trong metadata cũ: `secondary`
ghi `lantern` trong khi instance thật là `lamp`. Đã sửa tên metadata; vị trí,
đường cong và audio/render cũ không bị đổi. Script sai clip/actor/contact/time
hoặc variation chưa được evaluator thực hiện bị chặn trước render.

S05 có192frame: sai số khớp cao nhất0,000822468px, palm sai số~1,53e−13px,
foot drift so với authored baseline0px. Đây là đo hình học, không là điểm diễn
xuất. QA workflow khôi phục51 texture bindings, kiểm input/bake data cũ giống
hoàn toàn, xuất192frame và xác minh10 output SHA cùng actual Chromium screenshot.
SVG preview không nhận native color parity; không suy JPEG này là master.

31 TS tests,20 Python contracts, production typecheck và root verify16 đã đạt.
Các fail đầu giữ trong `production/evidence/U2` và `U7`: type narrowing/DOM
iteration, tên instance chưa đúng và đường texture tương đối trong helper.
Đường texture đã đổi thành absolute, child stdout/stderr giữ khi fail; retest PASS.
CI mới có workflow này; kết quả remote ghi riêng sau khi chạy.

`selection.json` ghi các file nhỏ được giữ. Contact-sheet.svg (~1,6MB inline
asset lặp) ở generated output, tái tạo bằng helper thay vì commit thêm. Hash của
nó vẫn trong manifest để đối chiếu khi tái tạo. Không có video/ZIP mới trong Git.

**Còn mở:** art/reference/voice; sáu clip có dữ liệu diễn xuất, collision/cloth/
hair và director/repair orchestration; chuyển trạng thái cuối đèn sang shot sau;
duyệt1×/0,5× có/ngắt tiếng; operator độc lập và performance protocol. Không đóng
Q2/U8 hoặc bắt đầu Q3 từ các kết quả kỹ thuật này.
