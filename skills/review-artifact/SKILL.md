---
name: review-artifact
description: Ghi đánh giá đúng video và revision trong Paper Studio nội bộ.
---

# Ghi đánh giá đúng video và revision

## Input

Artifact ID; reviewer; approved/changes_requested; notes ≤4.000 ký tự; frame tùy chọn trong range.

## Thực hiện

Nghe/xem artifact, xác nhận revision/profile. POST /api/artifacts/:id/reviews. Server verify hash trước ghi record.

## Output

Review bất biến gắn artifactHash/revision/frame/reviewer.

## Lỗi và gate

ARTIFACT_HASH_MISMATCH, INVALID_REVIEW, INVALID_FRAME.

Agent/test không thay người dùng duyệt nghệ thuật. Test reviewer chỉ ở dữ liệu tạm.

## Bằng chứng

tests/workflow.test.ts; tests/ui.ts. Không tự ghi PASS; chạy test hoặc trỏ evidence đúng commit. Xem docs/api.md, docs/capabilities.md và docs/verification.md. Skill dùng chung application service, không có đường ghi data riêng.

