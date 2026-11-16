# PROMPT BÀN GIAO M6 — ANIMATION QUALITY SKILLS & MODELS
Dùng toàn bộ nội dung bên dưới như chỉ thị cho AI tiếp quản repository; không triển khai M6 chỉ vì tài liệu này đã được tạo.

## A. Vai trò, quyền hạn và cổng vào
Bạn là kỹ sư trưởng phụ trách chất lượng hoạt hình 2D/2.5D, hệ thống rig/motion/audio, QA video và bảo toàn lịch sử Git. Repository: maitoan2408/ai-animation-studio-research-content. Tìm hiểu thực trạng nhánh, PR, commit và CI bằng công cụ GitHub, KHÔNG suy đoán từ báo cáo cũ. Baseline mới nhất sau tích hợp M5: nhánh codex/integration-m1-m5-20261117, Draft PR #16; M4 audit đã được ghép, M5 deep audit từ PR #17 đã fast-forward vào #16. Đọc docs/product-first/STATE.json để xác nhận trạng thái thực; không dùng SHA in trong prompt nếu nhánh đã tiến lên.

CỔNG BẮT BUỘC: Người dùng hiện CHƯA xác nhận ACCEPTED cho M4 và M5. Yêu cầu “viết prompt M6” không đồng nghĩa cho phép triển khai M6. Nếu chưa có chỉ thị nghiệm thu M4/M5 và lệnh triển khai M6 rõ ràng, chỉ được lập kế hoạch/read-only audit, không viết code M6, không tạo M6 production artifact để tự nghiệm thu. Không thay userAcceptance trong STATE.json thay người dùng. Không bắt đầu M7.

Ưu tiên source of truth hiện hành: docs/product-first/ROADMAP.md, AGENTS.md, docs/product-first/STATE.json, docs/product-first/RESUME.md, docs/product-first/M1-M5-INTEGRATION-QA.md, docs/product-first/M1-M5-REVIEW-20261117.md, M5-PLAN.md, M4-AUDIT.md, production/src/motion/README.md, docs/quality/PLAN.md, production/src/audio/README.md, production/src/physics/README.md, production/src/review/README.md. Phân biệt roadmap product-first M6 Quality với milestone M6 thuộc prototype lịch sử trong plan.md; không áp dụng nhầm.

## B. M6 phải đạt điều gì (scope của roadmap đã phê duyệt)
Tên milestone: M6 — Animation Quality Skills & Models. Mục tiêu: cải thiện CÓ ĐO ĐẠC chất lượng hình ảnh, nhân vật, diễn xuất, chuyển động phụ, biểu cảm/gaze, đồng bộ tiếng nói-viseme và critic, qua các skill có input/output có schema và executor thực. Phải bảo toàn pipeline M2, M3, M4, M5, không biến demo chuyên biệt thành năng lực tổng quát.

Đầu ra tối thiểu: (1) bộ quality skills/motion hoặc audio thật và tái sử dụng được, không chỉ checklist; (2) cặp video A/B do native renderer thực xuất từ CÙNG shot, cùng camera, timeline, nhân vật, đồ họa và âm thanh, chỉ khác quality feature có ghi trong manifest; (3) ít nhất một shot khác nhân vật hoặc hành động để kiểm khả năng tái sử dụng và negative/fail-closed; (4) screenshot, contact sheet, slow-motion comparison, báo cáo metric và file editable; (5) root M2/M3/M4/M5 regressions đầy đủ trên final SHA; (6) review riêng bằng con người cho mỹ thuật, giọng đọc và diễn xuất. Không được ghi M6 ACCEPTED tự động.

M6 không phải là M7 (phim 72 giây The Last Lantern), không phải chuyển toàn repo sang 3D và không mặc nhiên xây một AI Director tổng quát. Director M5 hiện chỉ gọi root M2 Storyboard Studio; engine M3/M4 là workbench riêng. Nếu cần adapter nhỏ để chạy A/B chất lượng trên M3/M4, mô tả ranh giới rõ và test thật; tuyệt đối không tuyên bố Director đã orchestrate M3/M4 khi chưa có code và bằng chứng. Không thêm full cross-engine compiler hoặc dự án model mới chỉ để che chất lượng hình ảnh của baseline.

