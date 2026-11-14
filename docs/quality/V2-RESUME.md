# V2 checkpoint — F1 technical provisional, F2 IN_PROGRESS

F1: native S05 frame stream publish now gates declared ground, ownership and projected alpha overlap with source and texture hashes. Real S02 stance and S06→S05 declared cut tested. Scope is limited: 2D alpha ≥128, no 3D collision or artistic approval; those remain open. See `docs/reports/F1.md` and F1 evidence.

F2: full 192-frame silent 1080p technical candidate and separate 86-contour still; layer/contact shadow, edge fidelity and creative review remain open. See `docs/reports/F2.md`. F3 depends on F1 and F2 and remains unopened until F2 technical gate. Human art, voice, license and independent handoff remain open. Core plan and previous history unchanged.

F2 torso spike giờ dùng pivot manifest; test hình học và anchors so với rig có rotation/scale âm PASS; ảnh 1080p có tại `production/artifacts/quality/v2-f2/spike/pivot-comparison.png`. Mới một asset, chưa chứng minh rig toàn cảnh hay styleframe.

F2: 22 part contour alpha threshold 128 roundtrip nhị phân và triangulation diện tích PASS; frame S05 108 có 71 sprite, 31 đùn, so flat/volume 1080p tại `production/artifacts/quality/v2-f2/s05-scene`. Cả hai có yaw minh họa từng phần có thể lệch rig, chưa có bóng mới, chỉ một frame; F2 vẫn mở. Xem F2 report trước khi tiếp tục.

F2 tiếp theo: bản frame 108 bỏ per-part yaw, giữ face transform 2D, oblique shear trên body và directional VSM shadow receiver chung. So có/không shadow có thay đổi; chưa xác minh shadow theo layer hay contact sàn, chỉ một frame và chưa duyệt art. Artifacts `production/artifacts/quality/v2-f2/s05-oblique`, xem F2 report. F2 vẫn IN_PROGRESS.

F2 face anchor/contour coverage kiểm S05 tất cả 192 frame; ảnh thử 0, 108, 191 ở 1080p. Chưa kiểm animation, bóng đúng layer hoặc chất lượng art. F2 vẫn mở.

F2 coverage: 117 raster phát triển hash/decode PASS (51 R3 giữ nguyên + 66 mới), 58 foreground contour binary/triangulation PASS. 59 background/shadow/effect chưa mesh; 7 mouth state và 4 nhãn mood chưa đủ 8 viseme/6 biểu cảm. Giữ F2 mở; xem F2 report.

F2: thêm pack draft độc lập 3 mouth (8 nhãn ngoài rest) và 18 đầu sad/surprised/angry cho 2 nhân vật × 3 góc; giữ pack cũ. Preview tại `production/artifacts/quality/v2-f2/draft-sheets/`, chưa ghép rig hay kiểm phoneme/voice, chưa duyệt art; F2 vẫn mở.

F2 overlay riêng 138 asset được build từ 117 cũ + 21 draft, test rig 288 tổ hợp anchor và bake cũ từ chối art hash khác. Chưa có shadow mới của draft, bake/renderer overlay và review art/voice. F2 vẫn mở.

F2 overlay v2: 156 asset gồm 18 shadow draft; bake mới khớp 192 frame số gốc, 156 texture hash/decode và 79 foreground contour; preview frame 108 thay đúng 6 selector tại `production/artifacts/quality/v2-f2/overlay-preview`. Chưa animation, cue, layer-aware shadow hay art review; F2 IN_PROGRESS.

F2 thử receiver-only: ẩn 29 paper shadows, giữ contact cũ, một VSM receiver chung; ảnh `production/artifacts/quality/v2-f2/receiver-only/volume.png`. Chưa layer-aware/ground physical, chưa motion hay art review.

F2: 79 contour overlay 4× binary roundtrip/triangulation và render S05 1080p; 1× regression giữ SHA, so hai lưới khác 7.810 pixel. Có style bible, 3 vector model sheets và board bóng; chưa chứng minh anti-alias, animation, shadow layer/contact hay art approval. Xem F2 report.

F2: native-size silent 192-frame candidate decoded and independently checked; uses 79 foreground contours and flat background. A separate 1080p still includes all seven background contours (86 assets, 38 required instances). No art/audio/physical-shadow approval. See F2 report; F2 IN_PROGRESS.

