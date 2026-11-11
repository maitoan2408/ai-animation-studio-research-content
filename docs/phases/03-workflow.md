# M3 — Jobs và vòng review

## Công việc

Một worker; attempt/cancel/retry/restart; cache; review theo revision/hash; export/import.

## Kiểm thử và lỗi có chủ đích

Restart sau running, cancel, hai cập nhật đồng thời, cache bị hỏng, import hash sai, review nhầm revision.

## Cổng nghiệm thu

Lịch sử bất biến; retry không ghi đè accepted artifact; mở lại project được.

## Khi chưa đạt

Lưu input/log; sửa nguyên nhân; chạy lại ca lỗi và regression liên quan. Không ghi DONE trước khi có bằng chứng. Kết quả thực tế cập nhật trong docs/verification.md và plan.md.
