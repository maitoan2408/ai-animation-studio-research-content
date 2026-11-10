---
name: prepare-audio
description: Chuẩn bị audio và căn thời lượng trong Paper Studio nội bộ.
---

# Chuẩn bị audio và căn thời lượng

## Input

Project ID, expectedRevision, narration hoặc WAV RIFF ≤24 MB; sceneId cho WAV.

## Thực hiện

POST /api/projects/:id/voice hoặc /audio. Voice thay audio của các scene có narration trong revision mới. WAV decode → PCM mono 48 kHz → SHA → binding. Duration tự tăng khi cần.

## Output

Asset hash, duration và Revision mới; textHash cho voice tự sinh.

## Lỗi và gate

EMPTY_NARRATION, INVALID_AUDIO, AUDIO_TOO_LONG, AUDIO_OVERFLOW, REVISION_CONFLICT, INVALID_PROJECT.

Không cắt mất thoại; không coi amplitude mouth là phoneme lip-sync; voice nháp phải nghe duyệt.

## Bằng chứng

tests/audio.test.ts; tests/integration.ts; tests/ui.ts. Không tự ghi PASS; chạy test hoặc trỏ evidence đúng commit. Xem docs/api.md, docs/capabilities.md và docs/verification.md. Skill dùng chung application service, không có đường ghi data riêng.

