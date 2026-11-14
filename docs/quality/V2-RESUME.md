# V2 resume

Baseline `ce4f912`, branch `codex/v2-continuous`. Kế hoạch gốc: `V2-USER-PLAN.md`; hàng đợi máy đọc: `state.json` mục `v2`; các quyết định người: `HUMAN-QUEUE.md`.

F0 IN_PROGRESS: bước kế tiếp tái hiện và sửa T11 mất bản nháp khi save/voice/upload hoặc chuyển project. Dùng test browser với request bị trì hoãn; giữ evidence FAIL rồi test lại. Sau đó xử lý hợp đồng tất định, research/license và báo cáo F0. Không đánh dấu F0 PASS chỉ vì có hàng đợi. F1–F9 TODO. Không đổi chuẩn, không tự duyệt nghệ thuật, không dùng dịch vụ có phí hoặc media không rõ quyền.

## Checkpoint F0 — 14/11

Save delayed-response data loss reproduced FAIL then retested PASS. Implemented draft generation preservation for save/voice/upload, with project ID guard and explicit detach tracking. Voice/upload/project-switch and detach races remain NOT_RUN and must be tested before calling T11 done. Root verify passed; integration/UI running. First typecheck failed on new test nullability, corrected and rerun. Do not treat initial save-only fix as F0 completion.
