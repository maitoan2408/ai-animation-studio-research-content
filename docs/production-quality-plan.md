# Kế hoạch nâng chất lượng production — chờ duyệt trước khi triển khai

Ngày: **11/11/2026**. Người dùng yêu cầu vòng này nghiên cứu và lên plan, chưa code. Trạng thái hiện tại: **nghiên cứu đã lập; Q0–Q9 bên dưới chưa thực hiện**. Không dùng checklist kế hoạch làm bằng chứng PASS.

Đầu vào: [nghiên cứu chất lượng](../reports/Nghien_cuu_chat_luong_production.md), Word gốc, demo tại `b79ec76497b7cb57f753f596cb60969aae3383d2`, phản hồi demo tốt nhưng chưa đạt production. Giữ nguyên kết quả M0–M6 và toàn bộ [roadmap P0–P11](roadmap-full.md).

## 1. Mục tiêu và cách ra quyết định

Tạo studio nội bộ từ kịch bản thành hoạt hình paper-cut, layered shadow-box và multiplane có hình ảnh, diễn xuất và khả năng sửa đạt tiêu chí được người dùng duyệt. Mốc đầu là **một phim chuẩn 60–90 giây** làm đủ quy trình; sau đó mới mở rộng độ dài/nội dung. Đây là pilot sản xuất, không phải giới hạn dài hạn của sản phẩm.

Ưu tiên chất lượng: hình/diễn xuất phải vượt gate trước khi so tốc độ/giá. Mỗi kiểu chất liệu có thể cần backend khác, nhưng vòng đầu chỉ productize một backend chính đã thắng thử nghiệm. Cho phép shot được animator dựng riêng và nhập về với đầy đủ source/revision.

Quy tắc chuyển giai đoạn: **khóa input → làm đầu ra cụ thể → đo/review → ghi lỗi → sửa nguyên nhân → kiểm lại → duyệt**. Nếu thất bại, trở lại stage gây lỗi; giữ mọi take/evidence cần thiết. Không tự tăng điểm, nới ngưỡng hoặc bỏ shot khó để đạt gate.

### Trách nhiệm cần có

| Vai trò | Trách nhiệm/quyền quyết định |
| --- | --- |
| Người dùng / producer | Duyệt art target, kịch bản, phim và thay đổi phạm vi/ngân sách |
| Art director / illustrator | Thiết kế nhân vật, bối cảnh, palette, vật liệu; duyệt silhouette/style |
| Animator / technical artist | Rig, pose, acting, contact, camera/layout; review chuyển động |
| Pipeline engineer | Adapter, manifest/schema, deterministic evaluation, render, data và recovery |
| Editor / sound | Nhịp dựng, tiếng nói, cue, SFX/music, mix và master |

Một người có thể kiêm vai. Chưa giả định đã có nhân sự hay máy GPU. Sau thử nghiệm Q2 mới ước lượng lịch bằng công thực đo và năng lực đội; không gắn số tuần thiếu cơ sở vào từng stage.

## 2. Toàn bộ các giai đoạn và phụ thuộc