F2: 86-contour scene đã chạy preview im lặng 192 frame tại 640×360, seek nhiều thứ tự khớp; frame 24 đủ 38/38 contour bắt buộc. Chưa render đủ 1080 với nền đùn.

Kế hoạch chi tiết F2 mới được lưu `PROPOSED-Q0-Q9-F2-DETAIL-20261114.md`. T0 baseline/công cụ ΔE hoàn tất mức kỹ thuật, ngưỡng chưa xác minh; T0b ADR đề xuất, chưa triển khai. T1 và T2 mỗi mục có ba thử nghiệm nhưng chưa đạt visual/parity/shadow: xem F2 report và ảnh `t1/`, `t2/`; giữ F2 IN_PROGRESS và không mở F3.

T3–T6 đã thử riêng: contact lấy bốn sole/ground fixture, back-edge seed, màu sợi UV và glow ở anchor đèn. Chỉ là prototype partial, chưa chứng minh bóng lớp/flicker hoặc ghép preset. T0b có thử audit trên tám bản sao dedup nhưng chưa chạy full fresh review/security; recorder giữ nguyên. T1/T2 và các cổng F2 còn mở, xem F2 report.

T3 có thêm thử shadow-card (31 card, 29 paper-shadow ẩn; 640p frame 108 render lặp chính xác). Có thể đổ lên sai lớp và chưa kiểm contact/motion, nên vẫn PARTIAL; xem F2 report và `t3/shadow-cards-compare/`.

T3 lần ba ghép contact và shadow-card trong mode riêng; 1080 và motion chưa được xác minh. Ba cách thử chưa qua gate, giữ PARTIAL.

T0b có dedup ZIP opt-in, kiểm tám attempt mới và Git archive trong repo tạm, audit evidence cũ PASS; mặc định legacy vì full `check_fresh_review`/Windows chưa chứng minh. T1/T2/T3 vẫn PARTIAL, đề xuất fixture và phân tích Lambert tại `docs/research/f2-lighting-investigation.md`. Không nhận F2 hoàn thành.

F2 fixture nghiên cứu: bốn màu Lambert/Basic trung tính trùng tại tâm; receiver chữ nhật nhận bóng caster alpha trong fixture, không leak ngoài. Chưa kiểm S05/đủ art. Fresh review source 2ba07ea PASS, dedup opt-in có hai attempt thật audit PASS, cần Git-only lại với các symlink thực trước khi cân nhắc mặc định.

T0b Linux kỹ thuật PASS: Git-only audit/fresh review trên source 046875c (chứa symlink dedup thật), tám attempt tạm chia sẻ archive. Default Linux chuyển dedup-v1, explicit legacy được hỗ trợ; ngoài Linux vẫn legacy chưa kiểm. F2 tiếp tục IN_PROGRESS.

T4–T6 thử thêm: edge-alpha chỉ prop 1080; bump vật liệu 0,6/2 có ảnh control; point light tại anchor đèn cường độ 0,4/1. Phần khác biệt tinh và chưa kiểm gate animation, receiver, art; T1–T6 vẫn PARTIAL, không đóng F2.

T4 shader edge-alpha không tăng alpha trong fixture texture đèn offscreen; chưa chứng minh toàn rig. T5 bump 0,6 có preview S05 192 frame 640×360: decode/seek PASS, hai crop tĩnh không đổi; không suy toàn cảnh hết flicker hoặc duyệt art. F2 còn IN_PROGRESS.

T6 point light 0 khớp byte control ở một frame. Regression mới 79 TS, 49 Python, typecheck/root verify PASS; không suy F2 PASS.

Có bảng so các thử nghiệm riêng và checklist `F2-REVIEW-PREPARATION.md`; người tự xem là delegated-agent, phần lớn tiêu chí chưa đạt, chưa có styleframe final hoặc điểm HQ-02.

Bump preview 192 frame đã render lần hai cùng máy/browser: mọi hash frame và MP4 trùng; không suy ra chất lượng hay parity đa máy.

CI source 7184935: app PASS, workbench FAIL vì alpha critic gọi Python hệ thống thiếu Pillow. Workflow sửa PATH đến venv QC; retest diagnostics qua venv cục bộ PASS, CI source sửa chưa có kết quả.

CI source e6d705e sau sửa Python PATH: workbench 43638665678 và app 43638665774 PASS; workbench 79 TS, 51 Python. F2 vẫn IN_PROGRESS theo visual và HQ-02, xem F2 report.
