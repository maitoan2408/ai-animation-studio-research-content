# M3 — Character / Motion System: thực thi và nghiệm thu

**Authorized:** 2026-11-16. Chủ dự án đã duyệt M2 trong hội thoại, cho phép triển khai M3. Parent: `codex/product-first-m2-studio-v02`; branch: `codex/product-first-m3-character-motion`; PR #11 (Draft). Không tự merge, không bắt đầu M4 trước khi chủ dự án duyệt M3.

## Scope và ranh giới

1. Đăng ký instance nhân vật mới `guest-01` gắn với art model `an` qua `production-cutout-1` / SHA-bound `lantern-art-1`; cho phép tạo instance mới trên cùng rig/asset có sẵn. Không tự nhận đã thiết kế hình mẫu nhân vật hoàn toàn mới.
2. Bộ action thực thi thật qua Three: `walk-stop` (đặt chân stance/swing và dừng), `turn-head`, `wave`, `pick-place` (grip/prop anchoring). Dữ liệu action đầu vào được kiểm chặt; unsupported action/rig/prop fail closed.
3. Random-access sampling deterministic, transitions không nhảy vị trí ở biên clip, chân khóa đúng tọa độ world qua stance, grip marker trùng anchor của cup.
4. Showcase native Three/Chromium 1080p@24fps, bốn đoạn hành động và so sánh pose nghỉ với pose chuyển động (không mô tả nhầm là M2 video A/B). Lưu MP4, frame PNG, contact sheet và manifest nguồn/hash.
5. End-of-stage audit độc lập với bước render đầu tiên: xác minh đầy đủ tiêu chí, lỗi/biên/dữ liệu giả, frame-contact, audio nếu có, native decode, random seek, CI app+workbench và visual QA; lỗi thì sửa → dựng lại → kiểm toàn bộ lần cuối.

## Acceptance gate bắt buộc

- [x] Source code thực và tests (gồm negative cases) PASS.
- [x] Clip mới có thể được cấu hình bằng data-only input; character instance ID khác với art model; rig assets/anchor SHA xác thực.
- [x] No-slip trên các khoảng stance được khai báo đo ở **sole anchor thực**, không suy từ vị trí root.
- [x] Pickup grip và prop anchor đúng trong khoảng held; frame giới hạn / contact invalid phải fail.
- [x] Walk-stop, head turn, wave, pick/place và transitions xuất hiện trong actual rendered video.
- [x] Real MP4 full decode, ffprobe fps/khung hình/kích thước, vẫn PNG from actual frames, contact, reverse seek state & raster parity, manifest source SHA.
- [x] Full final HEAD production + root application CI PASS sau sửa cuối; regression M0/M1/M2 không suy giảm.
- [x] Quay lại hậu kiểm lần hai, khắc phục các vấn đề trong scope và giữ failed attempts; không tự đánh giá diễn xuất đã đạt trình độ chuyên nghiệp.
- [ ] Hiển thị media/file & QC trực tiếp trong chat cho owner; chỉ owner đặt `ACCEPTED`.

## Không thuộc M3

Rapier physics/bake tổng quát thuộc M4; orchestration AI Director thuộc M5; art, voice và diễn xuất cao cấp thuộc M6. Current M3 character ID mới sử dụng **compatible existing** cutout model, không phải asset/rig nghệ thuật mới.

## Technical re-audit closure — 2026-11-16

- Actual source `7aa1ce` generated native media and separate post-result audit, both full CI workflows SUCCESS.
- Manual post-result inspection found and fixed actual package JSON hash mismatch and misleading comparison reference; CI now rejects stale artifact hashes.
- M3 technical gate PASSED; owner visual acceptance is pending. No M4 work.

## M3 supplemental limitation re-audit (owner directive 2026-11-16)

Owner requested that remaining M3 limitations be investigated, in-scope problems repaired, and final proof presented before authorization to move to M4. The previously green M3 showcase **was reopened for a deeper capability/configuration audit**.

- Fixed three data-only behavior limitations: (a) character capabilities formerly had to contain all four actions, so capability subsets were unusable; (b) cup/bench prop formerly required even for a wave-only or walk-only character; (c) unreachable cup contact geometry was not rejected until sampling/rendering rather than at project validation.
- Added positive/negative tests for capability subsets, prohibited actions, duplicate/unknown capabilities, no-prop clips, required prop for pick/place, unreachable pick/place and existing valid renders. Preserved the existing default showcase.
- Code+skill source SHA: `61020373e6b64c9901fb6d3f5b7d19827363ec92`. Final re-audit: <https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43753767459> and root/M2 regression <https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43753767435> both SUCCESS. Native artifact: <https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43753767459/artifacts/14178155027>. Independent full decode and **21/21 file SHA** rechecked; latest 268-frame 1080p MP4 hash unchanged: `2a902307ae4e7fadccae0fbc6b75ecf3af97e90192015739a35d79b8da0434a5`.
- Remaining bounded-scope limitations: original drawn art/rig still reused (not new original character artwork), right-facing motion only, authored walk has fixed step trajectory, pick/place targets the known cup only, and this M3 motion executor is exposed on the separate `/motion` Studio page rather than as a new action inside the M2 storyboard editor. M4/M5/M6 additions (generalized physics, AI Director, natural acting/voice) are deliberately outside M3.
- No uncorrected defect was found **within the explicitly approved bounded M3 technical gate** after repairs. The remaining design limits are disclosed for the owner's visual/product acceptance, not quietly relabelled as nonexistent.
- M3 stays `READY_FOR_USER_REVIEW`, `userAcceptance=NOT_REVIEWED`; PR #11 remains Draft. M4 cannot start without explicit owner approval.

## Communication

Không báo cáo giữa chừng. Chỉ bàn giao sản phẩm thật sau vòng hậu kiểm và sửa lỗi cuối. Blocker phải ghi rõ BLOCKED, không được tráo thành pass.

## Current cross-milestone audit

The owner requested M1–M3 regression and repairs on 2026-11-16. Follow `M1-M3-AUDIT.md`; previous checked gates are historical until the final repaired source completes regression and post-result audit. No M4 advancement.