| Stage | Phụ thuộc | Kết quả phải bàn giao | Gate | Trạng thái |
| --- | --- | --- | --- | --- |
| Q0 Mục tiêu hình/motion | Kế hoạch được duyệt | Brief, rubric, reference có nguồn, phạm vi pilot | Người dùng duyệt chuẩn hình và yêu cầu motion | NOT_STARTED |
| Q1 Art pack thử và môi trường | Q0 | Styleframes, model/pose sheet, asset phân lớp, môi trường/license manifest | Hình được duyệt, asset đủ sáu shot | NOT_STARTED |
| Q2 Thử các phương án | Q1 | Phim sáu shot, source, measurements, lỗi và hai vòng sửa | Có phương án đạt mọi yêu cầu bắt buộc | NOT_STARTED |
| Q3 Chọn kiến trúc | Q2 | ADR, backend chính/phụ, scope triển khai, ước lượng từ số đo | Người dùng duyệt lựa chọn có video minh chứng | NOT_STARTED |
| Q4 Asset/rig/scene contract | Q3 | Registry, rig versions, action/shot IR, migration | Art pack nhập/xuất/replay được; dữ liệu sai bị chặn | NOT_STARTED |
| Q5 Acting và audio | Q4 | Action library, diễn xuất, viseme/cue, sound stems | Sáu shot đạt art/motion/speech gates | NOT_STARTED |
| Q6 Workflow chỉnh sửa và agent | Q4–Q5 | Storyboard/animatic, review theo frame, bounded patches | Sửa đúng phạm vi; kiểm planner và thao tác người dùng | NOT_STARTED |
| Q7 Render/QC/vận hành | Q4–Q6 | Master pipeline, cache theo shot, recovery/backup | Render ổn định và không báo thành công sai | NOT_STARTED |
| Q8 Pilot production | Q5–Q7 | Phim 60–90 giây, hai vòng sửa, source bàn giao, chi phí thực | Người dùng duyệt phim; người khác tái tạo được | NOT_STARTED |
| Q9 Phát hành nội bộ | Q8 | Release, runbook, training, upgrade/rollback, backlog | Vận hành nội bộ có người chịu trách nhiệm | NOT_STARTED |

### Q0 — khóa mục tiêu có thể duyệt

**Chủ trì:** producer + art director + animator.

1. Lấy ba hướng trong Word làm đầu vào; chọn một hướng làm phim chuẩn đầu tiên. Hai hướng còn lại giữ trong backlog có gate riêng, không tự tuyên bố đã hỗ trợ production.
2. Thu thập frame/cảnh tham chiếu có nguồn và ghi rõ thích gì: nét, chất liệu, tỷ lệ, nhịp, acting, camera. Không chỉ đưa tên phim/style.
3. Chốt profile giao hàng đầu: đề xuất 1920×1080/24 fps, SDR Rec.709; review ảnh ở kích thước mục tiêu. Ngôn ngữ lấy từ kịch bản; VI có corpus riêng nếu dùng. Portrait/4K cần yêu cầu và test riêng.
4. Chọn hero character và bối cảnh từ nội dung được duyệt. Ghi rõ độ lớn biểu cảm, góc quay, vật liệu có được deform hay không, cadence on ones/twos, đối tượng xem.
5. Chốt các tiêu chí ở mục 4; ghi người có quyền duyệt và các lỗi chặn.

**Đầu ra dự kiến:** `production/brief.md`, `style-bible.md`, `reference-register.csv`, `quality-rubric.md`, shot list có revision. Các tên file này là thiết kế bàn giao tương lai, chưa tạo giả nội dung.

**Gate:** người dùng có thể chọn frame/motion target cụ thể và chỉ ra điều bắt buộc. Nếu còn “đẹp hơn” nhưng chưa rõ đẹp theo hướng nào, làm lại reference/thumbnail/animatic, chưa khóa backend.

### Q1 — tạo hình chuẩn và asset pack thử

**Chủ trì:** illustrator + technical artist; engineer phụ trách môi trường.

1. Tạo ba styleframe thuộc hướng chọn: wide có depth; close-up mặt/tay; cảnh tiếp xúc prop. Chốt palette, line weight, edge/alpha, texture scale và hệ ánh sáng.
2. Model sheet nhân vật: neutral, front/3⁄4/profile theo shot list; pose quan trọng/cực trị; expressions và hình bàn tay; mouth sheet nếu có thoại cận mặt. Không hứa xoay tự do từ một ảnh.
3. Nền đủ các lớp trước/giữa/sau, vùng bị che và overscan theo camera; prop có grip/placement anchors. Phân biệt texture ổn định với line-boil được phép.
4. Có thể thử Qwen-Image-Layered để hỗ trợ tách lớp; artist sửa vùng khuất, overlap, mép, pivot. Lưu input/output và quyền; tách lớp đúng không đồng nghĩa rig đúng.
5. Chuẩn bị sáu shot ở mục 3, một audio đã duyệt và animatic timing. Khóa art/brief chung trước khi A/B.
6. Pin commit/dependency/release/checkpoint; xác định license code, model, asset, font và voice. Tạo môi trường thử riêng; không cài toàn bộ repo tham khảo vào studio.

