# Paper Studio — studio hoạt hình 2D/2.5D chạy bằng code

Studio nội bộ làm phim hoạt hình phong cách cắt giấy, multiplane và shadow-box. Mở rộng bằng **dữ liệu**: thêm nhân vật, đạo cụ hoặc phim bằng art pack và file JSON, không viết code riêng cho từng phim. Không cần API key, không gọi dịch vụ tạo hình trả phí.

- **Studio** (`src/`, `web/`): kịch bản → storyboard có revision → giọng nháp → review → export/import, cùng Director có duyệt trước khi chạy. *Hiện chưa render được* cho tới khi nối với engine phim (G4).
- **Engine phim** (`production/`): file phim JSON + art pack → MP4 1920×1080, 24 fps, có vật lý Rapier, lớp diễn xuất và audit độc lập.

Đọc tiếp: [kiến trúc](docs/ARCHITECTURE.md) · [lộ trình và trạng thái](docs/ROADMAP.md) · [hướng dẫn cho agent](AGENTS.md) · [đã gỡ những gì](docs/HISTORY.md)

## Cài đặt

Cần Node 24, Chromium, FFmpeg/ffprobe. Mặc định dùng `/usr/bin/chromium`; đổi bằng `STUDIO_BROWSER` (Studio) hoặc `FILM_BROWSER` (engine phim).

```bash
npm ci && npm --prefix production ci
```

## Render phim mẫu

```bash
cd production
npm run render -- examples/films/*.json --out out/films
npm run audit -- out/films
```

Mỗi phim có lớp diễn xuất cho ra hai video `out/films/<id>/film-1080p.mp4` và `out/films/<id>-enhanced/film-1080p.mp4` cùng nguồn, để so A/B. Phim mới: sao chép một file trong `production/examples/films/`, đổi nhân vật, tay, đạo cụ, vị trí, keyframe, frame thả.

## Chạy Studio

```bash
npm run build && npm start
```

Mở http://127.0.0.1:4310. Mỗi đoạn kịch bản cách nhau một dòng trống là một cảnh; chỉ dẫn tùy chọn `[action=wave; camera=pan; seconds=4]`.

## Kiểm tra

```bash
npm run verify
npm run test:ui && npm run test:ui:recovery
npm --prefix production run typecheck && npm --prefix production test
```

Test xanh chỉ chứng minh đúng kỹ thuật, không phải chấp nhận nghệ thuật. Chỉ chủ dự án duyệt hình.

## Báo cáo nghiên cứu gốc

- [Bản Word](reports/Bao_cao_Studio_hoat_hinh_AI_HyperFrames_Remotion.docx?raw=true) · [Bản PDF](reports/Bao_cao_Studio_hoat_hinh_AI_HyperFrames_Remotion.pdf?raw=true) — mã kiểm tra trong [SHA256SUMS](SHA256SUMS).
