# Kết quả nâng cấp — cập nhật 14/11/2026

## Checkpoint hợp đồng và diagnostics — tiếp tục từ bad116c

Nhánh `codex/quality-motion-contracts`: execution receipt cho gravity/solver/
engine/implementation/lock, strict Performance Script và công cụ chẩn đoán
10frame/onion/trail/curves đã chạy. Input và motion bake giữ nguyên toàn bộ so
với candidate đã render; golden và ngưỡng không đổi.31 TS tests,20 Python,
typecheck và root verify16 PASS. [Báo cáo/ảnh/đồ thị](../../production/artifacts/quality/contracts-20261114/README.md).
User chưa chọn art/reference, cho phép tiếp tục kỹ thuật bằng asset thử nghiệm.
Hai workflow trên source `2b0d40f` đã SUCCESS: workbench43555120968 và
app43555121390, gồm diagnostic workflow mới, R3/review recovery và standalone
Git-only. [CI/source/steps](ci-motion-contracts.json). Commit chốt evidence sau
đó không đổi implementation đã kiểm; không suy CI thành art approval.
[Chuẩn và trạng thái duyệt](standard.md), [reference register](../../references/manifest.json).
Q3–Q9 chưa bắt đầu; Q2/U1/U4/U5/U8 vẫn giữ các gate đang mở.

Các kết quả bên dưới là checkpoint bad116c/ce1c138, giữ nguyên để truy vết.

Đã chốt phần kỹ thuật R3/Q2 và triển khai chuyển động phụ có vật lý cho S05
trên nhánh mới. Toàn bộ Q2 và kế hoạch chín giai đoạn vẫn còn các điều kiện mở.

| Phần | Kết quả đã thực đo | Còn thiếu |
|---|---|---|
| Q2 R3 | 48 giây, 1.152 frame; giữ 960 frame đầu và AAC của R2; 14 ca browser; native 70 hashes, 6 frame replay; hai workflow CI trên 4f6b97c thành công | Review chuyển động/nghe thực, operator độc lập và phép đo 3 cold + 5 warm |
| U0/U1 | Đã đọc và lưu toàn kế hoạch, thẩm định nguồn/license, khóa tiêu chí trước test, kiểm kê 117 assets | Final art và reference chưa được chọn; chưa tự cấp phép MIT cho toàn repo |
| U2 | PerformanceIR giới hạn cho S05; BakeFile bất biến, gắn đúng input/art/revision; seek không phụ thuộc lần trước | Sáu clip diễn xuất mới, personality và retarget từ footage |
| U3 | So Planck/Rapier thực; Rapier sai số chu kỳ 0,0162%, rơi 0,4206%, nảy 0,3384%; sau thêm contact skin 2 mm, fixture không xuyên nền; hash lặp lại chính xác | Chỉ fixture và khớp đèn; chưa cloth/hair/va chạm thân người hoặc kiểm nhiều OS/CPU |
| U6/U7 | S05 đủ 192 frame/1080p; nghiêng tối đa 25,14°; sai lệch khớp 0,000823 px, chân trượt 0 px; native/web/player/color/replay và ca lỗi critic đạt | Chấm nghệ thuật, director tổng quát, A/B backend và phép đo hiệu năng công bằng |
| U4/U5/U8 | Đã ghi rõ kế hoạch và phụ thuộc; giữ voice/audio QC cũ; event ghi đúng nguồn authored-contact | Reference hợp pháp, alignment/viseme mới, nghe voice/foley/music, pilot 72 giây và handoff độc lập |

26 test TypeScript và typecheck đã đạt. 17 contract Python cũ đạt; thêm 3 ca
texture bootstrap đạt: tái tạo ở thư mục mới, cache hỏng, art/archive bị đổi.
CI đã chạy chung cả 20 ca và đạt. Các ca physics gồm analytic measurement, golden hash,
seek, immutability, bake bị sửa, sai input/art, timebase/events, NaN, mass lỗi,
IK không thể với tới và khớp vật lý bị cố ý tách khỏi tay.

Toàn bộ 1.152 frame nguồn R3 đã lưu từ trước được so lại chính xác. Khôi phục
51 texture bindings từ gói đã có trên Git tạo đúng 192 frame/bake và texture
bytes của candidate đã render, không cần cache hay rasterize lại. Media mới
ở `production/out/`; Git lưu code, input, bake, báo cáo và ảnh so sánh nhỏ.

Hai workflow cuối trên source `ce1c138` đã thành công, gồm cả helper khôi phục
texture, 20 ca Python, tái tạo R3, browser/recovery và cài riêng từ Git.
Rapier và hero khớp golden trên runner Linux x64 khác. Xem [CI cuối](ci-workflows.json)
và [CI checkpoint trước](ci-535296e.json). Thay đổi sau source này chỉ bổ sung
báo cáo kết quả, không thay implementation đã kiểm.

Các lỗi đã xử lý: concat làm sai average fps (EX-033), physics drop xuyên nền
(U-001), critic nhầm boot shadow là boot thật (U-002). Các lần lỗi giữ nguyên.
Integrity audit có 273 attempts hoàn tất, 225 source ZIP, không có lỗi hash.
Báo cáo audit liệt kê chính nó đang chạy; result của audit đã PASS sau đó.

Hai lượt phát video 8 giây ở 1×/0,5× có 0 dropped frames. Đây là kiểm player
muted, không phải chấm cảm nhận hoặc nghe. Mẫu hình cho thấy đèn bám quai khi
nghiêng, nhưng chưa chứng minh điểm nghệ thuật ≥4,2. Candidate vẫn dùng art
phát triển cũ và audio im lặng có chủ đích, chưa phải phim production hoàn chỉnh.

## Tiếp tục theo thứ tự

1. U1: chọn và chuẩn bị final art, reference hợp pháp, 8 viseme/6 expression;
   review silhouette, các pose cực trị và styleframe.
2. U4/U2: retarget và chỉnh diễn xuất từ reference; sáu clip có ràng buộc đầu,
   cuối và contact. Nối trạng thái đèn nghiêng sang shot kế tiếp hoặc có hành
   động đặt lại, tránh snap về upright ở điểm cắt.
3. U5: nghe/chọn voice, chốt alignment; foley/music có quyền sử dụng; mix và nghe.
4. U6/U7: cùng bake để thử backend cần thiết; đo 3 cold + 5 warm sau art gate;
   mở rộng critic cho collision volumes và vòng sửa có giới hạn.
5. U8: hero được duyệt → sáu shot/48 giây → pilot 72 giây/hai vòng sửa → operator
   khác; tiếp tục Q3–Q9 theo roadmap. Không đánh dấu DONE cho phần thiếu đầu vào.

[Plan chi tiết](PLAN.md), [state](state.json), [issues](ISSUES.md),
[evidence](../../production/artifacts/quality/README.md),
[runbook](../../production/src/motion/README.md).

### V2 F1 checkpoint 14/11/2026
Boundary và ground critic đã có negative tests; S05 fixture 4 chân × 192 frame PASS, snap đèn tổng hợp bị phát hiện. 42 production TS, 23 Python, root verify PASS. F1 vẫn IN_PROGRESS vì S06/proxy collision còn tổng hợp và chưa tích hợp gate; xem `docs/reports/F1.md`.

### V2 F2 checkpoint 14/11/2026
Đã kiểm kê 117 SVG (116 filter, 58 stroke, 51 image nhúng), kèm hash/pivot. Chưa có mesh/render 1080p hoặc duyệt art; xem `docs/reports/F2.md`.