**Gate:** styleframes/pose sheet được người dùng duyệt; pack đủ để dựng shot mà không phải tự đoán kiểu nhân vật. Kiểm alpha trên nền trắng/đen, extreme pose, layer order và asset missing. Fail hình: trở lại art; fail môi trường/license: đổi thành phần rồi kiểm lại.

### Q2 — thử để chọn được chất lượng cao, trước khi xây rộng

**Chủ trì:** technical artist + engineer, producer duyệt kết quả.

**A. Code/Canvas/WebGL:** chọn các kỹ thuật MIT phù hợp từ Lemo/ClaudeAnimationBase, dùng art pack của studio. Thiết kế material, action và camera có kiểm soát; nếu cần tích hợp mã thì làm sau duyệt kế hoạch và giữ notice.

**B. Blender 2.5D:** dùng planes/cutouts, rig và compositing; Grease Pencil chỉ khi nét vẽ/pose cần nó. Cùng nhân vật, palette, motion beats, thoại và shot duration như A. Khóa release và color transform. Không dùng demo Blender khác làm kết quả A/B.

**C. Rig editor có điều kiện:** thử Spine Professional + Pixi nếu A khó sửa pose/rig hoặc cần animator thao tác bằng editor. Nếu đội mạnh Moho/Harmony, thử đường authoring → xuất shot trước; không giả định chuyển mọi constraint sang runtime khác giữ nguyên.

**D. Tạo sinh có điều kiện:** tối đa hai mô hình/provider trong đợt đầu, chọn theo shot/máy/quyền. Wan-Animate phù hợp bài toán video drive + ảnh nhân vật; LTX hoặc một API là đối chứng. Không phải lộ trình phụ thuộc bắt buộc để A/B hoàn tất. Nếu không chạy D, ghi NOT_RUN và vẫn giữ nghiên cứu, không coi khả năng D đã bị bác bỏ.

Thực hiện sau khi được duyệt:

1. Dựng sáu shot, review blocking trước polish; ghi công art, rig, animation, shader và camera riêng.
2. Render master và proxy. Với model thấp hơn 1080p, giữ bản native; mọi upscale/frame interpolation phải ghi rõ và chấm cả trước/sau. Không che lỗi native bằng hậu xử lý không công bố.
3. Review che nhãn công cụ; cùng màn hình, audio và thứ tự được đổi giữa người chấm. Xem tốc độ thật rồi soi các frame lỗi. Chấm từng shot, không chỉ montage tốt nhất.
4. Hai vòng sửa ở mục 5. Ghi công sửa và phần bị ảnh hưởng. Chất lượng không qua thì sửa, hoặc loại nhánh với lý do và evidence.
5. Đo performance sau khi đã có output đạt: 3 cold + 5 warm theo định nghĩa cố định; công bố từng mẫu/median/range, peak RAM/VRAM. Không gọi đây là SLA p95.
6. Nhánh tạo sinh nếu chạy: khóa cấu hình, tối thiểu 5 take/shot stress đã chọn; giữ mọi take và lý do loại. Số mẫu này phục vụ quyết định thử, chưa đại diện mọi kịch bản. Cùng trần ngân sách/effort giữa các model; vượt trần thì dừng nhánh và ghi BLOCKED_BUDGET.

**Đầu ra:** source editable, manifest, video từng shot, contact sheets, review có frame/timestamp, measurements CSV, issue log, cost sheet và license list. Không commit checkpoint/GPU cache.

**Gate:** ít nhất một nhánh đạt hard gates của toàn bộ sáu shot. Nếu chỉ một vài shot đạt, phân tích có thể dùng backend phụ không; tính thêm công nối pipeline. Nếu cả hai A/B chưa đạt, quay Q1 cho art hoặc Q2 cho rig/acting, chưa productize.

