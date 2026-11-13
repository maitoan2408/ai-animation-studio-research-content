# Q2 — bộ xem lại sau polish và hai vòng sửa

**Đây là benchmark 48 giây, chưa phải pilot 72 giây hoặc release production.**
Quyết định/kiểm tra kỹ thuật do `delegated-agent`; chưa có người nghe duyệt voice,
reviewer hoạt hình độc lập hoặc người khác mở/sửa dự án. Không đánh dấu các bước
đó PASS từ test tự động.

## Video và thay đổi

| Bản | Video đã cân âm lượng | Nội dung |
| --- | --- | --- |
| R0 | [Xem/tải](R0/normalized-delivery.mp4) | Six-shot polish, S02 đã sửa dáng đi khom |
| R1 | [Xem/tải](R1/normalized-delivery.mp4) | S01 thoại dài hơn, lông mày/hướng đầu; S03 đổi màu cốc |
| R2 | [Xem/tải](R2/normalized-delivery.mp4) | Giữ R1; giảm pan S04, An phản ứng muộn 12 frame S05, đổi thứ tự dựng |

Mỗi bản: 1920×1080/24 fps, 1152 frames, H.264 BT.709 limited/AAC 48k stereo. Không
upscale/interpolation. Các file `delivery.mp4` cũ trong từng thư mục giữ nguyên
để đối chứng trước cân âm lượng. File chuẩn nghe lần này là `normalized-delivery.mp4`.
Loudness thực đo trên AAC: R0 −16.02LUFS/−1.93dBTP; R1/R2 −16.02LUFS/−1.98dBTP.
Đây chỉ là voice benchmark thưa; chưa có full score/SFX/stems của phim pilot.

Từng version giữ 1.152 decoded frames khớp clip đã chọn; PCM nguồn đúng offset,
AAC trước/sau gain đo lag 0. [Báo cáo sửa](../edit-history.json) chứng minh R1 chỉ
render lại S01/S03, R2 chỉ S04/S05; các clip không liên quan giữ SHA. Những số đo
này không chứng minh acting hay phát âm tự nhiên.

| Shot | Mốc R0/R1 | Mốc R2 | Cần xem/nghe |
| --- | --- | --- | --- |
| S01 | 0–8s | 16–24s | Thoại, lông mày, ánh mắt, mouth cues |
| S02 | 8–16s | 8–16s | Chuyển trọng lượng, chân trụ, giảm tốc và quay |
| S03 | 16–26s | 24–34s | Cốc/tay, đặt xuống trước nhả, settle |
| S04 | 26–34s | 0–8s | Depth/pan/overscan; so màu trên player thực |
| S05 | 34–42s | 40–48s | Hai tay chạm quai đèn, trao vật, phản ứng An |
| S06 | 42–48s | 34–40s | Anticipation, tay tách mặt, recovery |

Automated Chromium playback của R2 trước gain đã chạy 1x và 0.5x tới cuối, muted;
1x 48.102s / dropped 1 và 0.5x 96.097s / dropped 0 trong run có tải nền. Không gọi đây là
review mỹ thuật, phép nghe hay benchmark throughput. [Review còn thiếu](review-status.json).

## Gói sửa được và kiểm phục hồi

[Native Blender R2](native-final-r2.zip), Blender 4.3.2: giải nén rồi mở
`project/S01.blend`…`S06.blend`. Texture relative/hash-addressed, source frame JSON
kèm theo. `.blend` là native image strips/F-curves; chưa có semantic rig UI,
physical lights hoặc free 3D camera. Voice không nhúng vào các image strips;
fixture WAV nằm ở `production/artifacts/Q1/draft-3/voice` và `Q2/edit-R1/voice`.

[Manifest](manifest.json) ghi SHA ZIP. Fresh-path replay kiểm 70 file hashes và
6 frame S05 theo thứ tự 191/0/72/48/191/72 khớp pixel. [Note camera native](native-edit/report.json)
đã sửa 292 curves trên bản sao S04, source cũ nguyên vẹn, mở lại đúng ảnh đã sửa.
Cả hai là kiểm cùng agent, **không thay** handoff cho operator độc lập.

## Màu và gate còn mở

[Color diagnostic](color-diagnostic/report.json): decode BT709→sRGB tường minh
cho MAE 0.878 / p95 2 so nativePNG; Chromium compositor/canvas cùng MAE 6.963 / p95 11.
Do đó metadata/profile đúng không đủ để duyệt hiển thị màu. Chưa đổi ngưỡng sau
kết quả hoặc đổi tag để ép pass. Cần khóa target-player/display reference và
ngưỡng trước phép so tiếp theo ở T-MEDIA-01/Q7; giữ EX-002 mở.

Q2 còn: full-motion/voice review có timestamp và rubric; target-player color/alpha
contract đầy đủ; người khác mở/sửa note;3 cold + 5 warm **sau** khi art/motion đạt.
Không có phút phim accepted nên chưa tính cost/accepted-minute. Q3–Q9 tiếp tục
đúng các gate trong [kế hoạch](../../../../docs/toolchain-future-plan.md).
