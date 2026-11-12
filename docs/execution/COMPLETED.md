# Tổng kết phần đã thực hiện — 12/11/2026

Đã tiếp tục từ checkpoint, giữ mọi kết quả cũ và cả các lần lỗi. Trạng thái hiện
hành: **Q0 hoàn thành theo ủy quyền; Q1/Q2 có nhiều phần kỹ thuật hoàn thành nhưng
chưa đóng toàn bộ gate chất lượng; Q3–Q9 chưa bắt đầu.** Không tự nâng demo thành
production. Reviewer hiện tại là `delegated-agent`, không giả người dùng đã duyệt.

## Kết quả đã bàn giao

| Phần | Kết quả có bằng chứng | Giới hạn |
| --- | --- | --- |
| M0–M6 prototype | Source/UI/CLI, revision/review/export/import và tests trong lịch sử repo | App v0.1 giữ nguyên; chưa phải production quality |
| Nghiên cứu Word/toolchain | Hai vòng phân tích, nguồn pin, harness và kế hoạch Q0–Q9/F01–F11 | Không tự mở các nhánh tương lai có điều kiện |
| Q0 | Brief The Last Lantern, paper-cut multiplane, pilot 72s, rubric/output và six-shot benchmark khóa | Quyết định theo ủy quyền |
| Q1 art/rig | 64 native SVG, ba body/head views, styleframes, pivots/anchors, alpha/hash/IK/contact | Voice chưa nghe duyệt |
| Q1 môi trường | Three/Chromium, Blender Eevee/VSE và Kokoro CPU chạy thật; locks/license/repro docs | Software graphics, chưa đại diện máy vận hành |
| Q2 readiness/seek | 6 load cases, 48 HF captures/36 repeats; 1.152 frame geometry/contact | Không suy thành acting score |
| Q2 blocking A/B | 12 clip 1080p/24fps; mỗi nhánh 48s; decode/profile PASS | Giữ nguyên blocking cũ, chưa chọn backend Q3 |
| Q2 polish B | Pack riêng 117 asset, bóng giấy/tiếp đất; six-shot native clips; S02 sửa dáng đi khom | Full-motion/color review chưa hoàn tất |
| Q2 hai vòng sửa B | R1 chỉ S01/S03; R2 chỉ S04/S05, đổi thứ tự; unrelated clip hashes nguyên vẹn | Không tuyên bố hai vòng tương tự đã chạy trên A |
| Q2 sequence/QC | R0/R1/R2 mỗi bản 1.152 decoded frames khớp clip đã chọn, PCM đúng offset, AAC lag 0 | Benchmark 48s, không phải pilot 72s |
| Q2 loudness | Cả ba bản đã cân mức: −16.02 LUFS, true peak −1.93/−1.98 dBTP | Voice sparse, chưa full music/SFX/stems hoặc nghe duyệt |
| Q2 native replay/edit | ZIP 70 file hashes; 6 random-seek frames khớp pixel; sửa 292 native camera curves rồi reopen đúng ảnh | Cùng agent; handoff operator độc lập chưa chạy |
| Test mới nhất | 15 workbench tests + 4 editorial negatives + 3 loudness contracts; typecheck; app verify 16 tests PASS | Không thay artistic/perceptual gates |
| Audit log/source | 125 completed attempts và 77 source snapshots kiểm hash, không lỗi | Số liệu tại audit; self-run đang chạy được ghi rõ, không giả thành thất bại |

## Mở kết quả

- [Video R0/R1/R2 đã cân âm lượng, native Blender và QC](../../production/artifacts/Q2/review-final/README.md).
- [R2 xem gần nhất](../../production/artifacts/Q2/review-final/R2/normalized-delivery.mp4).
- [Before/after và phạm vi sửa](../../production/artifacts/Q2/edit-history.json).
- [Bảng gate Q2](../../production/evidence/Q2/gate.json), [issue ledger](issues.md),
  [hướng dẫn tiếp tục](RESUME.md), [môi trường](../../production/ENVIRONMENT.md).

EX-015/016/017/019/020/021/022/023 đã có tái hiện, sửa và kiểm lại. EX-018 đã thêm
shadow layers và giữ geometry. Bản ZIP native đầu từng lỗi relative path; bản lỗi
vẫn còn. Tên commit cũ ghi "verified" quá sớm đã được đính chính trong changelog;
chỉ test replay thực tế là bằng chứng.

## Việc chưa hoàn thành, không được bỏ qua

| Bước tiếp | Cần làm và điều kiện đóng |
| --- | --- |
| Q1/Q2 nghe và motion review | Nghe voice thật; xem 1x/0.5x, ghi timestamp/notes và rubric từng shot. Playback tự động muted không thay review |
| Q2 T-MEDIA-01 / EX-002 | Khóa target-player/display reference và tolerance trước chạy; hoàn tất alpha/profile negatives. BT709→sRGB inverse MAE 0.878/p95 2; Chromium MAE 6.963/p95 11, chưa tự coi là đạt |
| Q2 handoff | Operator khác mở bundle và sửa một note, ghi thời gian/lỗi; cùng agent mở process mới chưa đủ |
| Q2.5 / EX-013 | Sau gate hình/motion, chạy 3 cold + 5 warm theo protocol, peak process-tree RSS; chưa dùng batch concurrent làm số đo công bằng |
| Q3 | ADR chọn backend và giới hạn, capability/error matrix, scope/budget Q4–Q9 dựa trên evidence |
| Q4 | Contracts/registry/version/dependency graph, import/migration/export và negative tests |
| Q5 | Motion/voice corpus, editable cues, stems và perceptual sync |
| Q6 | Workflow sửa/review/preview parity, bounded agent; EX-004 |
| Q7 | Color/QC/cache/recovery/fault injection; EX-002/005 |
| Q8 | Pilot 72s theo tám shot, hai vòng sửa, full source/stems, effort thực |
| Q9 | Internal release, clean-machine reproduction, operator docs và acceptance |

Manim/F10 vẫn có điều kiện vì pilot chưa có shot giải thích; không ép dependency
thiếu vào pipeline chính. Chưa có phút phim accepted nên cost/accepted-minute
chưa xác định. Tổng command elapsed trong audit gồm job song song, không phải giờ
animator, CPU-hours, thời gian lịch hoặc SLA. Paid API/GPU budget vẫn bằng 0.
# Bổ sung checkpoint Q2 — 12/11/2026, 22:27 ICT

- Công cụ review local đã có code, CLI/HTTP/UI và hướng dẫn.19 workbench tests
  (15 cũ+4 nhóm review) PASS;13 kiểm tra Chromium UI PASS, gồm seek/step,2 tốc độ,
  lưu/reload, hash/revision isolation, xung đột2 cửa sổ, export, restart,390px.
- Fix EX-025: kết hợp presented-frame proof với seeked, không gán sai frame khi
  browser phát sự kiện khác thứ tự. Nhật ký test ghi automated-test, không giả human.
- Media chart v1 FAIL được giữ. V2 native full-range/losslessYUV đạt max1 với
  ngưỡng3/inset2 không đổi. R0 đã khớp1152decodedYUV và AAC; EX-026 indexing đóng.
  R1/R2 và player real-art vẫn đang kiểm; chưa tuyên bố color gate toàn bộ xong.
- Git checkpoint933c611 đã giữ failures. Xem state/RESUME mới nhất thay vì suy
  phase DONE từ các kết quả kỹ thuật trong phần lịch sử dưới đây.
