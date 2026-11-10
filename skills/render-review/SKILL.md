---
name: render-review
description: Render revision và kiểm kỹ thuật trong Paper Studio nội bộ.
---

# Render revision và kiểm kỹ thuật

## Input

Project ID, revisionId thuộc project; profile preview/final; assets còn đủ/hash đúng.

## Thực hiện

POST /api/projects/:id/jobs hoặc CLI render. Poll job; queued/running có thể cancel. Chỉ retry failed/cancelled/interrupted. Kiểm decode/QC trước publish.

## Output

Job/Attempt logs; nếu thành công có Artifact, QC, SHA và MP4.

## Lỗi và gate

INVALID_PROFILE, REVISION_MISMATCH, ASSET_HASH_MISMATCH, QC_FAILED, PROCESS_FAILED, CANCELLED.

Exit 0/file tồn tại chưa đủ; không dùng output tạm làm accepted.

## Bằng chứng

tests/workflow.test.ts; tests/integration.ts; tests/ui.ts. Không tự ghi PASS; chạy test hoặc trỏ evidence đúng commit. Xem docs/api.md, docs/capabilities.md và docs/verification.md. Skill dùng chung application service, không có đường ghi data riêng.

