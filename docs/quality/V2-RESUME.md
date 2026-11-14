# V2 resume

Baseline `ce4f912`, branch `codex/v2-continuous`. Kế hoạch gốc: `V2-USER-PLAN.md`; hàng đợi máy đọc: `state.json` mục `v2`; các quyết định người: `HUMAN-QUEUE.md`.

F0 IN_PROGRESS/VALIDATING: các race save/voice/upload/detach/navigation và synthetic determinism đã có test; kiểm final integration và CI mới. License/use case và pixel threshold còn PROVISIONAL; xem state/report F0. Khi gate kỹ thuật đạt, bắt đầu F1 và F2 theo dependency; F1–F9 hiện TODO. Không đổi chuẩn, không tự duyệt nghệ thuật, không dùng dịch vụ có phí hoặc media không rõ quyền.

## Checkpoint F0 — 14/11

Save delayed-response data loss reproduced FAIL then retested PASS. Implemented draft generation preservation for save/voice/upload, with project ID guard and explicit detach tracking. Voice/upload/project-switch and detach races remain NOT_RUN and must be tested before calling T11 done. Root verify and isolated build/integration/UI passed; old artifacts unchanged. First typecheck failed on new test nullability, corrected and rerun. Do not treat initial save-only fix as F0 completion.

## F0 tiếp tục — 14/11

Chromium test voice/upload/chuyển dự án và detach có chủ đích PASS; phát hiện/sửa lỗi merge thời lượng voice48→258frame và detach không hiện đúng. Source chính thức Chromium, skimage và GSAP đã tra cứu; ngưỡng SSIM/ΔE và phạm vi license sản phẩm còn PARTIAL. Cần kiểm multi-navigation, test hai tầng và final integration trên source cuối trước chốt F0.

Data bit-exact và raster comparator (FFmpeg SSIM + Pillow/LittleCMS ΔE76) có synthetic fixture, alpha compositing và test âm; không có threshold → NEEDS_CALIBRATION. Không coi ngưỡng fixture là chuẩn production. 23 Python tests PASS. Root verify và recovery browser PASS. Full app integration và CI cuối còn chờ; sau khi hoàn tất chốt F0 kỹ thuật với các mục người/threshold PROVISIONAL và bắt đầu F1, F2 theo dependency.

## F0 checkpoint — chờ CI

Final UI regression đầy đủ đã chạy isolated PASS; navigation race và voice/upload/detach đã có test trong CI. Comparator data/raster có23 Python tests full PASS; threshold production chưa chốt. Xem state.v2, F0 report và research. Push source, kiểm CI; nếu xanh ghi F0 technical với human decisions PROVISIONAL rồi bắt đầu F1 ngay, F2 độc lập theo dependency.
