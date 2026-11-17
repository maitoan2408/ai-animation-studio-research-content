# Capability matrix

| Thành phần | Đã hỗ trợ | Chưa nghiệm thu |
| --- | --- | --- |
| Scene | Schema 1.0, frame integer 24fps, 1–12 scenes | Arbitrary graph/curves, migrations |
| Rig | Một nhân vật procedural, cốc, nền nhiều lớp | Image asset ingest, multi-view, rig editor, retarget |
| Actions | idle, wave, walk, pick-up, talk | Foot locking, place/release, contact solver, reaction |
| Styles | Paper-cut, multiplane parallax, shadow-box palette/frame/mask | Art pack được duyệt, texture, alpha export, blur stack nặng |
| Audio | VI/EN draft, WAV normalize, padding/gain, envelope 24fps | Phoneme alignment, viseme editing, stems/music/SFX, LUFS |
| Planner | Paragraphs, directives, từ khóa, timing estimate | LLM, asset retrieval, tự kiểm kể chuyện/lịch sử |
| Render | HyperFrames strict, 1 worker, local MP4 | Distributed, GPU benchmark, long-form SLA |
| QC | Frames/dimensions/fps/audio/duration/decode/hash | Art score, phát âm, continuity, mọi lỗi hình |
| State | Revision, conflicts, attempts, cancel/retry/recovery/review | Multi-writer DB, power-loss guarantee, HA queue |
| Cache | Toàn project, verify output hash | Shot/stem cache, audio-only rerender |
| Packaging | Self-contained audio JSON | OTIO, full history package |
| UI | Create/edit/render/review/export/import, desktop/mobile | Add/delete/reorder scenes, timeline, roles |

Final là độ phân giải xuất, không xác nhận chất lượng nghệ thuật. Walk là chuyển động đồ họa đơn giản, chưa đạt foot-slide production của Word. Talk không có nghĩa lip-sync âm vị hoàn tất.

## M5 bounded Director (separate owner-pending milestone)

The localhost `/director` view compiles script into a strict, SHA-bound task graph, shows actual root Studio action/camera limitations, requires manual execution approval, and calls the existing real script, draft voice, MP4 and artifact verification executors. Two source-bound fresh 1080p24 videos and failure/graph screenshots are covered by M5 CI. This is an **offline deterministic planner**, not general LLM story reasoning and not an automatic M3/M4 physics/character engine integration. Render success never implies artistic approval.