### Q3 — quyết định backend và khối lượng triển khai

**Chủ trì:** engineer + art director; producer duyệt.

1. Viết ADR có video/link/evidence, các phương án bị loại và lý do; nêu giới hạn góc nhìn, nhân vật, prop và simulation.
2. Chọn backend chính đạt chất lượng. Nếu các nhánh cùng đạt tương đương, ưu tiên công sửa, khả năng tái sử dụng và vận hành đơn giản hơn. Không dùng giá rẻ để bù thiếu diễn xuất.
3. Định nghĩa backend phụ/shot thủ công chỉ khi có cảnh cần; contract gồm frame range, handles, alpha/color, audio/stems, source và asset hashes.
4. Ước lượng bằng công thực Q2: asset/rig dùng lại bao nhiêu; số shot mới mỗi phút; tỷ lệ cần người sửa; compute/take bị loại. Nêu phạm vi ước lượng và dự phòng, không kéo tuyến tính chi phí của demo 13 giây.
5. Chốt backlog Q4–Q9 và lịch theo người thực hiện, kèm các mục chưa đo.

**Gate:** có lựa chọn review được bằng video và số đo. Nếu user chưa duyệt hình, giữ ADR PROPOSED. Sau duyệt mới mở rộng ứng dụng theo nhánh triển khai riêng.

### Q4 — dữ liệu, asset registry và rig có phiên bản

**Chủ trì:** engineer + technical artist.

1. Mở rộng schema theo nhu cầu đã chứng minh ở Q2: shot instance, asset/view/rig version, pose/action curves, anchors, layer order, camera, cue references; định nghĩa timebase và world/local/screen coordinates.
2. AssetRevision chứa bytes/hash, source/rights, bounds/alpha/color, preview và trạng thái draft/approved. Rig có pivot/parent/constraint/view, mouth shapes và giới hạn pose.
3. Định nghĩa contract backend: input đã validate, profile, frame range, required assets, pinned environment; output master + manifest + diagnostics. Missing capability phải báo lỗi rõ.
4. Migration version mới; test input cũ bằng checkout cũ và migration có chủ đích; không ghi đè accepted revisions.
5. Dependency graph xác định shot stale khi thay asset/rig/cue. Export source editable và không có dependency ẩn ngoài manifest.

**Gate/test:** missing asset, sai pivot/view, ID lạ, malformed image, lỗi color/alpha, dữ liệu cũ, conflict revision, tampered hash; import/export/rollback giữ version. Nếu renderer không biểu diễn được contract, quay Q3 thu hẹp/đổi adapter.

### Q5 — diễn xuất, contact và thoại

**Chủ trì:** animator + sound/editor; engineer làm evaluator/adapter.

1. Action có phase và marker: anticipate/reach/grip/lift/hold/place/release; walk có contact/passing/flight theo phong cách, vào/dừng bước và đổi hướng.
2. Root motion gắn phase; solver/pose giữ chân theo ground plane; prop chuyển parent/constraint đúng frame. Test camera di chuyển cùng lúc để bắt nhầm tọa độ.
3. Key pose/breakdown/hold/overshoot do animator duyệt; action có intent, amplitude, timing và transition constraints. Thêm drawing replacement khi deform không giữ được hình.
4. Gaze, eyebrow/head/torso và gesture theo lời thoại; miệng là một kênh trong expression, không ghi đè toàn khuôn mặt.
5. Corpus tối thiểu 20–30 câu ngôn ngữ mục tiêu: silence, nói nhanh, âm cuối, cảm thán, tiếng cười, tên riêng. Rhubarb/aligner chỉ tạo draft cue; lưu audio/transcript/model hashes, confidence và sửa tay.
6. Voice, music, SFX thành stems; loudness/true peak theo output profile đã duyệt. Foley gắn contact, nhạc có khoảng nghỉ. Duyệt phát âm và diễn xuất giọng.

