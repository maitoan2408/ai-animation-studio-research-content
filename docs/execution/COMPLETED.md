# Tổng kết phần đã thực hiện — 12/11/2026

Đây là trạng thái thực thi, không sửa lại các báo cáo nghiên cứu lịch sử.
Quyết định hiện hành do `delegated-agent` thực hiện theo ủy quyền; chưa có người
review độc lập hoặc duyệt release. Phần còn dở giữ nguyên trong state/RESUME.

| Phần | Kết quả có bằng chứng | Giới hạn còn lại |
| --- | --- | --- |
| M0–M6 prototype | Source/UI/CLI và các bộ test đã bàn giao trong lịch sử repo | Không tự nâng thành production |
| Nghiên cứu Word/toolchain | Hai vòng phân tích, nguồn pin, kiểm harness, kế hoạch Q0–Q9/F01–F11 | Manim chỉ mở khi có shot phù hợp |
| Q0 | Brief The Last Lantern, paper-cut multiplane, 72s pilot, rubric/output/6-shot benchmark đã khóa | Reviewer theo ủy quyền |
| Q1 art/rig | 64 native SVG, ba body/head views, styleframes, pivots/anchors, alpha/hash/IK/contact; sửa EX-006–010 | Chưa nghe duyệt local voice EX-011 |
| Q1 environments | Three/Chromium, Blender Eevee và Kokoro local chạy thực; lock/license/repro docs | Software graphics; không đại diện GPU vận hành |
| Q2.1 contracts | 6 load cases, 48 HF captures/36 repeat comparisons; 1.152 frame hình học; source snapshot cho run mới | Tách khỏi art gate |
| Q2 blocking A/B | **12 clip 1920×1080/24fps**, mỗi nhánh 48s; frame/profile/full decode PASS; native Blender six-shot bundle | Blocking, chưa phải polish/pilot/production release |
| Sửa lỗi Q2 | Entry HF, giảm tốc bước cuối, tay đối nhịp, Blender exception exit, VSE mirror đã được tái hiện và sửa | Giữ cả logs/takes bị loại |

## Nơi xem và tái tạo

- [12 clip và manifest](../../production/artifacts/Q2/blocking-r0/manifest.json).
- [A: six shots](../../production/artifacts/Q2/blocking-r0/A/).
- [B VSE: six shots](../../production/artifacts/Q2/blocking-r0/B-VSE/).
- [Native six-shot Blender + textures/source JSON](../../production/artifacts/Q2/blocking-r0/native-blender-vse.zip).
- [Source renderer A](../../production/src/render/README.md), [native Blender](../../production/src/blender/README.md),
  [môi trường](../../production/ENVIRONMENT.md), [issue ledger](issues.md).

## Những việc chưa được tính là hoàn thành

Q1 nghe duyệt voice; Q2 polish/review chuyển động, hai vòng sửa, cold/warm samples
và handoff độc lập; Q3 quyết định kiến trúc; Q4 contracts/registry; Q5 library/corpus
voice/stems; Q6 workflow sửa/preview parity; Q7 QC/cache/recovery; Q8 phim 72 giây;
Q9 release nội bộ. Không bỏ hoặc gộp các phần này vào kết quả blocking.

Không ghi công AI elapsed thành giờ animator con người. Các batch A/B chạy đồng
thời nên wall time ở log là số đo run đó, **không phải** so sánh cold/warm công bằng.
Chưa có phút phim accepted, nên cost/minute accepted chưa xác định; paid API = 0.
