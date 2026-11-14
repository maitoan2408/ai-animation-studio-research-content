# ADR 0002 — snapshot bằng chứng khử trùng lặp (đề xuất, chưa bật)

Bối cảnh: `run-step.py` ghi source.zip cho từng lần; `audit_evidence.py` mặc định kiểm archive nằm trong từng attempt, hash archive và hash từng file trong inputs. Chỉ thay bằng liên kết chung hoặc commit SHA sẽ làm audit cũ báo thiếu archive, và commit SHA không giữ thay đổi chưa commit.

Quyết định tạm thời: chưa đổi schema hoặc evidence lịch sử. Đề xuất kho nội dung theo hash kèm phiên bản schema, đường dẫn an toàn trong repo, ghi atomically, kiểm byte khi đọc; chỉ dùng commit SHA nếu kiểm cây allowlist sạch và có thể khôi phục chính xác. Auditor và mọi consumer phải hiểu cả schema cũ lẫn mới, từ chối snapshot thiếu/sửa, path traversal và tham chiếu dangling. Thử trên bản sao với attempt lặp và thay đổi, cố tình corrupt, chạy audit và check_fresh_review trước khi bật. Đo dung lượng sau hai lần cùng nguồn; mục tiêu giảm ≥80% so với hai bản zip, không coi là đạt khi chưa đo. Hiện T0b PARTIAL, cơ chế cũ vẫn hoạt động; giảm số attempt và ghi nhận vượt ngân sách nếu có.

## Thử bản sao

`snapshot_dedup_trial.py` tạo tám bản sao tổng hợp cùng source.zip, đưa archive vào kho hash và thay file ở mỗi bản sao bằng symlink tương đối. Audit hiện tại đọc được; tar extract + audit được; sửa archive bị từ chối. Giảm 87,5% bytes archive trong mô phỏng tám bản. Đây chưa là tám attempt mới hoặc full `check_fresh_review`; symlink có rủi ro path traversal và khác biệt nền tảng, chưa được kiểm. Quyết định vẫn **chưa bật**, không sửa evidence cũ hay recorder.

## Bản opt-in thử trong Git tạm

`PAPER_EVIDENCE_SNAPSHOT=dedup-v1` nay là lựa chọn thử nghiệm, **mặc định vẫn legacy**. ZIP được ghi chuẩn hóa thời gian để cùng input có cùng hash; lưu theo hash và symlink tương đối cho audit cũ. Năm test dùng Git tạm kiểm tám attempt mới trùng snapshot, input thay đổi, bốn attempt đồng thời, source bị sửa, symlink ra ngoài và `git archive`/extract. Audit thật trên 645 attempt hoàn tất/597 snapshot cũ PASS. Test đầu FAIL vì test tái dùng đường output audit `open('x')`; đã sửa bằng tên duy nhất và giữ snapshot lỗi.

Chưa chạy đủ workflow `check_fresh_review.py` từ Git sạch và chưa kiểm Windows; không bật mặc định. Git symlink và tính nguyên tử của filesystem cần được đánh giá trong môi trường vận hành. Không sửa evidence lịch sử.

`check_fresh_review.py` trên source `2ba07ea` PASS sáu bước trên cùng host; hai attempt opt-in thật trong workspace trỏ cùng archive và audit 651 attempt/603 archive PASS. Checkout Git-only kiểm source có code mới nhưng chưa bao gồm hai symlink opt-in thật; kiểm lại sau commit có chúng. Mặc định vẫn legacy, Windows chưa kiểm.

## Quyết định áp dụng Linux

Source `046875c` chứa symlink và archive opt-in thật; Git-only audit PASS 660 attempt/612 archive, và `check_fresh_review.py` PASS sáu bước ở checkout Git-only cùng host/agent. Cùng các test recorder tám lần và archive/security ở trên, cho phép bật `dedup-v1` mặc định **trên Linux**. `PAPER_EVIDENCE_SNAPSHOT=legacy` giữ snapshot cũ; hệ điều hành khác mặc định legacy vì chưa kiểm Windows. Request mới ghi mode; symlink thoát kho và kho symlink bị từ chối. Không sửa evidence lịch sử. Đây không chứng minh tính độc lập của operator hay approval mỹ thuật.
