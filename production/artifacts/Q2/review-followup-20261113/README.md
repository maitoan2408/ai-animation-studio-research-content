# Review bổ sung và sửa lỗi phục hồi UI

Baseline phát hiện: `cb4e08476ae831775d1ae0b485e71fd1455be13a`.
Tất cả record trong thư mục này là `automated-test`, không là review mỹ thuật.
Video/master/art/native source không đổi trong lần sửa UI này.

- [Before report](before/report.json): EX-030 mất draft R2 sau response R0;
  EX-031 mất response, refresh rồi retry tạo2record cùng nội dung. Chromium thật,
  journal test riêng, browserErrors rỗng. FAIL_CONFIRMED được giữ nguyên.
- [After report](after/report.json): draft mới giữ nguyên; retry chỉ1record và
  cùng requestId; ca POST đã commit nhưng GET refresh lỗi vẫn báo đúng đã lưu.
  Cả3ca PASS. Ảnh before/after và journal export nằm cạnh report.
- [13ca UI cũ](existing-ui-report.json) chạy lại PASS, gồm STALE_HEAD giữa hai
  cửa sổ, seek/step, version isolation, mobile và restart.

Chạy từ repo root, sau restore media v2 theo runbook:

```bash
python scripts/run-step.py Q2 review-recovery -- npm --prefix production run test:review-recovery
python scripts/run-step.py Q2 review-ui -- npm --prefix production run test:review-ui
```

Harness chỉ điều khiển thời điểm chuyển request, thao tác UI và đọc export; không
patch code ứng dụng trong browser hoặc ghi trực tiếp journal để ép kết quả.
Exit1/FAIL_CONFIRMED = invariant sản phẩm không đạt; exit2/HARNESS_ERROR = không
đủ kết luận. Failure syntax94174e63 của harness được giữ riêng, không tính thành
lỗi sản phẩm. Source ZIP của từng attempt cho phép đối chiếu trước/sau sửa.

[Bản review đầy đủ](../../../../docs/execution/REVIEW-2026-11-13.md),
[mã và quy trình lưu](../../../src/review/README.md),
[gate Q2](../../../evidence/Q2/gate.json).
