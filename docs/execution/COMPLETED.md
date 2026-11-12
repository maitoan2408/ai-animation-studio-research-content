# Tổng kết hiện hành — 13/11/2026

Đã hoàn tất phần kỹ thuật màu/media và chương trình review Q2. **Q2 chưa DONE và
chưa production-ready:** còn nghe thoại, chấm chuyển động, bàn giao operator độc
lập và benchmark sau art gate. Không thay những kết quả cũ đã đạt.

| Phạm vi | Kết quả đã có | Giới hạn còn lại |
| --- | --- | --- |
| Prototype v0.1 M0–M6 | Studio từ script→scene/audio→render/QC→review/export; pilot13s; verify16/integration13/UI9 tái kiểm PASS | Không thay productionQ0–Q9 |
| Q0 | Brief/style/reference/rubric/output khóa theoủy quyền | Reviewer delegated-agent |
| Q1 |64 SVG gốc,3 views,rig/contact; voice local;117asset polish riêng | Chưa nghe duyệt voice |
| Q2 readiness/blocking |6load cases,48seek captures/36matches;12native A/B clips | Bounded tested environment |
| Q2 polish/edit/native |Sáu shot48s,hai vòng sửa,1152frames/bản,normalized audio;70native hashes+6replay frames và edit/reopen | Full art/motion, independent operator còn mở |
| Q2 media v2 |Chart max1≤3; real-art MAE0.504–0.662/P95≤2;1152decodedYUV exact và AAC/source/master không đổi cho R0/R1/R2 | SDR local Chromium reference; không mọi player/hardware |
| Q2 review program |19workbench tests,16Python tests,13real-browser workflow checks PASS; desktop/mobile/journal/export/restart | Test records không là duyệt mỹ thuật hoặc nghe |
| Q2 tái lập từ Git |Commit065a02c cài bằng cache mới, khôi phục ba video đúng SHA, typecheck,19tests và13browser checks PASS | Checkout ngoài repo trên cùng máy; không thay independent operator |
| Q2.5 |Protocol3cold+5warm đã viết | NOT_RUN tới khi art/motion đạt |
| Q3–Q9 |Kế hoạch/backlog/đường quay lại có sẵn | NOT_STARTED, không bỏ qua |

[Bộ review v2 và lệnh mở](../../production/artifacts/Q2/web-review-v2/README.md),
[code/runbook](../../production/src/review/README.md), [state](state.json),
[gate](../../production/evidence/Q2/gate.json), [bước tiếp](RESUME.md).

CI mở rộng trên source headd82da6e: [workbench](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43329136529) và [v0.1](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43329136433) đều SUCCESS, gồm standalone Git-only; [job/step evidence](../../production/artifacts/Q2/ci-standalone-repaired-20261113.json). Các commit tổng kết sau đó chỉ thay tài liệu/evidence.

## Những lỗi đã sửa trong đợt này

- EX-024: master→web v1 khiến chart sai tối đa34. Bản từ PNG native, full-range
  và CRF0 đạt max1, giữ ngưỡng3/inset2; master không thay. Byte-range/presented-frame
  evidence tách khỏi kiểm màu. Các phương án fail vẫn còn.
- EX-025: thứ tự callback video/seeked làm UI giữ nút lưu disabled; đã sửa và
  test seek/step,hai phiên bản và xung đột hai cửa sổ.
- EX-026: native PNG bắt đầu0 nhưng flatten ban đầu đọc1; đã sửa và kiểm đủ tất
  cả frame, không chỉ số lượng. EX-027: isolated app runner thiếu build CLI; đã
  thêm bước build, integration và UI PASS, artifact cũ không đổi.
- Thêm chia/ghép video có hash, chặn chunk hỏng/path/symlink/overwrite và giữ
  temporary evidence. V2 mỗi video≈114MB, là bản xem local chất lượng cao.
- EX-028: clean standalone `npm ci` từ Git phát hiện layout lock không hợp lệ;
  chuyển vị trí12 package, giữ nguyên mọi version/URL/integrity. Bản commit mới
  chạy lại đủ sáu lệnh PASS. [Report và cách tái lập](../../production/artifacts/Q2/fresh-review-20261113/README.md).

- EX-029: CI standalone không đọc được Git checkout khác UID. Đã thêm trust
  cho đúng ROOT ở hai lệnh read-only, giữ cấu hình global; negative exit128,
  full-flow giả lập khác owner và [actual CI standalone](../../production/artifacts/Q2/fresh-review-20261113/ci-standalone-report.json) đều được ghi nhận.

R2 phát48.042s,0dropped khi không render đồng thời. Hai lần R0/R1 chạy cùng
encoder rơi5/19frames; giữ nguyên và không gọi là số đo công bằng. Chưa có phút
phim accepted hay giá/phút accepted; ngân sách API/GPU trả phí vẫn0.

Audit sau sửa CI kiểm201 completed attempts và153 source ZIP,
không có lỗi hash. Attempt audit duy nhất còn INCOMPLETE trong lúc tự quét đã
kết thúc PASS sau đó. [Report audit](../../production/artifacts/Q2/final-audit-ci-repair-20261113.json). Các report audit trước vẫn được giữ.

[Tổng kết trước đợt này](history/COMPLETED-through-2026-11-12.md), Word/PDF,
master/native cũ, source ZIP và toàn bộ fail logs vẫn được giữ để tái lập.