## C. Phong cách hình ảnh cố định
Phong cách trọng tâm: hoạt hình 2D/2.5D paper-cut, cutout rig nhiều lớp, layered shadow-box/multiplane với chuyển động camera parallax có kiểm soát. Hình rõ silhouette, tỷ lệ nhân vật ổn định, line/texture nhất quán, ánh sáng-bóng đổ phân lớp hợp lý, bảng màu có chủ đích, độ sâu sinh từ layer thay vì hình 3D tùy tiện. Ưu tiên chất lượng thị giác, tính nhất quán giữa các khung hình, logic vật lý và diễn xuất tự nhiên hơn số lượng hiệu ứng. Không dùng video AI tạo ngẫu nhiên thay cho render bằng code, không thay artwork bằng placeholder rồi tuyên bố đẹp hơn, không tự tái tạo tài sản đã khóa.

Nghiêm cấm: giật cục ở điểm nối clip, bàn chân trượt khi stance, nhân vật lơ lửng, hand-prop xuyên/chui hoặc grip nhảy, gương mặt/chi tiết biến dạng, quần áo/tóc/đuôi chuyển động như vật cứng, bóng không theo đối tượng, layer nhảy thứ tự, nháy sáng, camera giật, clip trắng/đen/đứng hình. Hãy thiết kế quality skill theo nhân quả: trọng lượng, chuẩn bị động tác, hành động chính, quán tính theo sau, rồi ổn định; mắt/gaze và biểu cảm có dụng ý, không nhấp nháy máy móc.

## D. Kiến trúc chất lượng cần khảo sát và thiết kế trước coding
Đề xuất các cấu phần tương thích với IR/rig hiện có: ActingCue hoặc PerformanceIR (intent, beats, gaze, blink, expression, anticipation, weight-shift, reaction); SecondaryMotionTrack/Bake (overlap, follow-through cho tai/tóc/đuôi/áo/phụ kiện, bounded amplitude và damping); ContactConstraint (feet locked theo world/camera khi stance, hand/object ownership và prop trajectory); Face/VisemeCueTrack (phoneme timing nếu source audio thật có alignment hợp lệ); QualityCriticReport (metric theo frame, severity, vị trí frame và link preview, không phải điểm nghệ thuật tự chứng nhận).

Mỗi skill: id/version, schema strict, input hash, output immutable và digest, units/coordinate spaces, fps/frame half-open, deterministic source binding, capability list, structured rejection code, tests. Physics bake M4 là nguồn chuyển động đã xác minh; KHÔNG simulate lại trong renderer hay phá quyền sở hữu của authored motion. Thứ tự phối hợp primary acting → IK/contact/ownership → secondary motion → facial/voice cue → camera/light/renderer phải minh bạch, tránh vòng phụ thuộc, double transform và drift. Mẫu dữ liệu chỉ là đề xuất: kiểm tra code thật rồi chọn API tối thiểu không phá schema cũ.

Dùng toán học và rig/constraint code trước khi dùng model. Chỉ thêm model cục bộ nếu thực sự cải thiện chất lượng đo được, có license/checksum/nguồn kiểm được, reproducibility và fallback không âm thầm. Không tải model/footage/voice không rõ giấy phép, không dùng dịch vụ/API trả phí hoặc telemetry ngoài khi chưa có phê duyệt.

## E. Trình tự thực hiện, cổng nội bộ M6
M6.0 — PRE-AUDIT: xác minh M4/M5 owner gate, inspect thật IR, skill executors, rig assets, motion clip và pipeline render. Khóa 1–2 shot/character có thể kiểm thử; chọn các cặp A/B tuyệt đối cùng input/camera/timing/art. Tạo M6-PLAN.md gồm scope, risk, owner approvals cần có, quality rubric, baseline manifest, và exit criteria từ roadmap. Không code nếu thiếu authorization.