**Gate/test:** sáu shot đạt motion/acting/sync; thông số cực trị không tách chi; chuyển action không bật pose; seek ngẫu nhiên/đảo khớp forward render trong môi trường đã khóa. Cue sai phải hiện cho người sửa. Nếu dữ liệu rig thiếu góc/shape: quay Q1/Q4.

### Q6 — quy trình từ kịch bản và chỉnh sửa có kiểm soát

**Chủ trì:** engineer + editor, animator review.

1. Script → beat/shot list → storyboard → animatic có thoại → blocking → polish → composite → master. Lưu duyệt giữa công đoạn, không coi text storyboard là hình đã được duyệt.
2. UI xem revision, compare take, scrub frame, note theo shot/frame, chỉnh cue/timing/pose hoặc gửi shot sang DCC. Accepted artifact bất biến.
3. Agent dùng catalog asset/action/camera và capability đã khai; patch có expected revision, phạm vi cho phép và lý do. Unsupported request tạo task cho người, không fallback âm thầm.
4. Đánh giá planner tối thiểu 20 tình huống đúng + 20 input lỗi/không hỗ trợ; gồm multi-character/prop/view đổi nếu đã được hỗ trợ. Đo số patch phải sửa và continuity, không chỉ JSON hợp schema.
5. Các thao tác bắt buộc: sửa một từ thoại; đổi expression; thay asset; đổi camera; rollback; xuất/reopen dự án. Review cũ phải stale khi phụ thuộc đổi.

**Gate/test:** workflow thật bằng browser/CLI; invalid/conflict/cancel; patch không làm thay shot ngoài phạm vi đã khai. Art note không bị đóng chỉ vì lệnh render thành công. Nếu thao tác sửa quá khó, quay Q4 contract hoặc Q5 controls.

### Q7 — master, QC, cache và vận hành

**Chủ trì:** engineer + compositor/editor.

1. Chốt alpha straight/premultiplied và color transform giữa backend, composite và encode; thử nền trắng/đen, shadow, saturated colors, gradients. Không trộn sRGB/linear/Rec.709 tùy ý.
2. Nếu dùng sequence trung gian: manifest frame count/range/fps; audio WAV/stems riêng. MP4 master và source package gắn cùng revision. OTIO chỉ làm editorial interchange; phải bundle/resolve media riêng và kiểm round-trip effect.
3. Cache theo shot và toàn bộ dependency, gồm backend/template/asset/rig/cue/color/render profile; không đánh dấu hit khi file/hash sai.
4. Technical QC: full decode, frame count/resolution/fps, audio timing, missing required asset, alpha/color samples, blank/frozen frame có xét shot hold. Contact/viseme checks khác với art approval.
5. Fault matrix: kill worker ở các điểm ghi; disk full; process render treo; output nửa chừng; corrupt cache; browser/GPU context lost; restore backup. Chỉ publish sau QC; retry không ghi đè artifact đã duyệt.
6. Pin môi trường; GPU simulation có warm-up/fixed step hoặc cache phù hợp; lưu device/backend/version. Chỉ cam kết bit-exact khi đã đo; test tolerance có căn cứ cho raster khác máy.

**Gate:** các ca lỗi có log và recovery đúng, không false success; clean machine replay trong phạm vi đã khóa. Fail hình do composite: quay Q1/Q3/Q5 đúng nguyên nhân; fail hệ thống: sửa và chạy lại ca liên quan.

### Q8 — phim production chuẩn và hai vòng sửa

**Chủ trì:** producer + các vai sản xuất.

1. Chọn kịch bản 60–90 giây có kể chuyện, cận mặt, tương tác và camera; không chỉ ghép sáu fixture thành demo mới.
2. Đi đủ storyboard/animatic/blocking/animation/composite/sound/review. Ghi công theo vai và số vòng sửa.
3. Thực hiện hai vòng sửa cụ thể ở mục 5; giữ phiên bản trước/sau, thay đổi phụ thuộc và review.
4. Người không dựng ban đầu mở source trên môi trường sạch, sửa một note và render lại. Kiểm khả năng khôi phục dữ liệu/đường dẫn/asset.
5. Tính chi phí/phút **được duyệt**, gồm setup phân bổ, art/animation/sửa, take bị loại, compute/provider và QC. Báo cả tổng chi phí pilot trước phân bổ.

