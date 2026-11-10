# M1 — Domain, asset và revision

## Công việc

Schema project/scene/audio; parser kịch bản có giới hạn; asset store theo hash; revision atomic.

## Kiểm thử và lỗi có chủ đích

Input rỗng/quá lớn, ID/path không hợp lệ, hash sai, revision conflict; cùng script tạo draft ổn định.

## Cổng nghiệm thu

Schema và tests; API domain không phụ thuộc renderer.

## Khi chưa đạt

Lưu input/log; sửa nguyên nhân; chạy lại ca lỗi và regression liên quan. Không ghi DONE trước khi có bằng chứng. Kết quả thực tế cập nhật trong docs/verification.md và plan.md.
