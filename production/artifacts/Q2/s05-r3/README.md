# S05 R3 — hai bàn tay đọc rõ khi chuyền đèn

13/11/2026. **Đã sửa EX-032 trong phạm vi shot; Q2 vẫn IN_PROGRESS.**

- [Video để xem, 8 giây/1080p](web-review.mp4?raw=true) — sRGB full-range web profile.
- [Master BT.709 limited](master.mp4?raw=true), [source Blender + textures](native-S05-R3.zip?raw=true).
- [Ảnh so trước/sau](contact-comparison.png), [frame R2](R2-frame72.png), [frame R3](R3-frame72.png).
- [Kết quả và hashes](report.json), [QC web](web-qc.json), [native replay](native-replay.json),
  [giữ nguyên 1.152 frame nguồn cũ](legacy-report.json).

R2 dùng chung một grip point cho hai bàn tay trong local frames 72–107. R3 cho
Mai giữ bên trái quai SVG (51,25), An giữ bên phải (110,27). Tay được giải từ
transform của đèn, không dời ảnh sau render hoặc kéo dài xương. Hai điểm cách
nhau 47,79 px ngang trong camera 1080p; khoảng trống giữa hai lòng bàn tay và
quai đọc rõ hơn trên các ảnh đã xem. Đường đi đèn, camera, thời lượng, phản ứng
R2 và năm shot khác giữ nguyên. SVG/texture cũ không thay.

21 tests production, typecheck và root verify16 PASS. Kiểm tất cả grip frames
theo hai điểm trên quai; wrist liên tục khi thả. Native clip đủ192 frames/24fps,
full decode PASS. Web có192 converted-YUV frames khớp và AAC không đổi. Hai lượt
muted playback1×/0.5× chạy hết,0dropped; color sample frame72/108 MAE≈0.663/0.665,
P95=2 trong ngưỡng cũ. Đây là kiểm chức năng player, không phải nghe/chấm motion.

Native ZIP gồm41 file hashes, `project/S05.blend`, texture relative và source
frame JSON. Restore sang đường dẫn mới, seek191/0/72/48/191/72 khớp pixel. Cùng
agent thực hiện, chưa thay cho operator độc lập. Clip S05 không có thoại, track
AAC im lặng có chủ ý; chưa chứng minh sound design hoặc chất lượng giọng.

## Tái tạo và tiếp tục

Từ repo root, runtime theo `production/ENVIRONMENT.md`; giữ các take trước.

```bash
python scripts/run-step.py Q2 r3-export -- production/node_modules/.bin/tsx production/src/blender/export_frames.ts production/brief/edit-R3.json production/out/blender-R3-new
python scripts/run-step.py Q2 r3-native -- env BENCHMARK_INPUT_DIR="$PWD/production/out/blender-R3-new" BLENDER_USER_CONFIG=/tmp/studio-blender-config blender --background --factory-startup --python-exit-code 1 --python production/src/blender/vse_probe.py -- S05 1920 all
```

Take mới có `result.json`; chỉ dùng khi PASS_TECHNICAL. Export tạo input sáu shot
nhưng **chỉ render S05**. Khi ghép candidate vào sequence, giữ R1 S01/S03, R2 S04,
S02/S06 hiện có và thứ tự R2; đừng dùng toàn bộ export R3 thay mọi shot.
R3 hiện là candidate riêng; catalog48s R0/R1/R2 không đổi. Chưa có full sequence
R3 hoặc approval chuyển từ R2 sang R3. Việc ghép cần revision mới và binding/QC.

Các lệnh web/native-package/replay cụ thể được lưu trong các attempt có prefix
`s05-r3` ở `production/evidence/Q2/`. Source ZIP của từng attempt giữ code lúc chạy.
Mở ZIP bằng Blender4.3.2, giữ `project/` và `textures/` cùng cấp; không cần model
voice để xem/sửa shot này. [Kế hoạch sửa](../../../../docs/execution/S05-REPAIR-PLAN.md).

## Lỗi kiểm thử đã giữ và sửa

- Test contact R3 ban đầu fail vì code cũ vẫn bám điểm chung. Bằng chứng giữ nguyên.
- Test release ban đầu so grip marker của hình tay nắm với hình tay mở. Marker
  này hết ràng buộc sau release; sửa assertion sang wrist pivot thực. Không nới
  ngưỡng contact2px trong các frame còn nắm.
- Helper replay ban đầu so `-0` trong RAM với `0` đã ghi JSON. Sửa để so đúng
  representation JSON xuất cho Blender; toàn bộ1.152 frame lưu cũ khớp chính xác.

Chỉ nhận **sampled visual repair** cho EX-032. Còn full1×/0.5× artistic review,
voice listening, operator độc lập và3cold+5warm sau art gate. Không chạy survey
công cụ/style/Manim ngoài phạm vi sửa này.

## CI checkpoint

Cả [hai workflow](ci-workflows.json) trên source `6c36e93` SUCCESS, gồm root
verify/build/integration/UI và workbench contracts/media/browser/recovery/standalone
Git-only. [Chi tiết workbench](ci-workbench.json). [Audit checkpoint](checkpoint-checks.json)
kiểm18 artifacts,18 attempts đã kết thúc và131 links; log lỗi auditor đọc result
của chính nó khi còn chạy giữ nguyên, retest loại đúng recorder đang sống đã PASS.
Commit chốt sau source trên chỉ thêm tài liệu/evidence, không sửa runtime.
