# Kế hoạch tiếp theo sau PR #6

14/11/2026. Baseline review1278176; đây là kế hoạch CHƯA THỰC THI.
Ưu tiên U0–U8 của kế hoạch người dùng trước Q3–Q9. Dùng development assets cho
kỹ thuật trong lúc chưa chọn art/reference. [Review](REVIEW-2026-11-14.md),
[state](state.json), [chuẩn](standard.md). Không khởi động lại U0 hoặc render
lại các mốc đã PASS nếu không có thay đổi/lỗi cần giải thích.

## Đợt 1 — Chốt hợp đồng chuyển động và critic độc lập

**T01 — Continuity/end-state (U2/U6), ưu tiên đầu tiên.**
Kỹ sư motion/renderer dùng hero input/bake/frame stream hiện có. Đầu ra:
ShotBoundaryState gồm transform, ownership/attachment, pose, velocity, timebase,
art/rig/recipe/revision; validator cạnh nối và báo cáo seam.
Kiểm: giữ đúng ownership khi handoff; phát hiện đèn đổi từ−16,96° về0° không
có chủ đích; sai input/hash/timebase bị từ chối. Test hợp lệ có cut chủ ý hoặc
transition được khai báo; test không được tự coi mọi cut là phải continuous.
Gate: có fixture hai shot nối được và fixture sai bị chặn; golden cũ bất biến.
Nếu fail: sửa seam/transition của revision mới, không clamp output để giấu lỗi.

**T02 — Ground/contact/collision critic (U7), sau contract T01.**
Đầu vào là rig anchors, stance intervals và ground/collision proxy được khai
báo rõ cho fixture. Đầu ra: baseline-preservation metric tách ground slip thật;
world/projection drift, ground gap/penetration và prop/body overlap.
Kiểm: inject foot slide2px, chân nổi, xuyên nền, đèn xuyên torso, camera pan
với world contact giữ nguyên. Ground drift dùng ngưỡng≤1px đã khóa; strict
penetration báo riêng. Proxy/collision tolerance mới phải định nghĩa trước thử.
Gate: bắt đủ ca lỗi có chủ đích; không báo false positive ca camera/occlusion
hợp lệ; report lưu frame/evidence. Chưa suy proxy là hình học cơ thể chính xác.

**T03 — MotionClip evaluator có tham số (U2), sau T01/T02.**
Kỹ sư motion/technical artist định schema clip/rig capabilities, units, marker,
start/end constraints, retime, gaze và phạm vi intensity. Bắt đầu từ handoff
đang có, triển khai đúng một biến thể timing/emphasis được evaluator hỗ trợ.
Kiểm: parameter đổi thì pose/timing thực đổi; marker/contact giữ đúng; reverse/
random/concurrent seek tái lập; unsupported variation vẫn fail.
Gate: bỏ digest-equality guard chỉ cho tham số đã triển khai và có test; giữ
baseline. Sau đó mới triển khai sáu action nền: đi, nhấc, đặt, quay đầu, chào,
ngã nhẹ. Mỗi clip có contract/test riêng; clip kỹ thuật không là clip đã đạt diễn xuất.

T01–T03 có thể làm ngay bằng asset thử, không phụ thuộc API hoặc mua asset.
Chưa cần retarget/model mới hay thêm engine.

## Đợt 2 — Điều phối hẹp và chuyển động phụ

**T04 — Director/repair loop (U7), phụ thuộc T02/T03.**
Director chỉ chọn clip/parameter trong capability allowlist; không phát code
frame tùy ý. Đầu ra: bounded plan, patch phạm vi, trước/sau SHA, lỗi có cấu trúc,
attempt riêng và stop reason. Chạy bài script chưa dùng trong fixture, kèm ca
không đủ capability. Khóa số mẫu và định nghĩa đạt trước khi chạy.
Gate kỹ thuật: ≤3 lần sửa/shot, dừng khi không cải thiện hoặc hết budget; không
lặp khi schema/capability không hỗ trợ; không tự đánh dấu accepted. Đạt số đo
không tự thành “2/3 shot đạt nghệ thuật”; điều đó cần reviewer ở đợt sau.

**T05 — Spring/secondary fixture (U2/U3), khi đã chốt part cần chuyển động.**
Thử một chuỗi xương tóc/áo bằng bộ thử nghiệm: fixed-step, bake, seed/config
binding, giới hạn biến dạng và attachment. Chốt analytic/stability/long-run
protocol trước test. Gate: không bùng nổ/drift ngoài ngưỡng đã khóa, hash replay
khớp và không đổi main acting/contact; chưa cần chạy cloth toàn cảnh.
Nếu không cần cho hero đã chọn, ghi DEFERRED có lý do, không buộc thêm solver.