**Gate:** người dùng duyệt phim thật; không còn lỗi chặn; source tái tạo được; công/chi phí có raw log. Nếu chưa đạt, lập lỗi theo shot và quay Q1/Q5/Q6/Q7; không gọi là production vì phần mềm đã đủ màn hình.

### Q9 — release nội bộ và duy trì chất lượng

**Chủ trì:** engineer + người vận hành + producer.

1. Release/tag, release notes, capabilities/unsupported cases, hướng dẫn artist/animator/operator và mẫu dự án.
2. Cập nhật AGENTS.md, agent.md, plan.md, skills.md, ADR, schema/API docs, source notices và runbook theo chức năng thực đã có. Không viết tài liệu mô tả feature chưa tồn tại như đã hoàn tất.
3. Backup/restore, retention/quota, người có quyền duyệt, quyền truy cập, budget guard/provider secrets, upgrade/rollback và lịch kiểm lại goldens.
4. Track lỗi sau phát hành và accepted-minute throughput. Mở thêm style/ngôn ngữ/độ dài bằng pilot tương ứng; không tự thừa kế approval của style đầu.
5. Push code, plan và evidence để người dùng review; không tự merge hoặc xuất bản video.

**Gate:** người vận hành thực hiện được tạo/sửa/render/review/export/recover; người dùng duyệt release. Các giới hạn còn lại công khai trong backlog.

## 3. Bộ sáu shot bắt buộc cho Q2

Đề xuất tổng 48 giây ở 24 fps; khung dưới là fixture, không thay kịch bản phim pilot. Có thể điều chỉnh trước khi khóa Q1; khi đã so sánh phải giữ cùng brief.

| ID | Dài | Nội dung và yêu cầu | Lỗi cần phơi bày |
| --- | --- | --- | --- |
| S01 | 8 s | Close-up: nghe tin, đổi cảm xúc, nói một câu rồi giữ phản ứng | Mặt không sống; khẩu hình theo volume; drift khuôn mặt; pose bật |
| S02 | 8 s | Đi tới điểm, giảm tốc, dừng, quay nhìn; camera pan nhỏ | Chân trượt, root/phase lệch, trôi ground/contact shadow |
| S03 | 10 s | Với lấy cốc, cầm, nhấc, giữ, đặt xuống, thả tay | Tay xuyên/rời prop; prop pop khi đổi parent; thiếu trọng lượng |
| S04 | 8 s | Dolly/pan qua foreground–character–background, che khuất và thay focus | Lộ mép/background thiếu, shadow sai lớp, alpha halo, focus sai chủ thể |
| S05 | 8 s | Hai nhân vật nhìn nhau, chuyền một vật, phản ứng lệch nhịp | Nhầm chủ thể, handoff sai, continuity và screen direction |
| S06 | 6 s | Pose cao trào có anticipation, góc nhìn khó hoặc foreshortening, settle | Rig mất silhouette, chi méo, lặp motion, không có pose replacement |

S01–S03 chấm kỹ acting/contact; S04 kiểm material/camera; S05–S06 bắt lỗi tổng quát hóa. Hai phong cách còn lại cần ít nhất styleframe và bộ shot stress phù hợp trước khi công bố production support.

## 4. Rubric và hard gates đề xuất

### Người chấm và cách ghi nhận

Đề xuất producer + animator/art director chấm độc lập, rồi thống nhất bằng frame/note cụ thể. Nếu chưa có reviewer chuyên môn, kết quả chỉ là tạm thời. Người dùng quyết định duyệt cuối. Thứ tự A/B thay đổi, che tên tool; lưu cả chênh lệch ý kiến. Đây là so sánh cho dự án nhỏ, không phải nghiên cứu thống kê đại diện toàn thị trường.

