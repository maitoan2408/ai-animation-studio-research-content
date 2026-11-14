# Chuẩn chất lượng và trạng thái duyệt

14/11/2026. Nguồn: [kế hoạch người dùng](USER-PLAN.md), SHA256
`c7de9e1cd05a84eff4aa56e5c429dc8a147d9ca6e6b77e58282dabff2ce749dc`.
File người dùng gửi lại có cùng hash. Thực hiện U0–U8 trước Q3–Q9 theo yêu cầu
trực tiếp; tiếp tục kỹ thuật với development assets khi chưa chọn art/reference.

Đây là hợp đồng kiểm kỹ thuật và rubric đề xuất, **chưa có phê duyệt nghệ thuật
của người dùng**. Chưa có clip hợp pháp được chọn để hiệu chỉnh phần cảm nhận.
Không dùng dữ liệu máy để tự điền điểm người chấm.

| Trục | Điều kiện | Tình trạng |
|---|---|---|
| Diễn xuất | Mỗi tiêu chí rubric ≥4/5, mean≥4,2; xem1×/0,5×, có/không tiếng, đối chiếu reference | NOT_RUN — chưa có reference/người chấm |
| Vật lý giải tích | Period≤2%, freefall≤2%; bounce theo contract đã khóa; strict penetration=0 báo riêng | Fixture đã đo; không suy mọi cảnh |
| Tiếp xúc/chân | ≤1px tại1080p theo `physics-contract.json`; kiểm anchor thật, world/projection | S05 có fixture; không suy toàn rig/library |
| Tái lập | Golden motion giống hệt; execution binding khớp input/config/implementation/lock; hai lần chạy và runner khác | Golden hai runner cũ; contract mới cần CI mới |
| Hình ảnh | ≥4/5, sạch1080p và nhất quán style/chất liệu/ánh sáng | NOT_RUN — art hiện là development |
| Âm thanh | −16LUFS,TP≤−1dBTP; foley±1frame, lip-sync≤2frame và nghe duyệt | Hero hiện im lặng; không suy từ QC sequence cũ |
| Giao hàng | Frame/size/fps/profile/audio/hash và decode đầy đủ | Chạy trên output cụ thể; diagnostic SVG không là master |

Các số đã khóa trước thử nghiệm nằm ở `production/brief/quality/physics-contract.json`.
Mọi đổi ngưỡng cần lý do và revision trước phép thử mới; không sửa fail evidence.
Engineering tolerance và strict-zero metric không thay thế nhau. Không reset
golden chỉ vì implementation mới fail; phân biệt thay provenance với đổi motion.

Reference register: [references/manifest.json](../../references/manifest.json).
Chưa có quyền sử dụng thì giữ URI/hash trống và status MISSING; không tự tải,
retarget hoặc gắn nhãn approved cho media không rõ quyền.

Mỗi review phải gắn shot/frame/revision/artifact hash, người chấm và lý do.
`delegated-agent` chỉ là tác giả kiểm kỹ thuật/nhận xét, không giả người dùng
đã nghe/xem hoặc operator độc lập. Các gate Q2/U1/U4/U5/U8 vẫn mở.
