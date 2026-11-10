---
name: revise-scene
description: Sửa scene thành revision mới trong Paper Studio nội bộ.
---

# Sửa scene thành revision mới

## Input

Project ID, expectedRevision, toàn bộ spec sau sửa.

## Thực hiện

Đọc snapshot hiện tại; sửa bản sao trong bộ nhớ; POST /api/projects/:id/revisions. Nếu đổi narration của voice tự sinh, bỏ binding cũ hoặc sinh lại trước render.

## Output

Revision mới và pointer current cập nhật; revision cũ không đổi.

## Lỗi và gate

REVISION_CONFLICT, INVALID_PROJECT. Không force-overwrite khi conflict.

Không chuyển approval/artifact cũ sang revision mới.

## Bằng chứng

tests/domain.test.ts; tests/http.test.ts; tests/ui.ts. Không tự ghi PASS; chạy test hoặc trỏ evidence đúng commit. Xem docs/api.md, docs/capabilities.md và docs/verification.md. Skill dùng chung application service, không có đường ghi data riêng.