| Nhóm | Trọng số đề xuất | Điểm 1 | Điểm 3 | Điểm 5 |
| --- | --- | --- | --- | --- |
| Art/material | 30% | Sai style, hình lỗi | Đúng chủ đề nhưng còn thô | Đạt reference, đọc rõ, vật liệu thống nhất |
| Acting/motion | 35% | Khó hiểu action, contact lỗi | Đọc được nhưng cơ học | Intent/weight/phrasing rõ, pose có sức diễn |
| Layout/camera | 15% | Cản đọc câu chuyện | Bố cục dùng được | Dẫn mắt và hỗ trợ nhịp kể |
| Continuity | 10% | Đổi nhân vật/prop/không gian | Một vài lệch cần sửa | Nhất quán trong và giữa shot |
| Khả năng sửa | 10% | Sửa một chỗ phải làm lại không kiểm soát | Sửa được nhưng nhiều thao tác | Sửa rõ phạm vi, giữ phần đã duyệt |

Đề xuất ngưỡng: tổng ≥80/100; **art và acting từng mục ≥4/5**; không còn lỗi chặn. Các số này là tiêu chí dự thảo để duyệt ở Q0, chưa được hiệu chỉnh thực nghiệm. Không lấy điểm trung bình sáu shot che một shot thất bại; ghi điểm từng shot và review sequence hoàn chỉnh.

### Lỗi chặn và phép đo

| Gate | Cách kiểm đề xuất | Cách xử lý khi fail |
| --- | --- | --- |
| Hình/identity | Silhouette, tỷ lệ, nét/màu so model sheet; xem cut và close-up | Sửa art/rig/view, không chỉ tăng resolution |
| Hand/prop contact | Project cả hai anchors qua cùng camera; đo sai khác từng frame trong pha grip | Sửa constraint, parent switch và timeline |
| Foot lock | Track điểm chân với mặt đất trong pha trụ, bù camera; tách world và screen drift | Sửa root/phase/solver, xem lại frame chuyển pha |
| Ngưỡng marker | Ban đầu ≤2 px ở 1080p cho fixture khóa, theo roadmap cũ; pose smear có ngoại lệ phải duyệt trước | Nếu ngưỡng không hợp style, giải thích và duyệt lại trước đo; không đổi sau để che lỗi |
| Layer/alpha/shadow | Nền sáng/tối, occlusion contact sheet, pan/zoom cực trị | Sửa asset/composite/material |
| Speech sync | Cue closure/release với waveform và audio, note từng trường hợp; ngưỡng ban đầu ±2 frame cho mốc dễ nhận | Sửa cue bằng người; không tuyên bố “VI chính xác” từ pass schema |
| Temporal stability | Xem tốc độ thật và vùng crop theo chủ thể, phân biệt boil/on-twos có chủ ý | Sửa randomness/simulation/texture; không tự nội suy mọi frame |
| Replay | Forward, seek đảo/ngẫu nhiên, process mới; so decoded frame trong môi trường pin | Reset/precompute simulation hoặc sửa evaluator |
| Artifact | Full decode, profile/frame count/audio/hash; required assets đủ | Chặn publish, giữ attempt/log rồi retry sau sửa |

Các phép đo marker chỉ áp dụng khi representation có anchor đáng tin cậy. Với clip tạo sinh, phải annotate/track và review độ tin cậy; không tự coi detector landmarks là ground truth. Một score mỹ thuật của VLM/VBench chỉ gợi ý vùng cần xem.

## 5. Hai vòng sửa và công thức chi phí

**Vòng 1 — sửa cục bộ:** đổi màu áo hoặc chi tiết prop ở S03; đổi một câu thoại dài hơn tại S01; sửa eye-line/biểu cảm. Đo công chỉnh art/rig/cue/timing, shot nào bị invalidated, phần nào giữ nguyên.

**Vòng 2 — sửa dựng/không gian:** đổi camera S04; kéo dài reaction 12 frame tại S05; đảo thứ tự hai shot hợp kịch bản trong pilot. Kiểm lại continuity, shadow, audio, frame range và cache dependency. Giữ bản accepted trước sửa để rollback.