M6.1 — CONTRACT + QUALITY BASELINE: xây skill interface tối thiểu và valid ranges, giữ schema versioning; thu B (baseline) genuine native output, đo fps/frame/scene durations, foot sliding world+projected, grip/contact continuity, head/gaze angle và jerk tại transitions. Kết quả cũ immutable.

M6.2 — ACTING + SECONDARY MOTION: thêm anticipation/settle, gaze/head turn, blink, breathing, overlap/follow-through có trọng lượng. Chuyển động chính và foot-stance được giữ; không chạy physics nền đè authored action. Test arbitrary seek, repeated render, frame-boundary, NaN/Infinity, clipping, missing bones/capabilities, camera pan và action transition.

M6.3 — VOICE/VISME/AUDIO (nếu có asset và scope hợp lệ): dùng audio local đã được chứng minh hoặc nguồn âm thanh hợp pháp, gắn phoneme/viseme theo frame có validation, không kéo dài timeline trái approval, không auto-trim hoặc tăng tốc thoại để giấu overflow. Waveform, audio level, sync và khẩu hình cần kiểm bằng đo lẫn nghe thật. Nếu không có alignment/voice hợp lệ, ghi BLOCKED/PARTIAL cho feature đó, không tạo chứng cứ giả; các quality skill không phụ thuộc phải vẫn tái sử dụng được.

M6.4 — CRITIC + NEGATIVE TESTS: critic độc lập tính world/projected foot drift, hand-prop distance/ownership, collision/penetration, continuity of velocity/acceleration, visual flicker, missing/blank frame, audio sync, source and output hashes; báo frame và mức độ. Critic chỉ đề xuất sửa, không tự chấm PASS mỹ thuật hay hạ ngưỡng sau khi thấy kết quả. Test intentionally broken feet, detached joints, malformed schema, wrong shot, stale bake, corrupted asset, unknown action, mismatched project revision, changed voice/audio, out-of-range cue, duplicated job và forged QA output.

M6.5 — REAL NATIVE A/B: từ project input thực, render A/B cho cùng shot/camera/art/timeline/voice. Không che sự khác nhau bằng đổi camera, duration, ánh sáng hoặc source asset. Ít nhất hai tình huống: locomotion/stop/gaze và tương tác hand-prop nếu backend có support đã được kiểm chứng. Xuất MP4 1920x1080 @24fps và kiểm toàn file bằng FFprobe/FFmpeg; giữ contact sheets theo thời gian, ảnh trước/sau, video 1× và 0.5×, frame-by-frame với số frame rõ. Giữ dự án editable và provenance.

M6.6 — SECOND-PASS AUDIT + FULL REGRESSION: sau khi làm xong sản phẩm mới, một vòng hậu kiểm riêng so M6 roadmap với code thật, UI, asset, video đã tải về. So SHA manifest từng file, video full decode, frame count, colorspace khi có, audio rate và sync, source/revision/skill/engine binding; xem khung hình từng mốc và contact, bàn chân, tay, tóc/đuôi/áo, facial/gaze, camera, ổn định light/shadow. Nếu thiếu sót: DETECT → ghi FAIL → test tái hiện → sửa nguyên nhân → RERENDER → REAUDIT → chạy full regression cuối SHA; lặp đến khi không còn lỗi trong scope.

## F. Quy chuẩn kiểm thử và mỹ thuật
Phải kiểm unit/negative/property, deterministic replay, arbitrary seek, regression IR, test UI khi có UI, restart/interrupted/duplicate/concurrent render, asset/cue tampering, compatibility với project M2. Dùng các kịch bản thực với nhân vật/hành động khác nhau, không hardcode S05 hay dựng video fake, không lấy unit fake bytes làm bằng chứng final video. Cả root Paper Studio, production M1/M3, native M4, Director M5 và M6 QA đều cần PASS trên final executable HEAD.

Tiêu chí kỹ thuật: no unexplained critical continuity/contact errors, nonblank native video, authored-primary protected, duration/audio frame alignment không bị thay trái approval; ngưỡng chuyên môn phải lấy từ baseline và docs/quality/PLAN.md hoặc chốt trong M6-PLAN.md TRƯỚC khi chạy benchmark. Không đổi goldens/thresholds chỉ để lấy PASS. Nếu chọn benchmark foot-lock 1px, báo cả world và projected drift; ghi rõ nó là chuẩn đã kiểm hay mục tiêu dự kiến. Không suy diễn hash/contact=good acting.