## Luồng song song — Đầu vào art/reference/voice

**T06 — Final art và reference (U0/U1/U4).**
Người dùng/art director chọn nguồn/budget và reference có quyền; technical
artist ghi URI/hash/rights, style bible,8viseme/6expression và giới hạn rig.
Ba hướng asset A/B/C trong USER-PLAN được so trên cùng nhân vật/nền/pose;
nguồn chưa có người/model/budget ghi BLOCKED, không bịa kết quả spike.
Đầu ra: pack/reference hợp pháp, model sheet, pose cực trị và styleframe1080p.
Gate người: hình≥4 và hướng style được chọn. Sau đó retarget/reference cleanup;
ba hành động so với clip gốc cần diễn xuất≥4 trước nâng thành library chất lượng.
Không thay production capability từ development assets được user cho phép thử.

**T07 — Voice/alignment/foley (U5), sau chọn giọng và timing T03.**
Sound/editor và animator chọn ngôn ngữ/voice được nghe duyệt; chạy alignment
có provenance, mapping viseme và sửa cue thủ công. Foley lấy event có source
rõ; authored contact không gọi là impulse đo từ physics. Nhạc/foley có quyền.
Gate: lip lệch≤2frame trên corpus đã chốt, foley±1frame,−16LUFS/TP≤−1dBTP và
người nghe duyệt. Hero im lặng hoặc test muted không đóng gate này.

## Đợt 3 — Hero đầy đủ → sáu shot → pilot

**T08 — Hero S05 (U6/U8):** tích hợp T01–T04 và đầu vào T06/T07, T05 nếu cần.
Xuất revision mới; cùng data cho backend cần so. Technical QC/decode/profile
và preview parity, xem1×/0,5× có/không tiếng; rubric mỗi mục≥4,mean≥4,2.
Nếu art/acting fail, sửa đúng asset/clip trước; không thêm hiệu ứng để che lỗi.

**T09 — Sáu shot48s:** chỉ mở sau hero đạt. Mỗi shot có clip/continuity/audio
và reviewer; hai vòng sửa kiểm locality/hashes. Không tái dùng approval giữa
revision. Candidate secondary chỉ được ghép khi seam được kiểm.

**T10 — Đo hiệu năng và pilot72s:** sau art/motion đạt mới chạy3cold+5warm
theo protocol, giữ output profile/phần cứng/concurrency công bằng. Ghi compile,
load/capture/encode/QC, memory, retry, công làm/sửa/duyệt; không suy muted playback
thành tốc độ sản xuất. Pilot72s có hai vòng sửa và metric accepted output.
Operator khác clone sạch, mở/sửa một note và tái tạo với evidence; CI hoặc cùng
agent mở process mới không thay operator độc lập.

Gate: U8 và những gate Q2 liên quan đạt thật, số liệu/giới hạn đã ghi; hoàn tất
phạm vi kế hoạch nâng cấp trước khi chuyển roadmap Q3–Q9. Q3 dùng evidence này
để viết ADR; không coi ADR chọn Rapier fixture là ADR backend production.

## Nợ app trước đưa vào sử dụng

**T11 — Draft recovery (ưu tiên cao trước dùng editor lâu dài):** sửa response
cũ xóa draft mới; test gõ tiếp khi save/voice/upload và đổi project. Không phụ
thuộc chọn art; có thể làm song song T01 bằng branch riêng khi triển khai.
**T12 — Integration debt:** đóng audio padding sát120s/240s, preview envelope,
render-cache fingerprint, production QC/recovery trước nối workbench vào app.
Đây là việc production sau khi có contract tương ứng, không phải capability
đã có nhờ workbench31tests.

## Quy trình và bàn giao

Mỗi task: một revision/attempt mới → test dương/âm đúng phạm vi → evidence →
update state/issue/docs → commit/push, không tự merge. Thay UI/API chạy browser;
thay media phải có output render/decode thật. Docs-only kiểm link/JSON và source
baseline, không lặp toàn bộ render. Lỗi giữ nguyên; không nới ngưỡng/golden.

Owner ở trên là vai trò cần có, chưa giả định đã có đội ngũ. Không gán số tuần
hoặc chi phí khi chưa có năng lực/budget và timing thực. Điểm bắt đầu triển khai
kế tiếp: **T01**, có thể song song chuẩn bị ground fixtures T02 và đầu vào T06;
T11 cần hoàn tất trước phiên editor có dữ liệu sáng tạo quan trọng.
