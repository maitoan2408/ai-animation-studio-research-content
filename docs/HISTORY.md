# Lịch sử đã gỡ khỏi cây thư mục

Đợt dọn ngày 20/11/2026 xuất phát từ commit `7f35e4f631660c64c49b7b10cc2285aecd878931`
(nhánh `codex/m6-unified-integration-20261118`). Mọi thứ dưới đây vẫn nằm nguyên trong
lịch sử Git; xem lại bằng:

```bash
git show 7f35e4f:<đường-dẫn>
```

```bash
git checkout 7f35e4f -- <đường-dẫn>
```

| Đã gỡ | Nội dung | Lý do |
| --- | --- | --- |
| `plan.md`, `agent.md`, `skills.md`, `docs/execution/`, `docs/quality/`, `docs/phases/`, `docs/roadmap-full.md`, `docs/production-quality-plan.md`, `docs/toolchain-future-plan.md` | Các thế hệ kế hoạch P0–P11, Q0–Q9, U0–U8, F0–F9, V2 và trạng thái của chúng | Bị thay thế bởi M0–M7/G1–G6; gộp vào `ROADMAP.md` và `STATE.json` |
| `docs/product-first/` | Kế hoạch, review, audit từng milestone M1–M6 và G3 (R1–R8) | Kết luận chính đã gộp vào `ROADMAP.md`; SHA chấp nhận giữ trong `STATE.json` |
| `docs/research/`, `docs/reports/`, `validation/`, `reports/*` (trừ báo cáo nghiên cứu gốc) | Nghiên cứu toolchain, thẩm định, bàn giao v0.1 | Tài liệu lịch sử, không dùng khi chạy |
| `production/evidence/`, `production/artifacts/`, `artifacts/`, `docs/**/evidence` (≈1,1 GB) | Log, video, ảnh bằng chứng của từng lần chạy | Bằng chứng gắn với SHA cũ; bằng chứng mới lấy từ CI artifact |
| `production/brief/`, các script `build_f2_*`, `build_f3_*`, `hero*`, `benchmark.ts`, `paper-scene/`, `paper-spike/`, `blender/`, `editorial/`, `media/`, `continuity/`, `review/` | Sáu shot benchmark S01–S06, hero S05, bản nháp F2/F3, spike Blender, công cụ review Q2 | Gắn cứng vào một phim/giai đoạn cụ thể |
| `production/src/motion/character-library.ts`, `m6-quality.ts`, `physics/m4*.ts`, `render/render-m3/m4/m6/ir.ts` | Thư viện M3 (walk-stop, turn-head, wave, pick-place), vật lý M4, chất lượng M6 | Chỉ chạy cho một phim showcase (model `mai`/`an`, bàn ở x=1060). Pipeline tổng quát G1–G3 thay thế phần cầm/thả |
| `src/rig.ts`, `src/render-segment.ts`, phần render của `src/render.ts`, `src/animation-ir.ts`, `src/motion-service.ts`, `web/motion.*` | Renderer SVG 640×360 vẽ một cảnh cốc cố định; trang M3 | Chủ dự án quyết định xóa; Studio render lại ở G4 |
| `scripts/`, 6 workflow theo giai đoạn | E2E/audit cho từng milestone | Thay bằng `ci.yml` và `render.yml` |