Một revision kéo dài thoại có thể ảnh hưởng scene sau; phải khai rõ phạm vi hợp lý. Không đặt yêu cầu “không frame nào khác được đổi” khi thay đổi thời lượng buộc phải dịch timeline. Với model tạo sinh, đo mức drift ngoài vùng yêu cầu và tỷ lệ take cần loại.

Log tối thiểu: candidate/version, shot/revision, source/asset/audio hashes, device/runtime, native/output resolution/fps, upscale/interpolation, seed/workflow, attempt, active human minutes theo vai, render elapsed, RAM/VRAM, API cost, lỗi, quyết định review, accepted duration.

**Chi phí/phút được duyệt = (công người quy đổi + compute/API của mọi take + xử lý/sửa/QC + setup được phân bổ) ÷ số phút cuối được duyệt.** Khi chưa có đơn giá nhân sự, báo giờ công và tiền compute riêng; không tự gán mức lương. Setup lần đầu và chi phí lặp phải được báo riêng để không làm sai kỳ vọng.

## 6. Đối chiếu P0–P11, không bỏ giai đoạn còn dở

| Giai đoạn Word | Kết quả cũ giữ lại | Phần production hoàn tất ở kế hoạch này |
| --- | --- | --- |
| P0 Brief/reference | Hướng studio, ba phong cách | Q0; Q1 duyệt art target; Q8 duyệt phim |
| P1 Environment/license | Lockfile, doctor, CI/clean install | Q1 khóa công cụ mới; Q7 máy vận hành; Q9 upgrade |
| P2 Assets/fixtures | Fixture procedural | Q1 art pack; Q2 sáu shot; Q5 cực trị |
| P3 Renderer decision | Kết quả HyperFrames/Remotion và ADR tạm | Q2 so chất lượng; Q3 ADR mới có evidence |
| P4 IR/compiler | Schema/evaluator v0.1 đã có | Q4 mở rộng có migration; Q6 patch contract |
| P5 Registry/rig | Audio hashes/revisions/package | Q4 image/rig/version/dependency registry |
| P6 Actions/acting | Năm action mẫu | Q5 contact, foot lock, acting; Q8 sequence thật |
| P7 Voice/alignment/mix | Draft voice, WAV, envelope | Q5 corpus/viseme/stems; Q7 master audio |
| P8 Agent/skills | Hợp đồng skills, offline planner | Q6 provider/eval/bounded patches; Q9 docs thực |
| P9 Render/QC/recovery | Queue/retry/cache/QC đơn process | Q7 per-shot cache, fault matrix, restore |
| P10 Pilot/cost | Demo kỹ thuật 13 giây | Q8 phim 60–90 giây, hai vòng sửa, accepted cost |
| P11 Productize | UI/CLI/docs/CI | Q9 roles/operation/release; mở rộng từng style có gate |

## 7. Phạm vi đã hoàn tất ở vòng nghiên cứu này

- Đọc/đối chiếu Word, source và khả năng hiện tại; khảo sát nguồn chính thức và đọc file ở các commit đã khóa.
- Lập phân tích, lựa chọn thử, rubric, sáu shot, vòng sửa, kế hoạch Q0–Q9 và đối chiếu đủ P0–P11.
- Lưu manifest nguồn, mức bằng chứng và giới hạn. Giữ nguyên app code, dependencies, Word gốc, video/test evidence cũ.
- **NOT_RUN:** Q0–Q9, benchmark backend/model, trial DCC, gọi API trả phí, kiểm chất lượng tiếng Việt và duyệt production. Chưa có lời hứa deadline hoặc chi phí production thực đo.

Điểm bắt đầu sau khi người dùng duyệt kế hoạch là **Q0 → Q1 → Q2**. Việc chọn cả stack production trước khi có kết quả Q2 sẽ bỏ qua chính bài toán chất lượng cần giải quyết.