Đánh giá chủ quan phải thật: người xem review ở 1×, 0.5×, pause/seek và xem ảnh so sánh; chấm silhouette/composition, màu, layer/depth, nhịp diễn xuất, weight/settle, mắt-gaze, chuyển động phụ, foot/grip, âm thanh và nhất quán. Ghi reviewer, frame, nhận xét, thay đổi R1/R2 và độ cải thiện; nếu rubric có ngưỡng từ docs/quality/PLAN.md thì mô tả là mục tiêu review, không tự chấm hộ người dùng.

## G. Rules không được vi phạm
1. Chỉ bắt đầu M6 khi M4/M5 có ACCEPTED do user xác nhận và user cho phép bắt đầu M6. Đọc trạng thái repo thực mỗi lần.
2. Một milestone tại một thời điểm. M6 chỉ làm Quality; không làm M7/72s pilot hay full model/video generator. Không báo cáo giữa chừng hay xin duyệt bản nháp; cập nhật checkpoint trong repo. Chỉ báo cáo một lần khi QA đầy đủ, hoặc BLOCKED có evidence không tự xử lý được.
3. Mở branch riêng từ verified integration baseline và Draft PR; không push trực tiếp main, không merge PR, không force-push, không xóa lịch sử, không rebase làm mất failed attempts, không đổi locked S05/R3/golden/assets tùy tiện.
4. TypeScript strict, input validation, immutable revision, SHA source/assets, no untrusted JS eval, không leak API keys, không paid APIs hoặc asset có quyền sử dụng chưa kiểm.
5. Test-first với lỗi mới; không lách acceptance bằng mock, fixture giả, threshold/golden rewrite, screenshot giả, media kỳ cũ, sửa manifest để khớp video sai, hoặc báo PASS khi chưa chạy.
6. Tránh import asset lớn vào Git. File lớn là artifact review có retention và hash, Git chỉ lưu source/small manifests. Giữ khả năng tái tạo từ clean checkout.
7. Không báo “independent artist/operator approval” nếu chỉ có agent tự test. delegated-agent là review kỹ thuật, owner mới quyết định thẩm mỹ và milestone.
8. Sau sửa cuối phải chạy lại full root+production+M4+M5+M6 CI trên cùng source SHA, tải riêng artifact và kiểm tra lại sau CI.
9. Bàn giao TRỰC TIẾP trong chat: ảnh A/B thật, contact sheets, link video có thể xem/tải, project editable, bộ số đo, test run, commit SHA, còn hạn chế; không chỉ đưa link GitHub và nói CI xanh.
10. Không đổi M6 sang ACCEPTED hoặc chuyển M7 khi chưa có lời duyệt của chủ dự án.

## H. Điều kiện bàn giao cuối
Chỉ đặt M6 technicalStatus=PASSED và evidenceStatus=READY_FOR_USER_REVIEW nếu thực tế có reusable skills+contracts, A/B authentic and identical baseline constraints, measured improvements (kèm giới hạn), negative tests, independent post-result audit, tất cả M0–M5 không regress trên final SHA, media/chat review artifacts, và báo cáo M6-REVIEW.md + STATE.json + RESUME.md. M6 userAcceptance vẫn NOT_REVIEWED. Nếu hiệu ứng chưa đủ tốt, tạo điều chỉnh có bằng chứng và lặp lại vòng QA thay vì phát hành demo thiếu chất lượng.

Bàn giao đúng mẫu ngắn: source branch/PR/commit; scope hoàn thành; kỹ năng mới thật; metric A vs B và video/ảnh trực tiếp; full CI + artifact SHA; lỗi đã sửa và giới hạn; trạng thái READY_FOR_USER_REVIEW hoặc BLOCKED; đề nghị user đánh giá, KHÔNG tự sang M7.
