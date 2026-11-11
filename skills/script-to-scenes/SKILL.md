---
name: script-to-scenes
description: Tạo phân cảnh nháp từ script trong Paper Studio nội bộ.
---

# Tạo phân cảnh nháp từ script

## Input

Script ≤12.000 ký tự; title; style paper-cut/multiplane/shadow-box; language vi/en.

## Thực hiện

POST /api/projects hoặc CLI create. Mỗi đoạn trống tạo scene; directives tường minh được ưu tiên. Đọc notes về action suy luận.

## Output

Project + Revision/schema 1.0; IDs scene ổn định, frame duration, notes.

## Lỗi và gate

INVALID_SCRIPT, TOO_MANY_SCENES, INVALID_DIRECTIVE, UNKNOWN_DIRECTIVE, INVALID_PROJECT.

Không tuyên bố planner hiểu cốt truyện bằng LLM; người dùng sửa draft.

## Bằng chứng

tests/domain.test.ts; tests/audio.test.ts; tests/ui.ts. Không tự ghi PASS; chạy test hoặc trỏ evidence đúng commit. Xem docs/api.md, docs/capabilities.md và docs/verification.md. Skill dùng chung application service, không có đường ghi data riêng.

