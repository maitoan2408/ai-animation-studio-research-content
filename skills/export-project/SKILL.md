---
name: export-project
description: Đóng gói và mở lại project trong Paper Studio nội bộ.
---

# Đóng gói và mở lại project

## Input

Project ID, revision tùy chọn; audio assets còn đúng hash.

## Thực hiện

GET /api/projects/:id/export; import bằng POST /api/import hoặc CLI. Validator kiểm toàn bộ hashes/PCM/duration trước ghi project. IDs mới tạo tại máy nhận.

## Output

JSON tự đủ spec/audio; import tạo Project/Revision mới.

## Lỗi và gate

INVALID_PACKAGE, PACKAGE_HASH_MISMATCH, MISSING_PACKAGE_ASSET, DUPLICATE_ASSET, AUDIO_OVERFLOW.

Gói không có secrets/path/cache; không kế thừa review. Backup full history là workflow khác theo runbook.

## Bằng chứng

tests/workflow.test.ts; tests/integration.ts; tests/ui.ts. Không tự ghi PASS; chạy test hoặc trỏ evidence đúng commit. Xem docs/api.md, docs/capabilities.md và docs/verification.md. Skill dùng chung application service, không có đường ghi data riêng.

