# Bộ kiểm thử báo cáo Studio hoạt hình AI

Đây là harness kiểm chứng kỹ thuật cho báo cáo, chưa phải ứng dụng studio. Dùng HyperFrames 0.9.30 và Remotion 4.0.542 đã khóa trong package-lock. Đọc kết luận tại [bản thẩm định](../reports/Tham_dinh_ky_thuat.md) và [kế hoạch](../reports/Ke_hoach_trien_khai.md).

## Đã thực hiện

- Render hai ví dụ phụ lục ở 1080p/24 fps/120 frame.
- Chạy lint/check HyperFrames; phát hiện 2 cảnh báo biên tập trong B.1 và kiểm lại biến thể đã sửa đạt 0 cảnh báo lint/runtime.
- Cùng cảnh 640×360/24 fps/240 frame: cut-out, pickup, parallax, clip, SVG shadow/mask, PCM audio markers.
- 48 capture/backend cho seek; 36 so sánh/backend với baseline.
- 1 so với 2 worker: decode toàn bộ 240 frame/backend, so pixel.
- Bốn negative cases: HyperFrames best-effort/strict, Remotion HTML img/Remotion Img.
- 22 kiểm tra metadata, frame count, clip boundary và audio sync; cài sạch bằng npm ci và render lại smoke case.

Không có gọi API tạo ảnh/voice có phí. Không có test chất lượng lip-sync, retarget/IK, nhiều máy, alpha-video, corpus agent hay recovery của studio.

## Chạy lại

Yêu cầu: Linux, Node >=22 (đã thử 24.22.1), Python 3.12, FFmpeg/ffprobe, Chromium tại `/usr/bin/chromium`. Nếu máy khác dùng đường dẫn khác, sửa/chuyển cấu hình browser trong các script và ghi environment mới; không so hash môi trường khác như cùng baseline.

Tại thư mục `validation`:

```bash
npm ci
python -m venv /tmp/studio-validation-venv
/tmp/studio-validation-venv/bin/pip install -r requirements.txt
PATH="/tmp/studio-validation-venv/bin:$PATH" npm test
```

Trên môi trường cloud có proxy của lần khảo sát, lệnh cài thực dùng:

```bash
NODE_USE_ENV_PROXY=1 npm_config_cache=/tmp/studio-npm-cache npm ci --no-audit --no-fund
```

Giữ nguyên proxy/CA của môi trường. `NODE_USE_ENV_PROXY` là tùy chọn đã thử trên Node 24; không mặc định tương đương trên mọi bản Node 22. Không dùng `@latest` khi tái hiện kết quả. Các script dùng thư mục cache HyperFrames `/tmp/studio-hyperframes-cache`.

`npm test` chạy tuần tự để tránh hai renderer cạnh tranh tài nguyên trong phép đo. Hai ca guarded missing-asset phải trả exit 1; suite xem đây là hành vi mong đợi và kiểm đúng nguyên nhân, không che một lỗi cài đặt khác thành pass. Bản thân lệnh render không đủ để chấm thành công; `summarize.py` kiểm log và việc không có artifact cuối.

Các bước riêng:

```bash
python scripts/prepare-fixtures.py
node scripts/render-hyperframes.mjs study 1 strict
node scripts/render-remotion.mjs Study 1
PRODUCER_LOW_MEMORY_MODE=false node scripts/render-hyperframes.mjs study 2 strict
node scripts/render-remotion.mjs Study 2
node scripts/seek-hyperframes.mjs
node scripts/seek-remotion.mjs
python scripts/qc.py
python scripts/compare-concurrency.py
```

Chỉ tắt low-memory profile khi chủ động thử workers=2 và có budget RAM; lần đo này có 8 GiB. Hành vi two-worker đã được kiểm từ log, không suy từ tham số yêu cầu.

## Bố trí file

| Đường dẫn | Nội dung |
| --- | --- |
| `fixtures/scene.js` | Hình/evaluator dùng chung; không dùng font hoặc nguồn network |
| `fixtures/Study.tsx` | Composition cùng negative cases của Remotion |
| `fixtures/hyperframes-report.html`, `RemotionReport.tsx` | Đoạn ví dụ trích nguyên từ Word |
| `scripts/prepare-fixtures.py` | Tạo HTML shell, sao GSAP local và sinh WAV sync; các thư mục tạo ra được gitignore |
| `scripts/render-*.mjs`, `seek-*.mjs` | Chạy API thật, thu metrics/capture |
| `scripts/qc.py` | Decode/đếm frame, đo sync, kiểm clip; thống kê cross-backend pixels, không tự gắn parity pass |
| `scripts/compare-concurrency.py` | So hình decoded của 1/2 worker theo ngưỡng khai báo trước |
| `scripts/record.py` | Lưu exact command, cwd, thời gian, exit code và log |
| `evidence/*-command.json` | Metadata mỗi lệnh; tách khỏi dữ liệu đo để tránh ghi đè |
| `evidence/*-metrics.json` | Dữ liệu renderer; HF có job/perfSummary |
| `evidence/summary.json` | Tổng hợp test có bằng chứng |
| `out/` | Media phát sinh khi chạy, không đưa toàn bộ vào Git |
| `../reports/validation-media/` | Hai video mẫu và frame minh họa của lần đo hiện tại |

Mỗi lần chạy lại sẽ cập nhật evidence/out tại chỗ. Muốn giữ nhiều lượt benchmark, sao thư mục evidence/out sang runId riêng trước khi chạy. `evidence/SHA256SUMS` được tính lại bởi summarize; chạy `sha256sum -c evidence/SHA256SUMS` từ thư mục validation sau khi prepare nếu cần xác minh cả fixture sinh tự động.

Giới hạn phép đo: một lần chạy cho mỗi cấu hình hiệu năng, không đủ thống kê p50/p95. Tín hiệu sync là tone, không phải speech. Remotion renderStill tạo page mỗi capture nên đây chưa phải kiểm Player scrub giữ state. Cảnh dùng cùng SVG giảm khác biệt tác giả nhưng không đo đầy đủ lợi thế workflow native.
