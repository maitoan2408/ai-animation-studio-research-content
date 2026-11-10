# Cài đặt và tái tạo

## Điều kiện máy

Đã thử trên Linux Debian 13, Node 24.22.1/npm 11.9.0, Chromium 156.0.8078.79, FFmpeg/ffprobe 7.1.5, giới hạn 2 CPU và 8 GiB RAM. Đây là môi trường thử, không phải cấu hình tối thiểu đã benchmark. Để trống vài GB cho dependencies/cache/attempts.

Cài `chromium`, `ffmpeg` bằng package manager của máy và Node 24 trở lên. `npm ci` không tự cài executable hệ thống. Không bắt buộc GPU, cloud hoặc API trả phí.

## Từ Git

```bash
git clone https://github.com/maitoan2408/ai-animation-studio-research-content.git
cd ai-animation-studio-research-content
git checkout codex/studio-internal-mvp
npm ci
npm run studio -- doctor
npm run verify
npm run build
npm start
```

`STUDIO_BROWSER=/absolute/path/to/chromium` đổi browser. `STUDIO_DATA` đổi data directory, mặc định `./data`. `.env.example` chỉ là mẫu; ứng dụng không tự đọc `.env`. Có thể chạy `node --env-file=.env dist/cli.js serve` sau build.

Trong sandbox có HOME chỉ đọc, dùng `npm ci --cache /tmp/paper-studio-npm-cache`; không thay đổi `$HOME`. Giữ proxy/CA do môi trường cung cấp; không tắt TLS verification.

## CLI

Dừng server trước khi dùng CLI cùng data; lock ngăn hai writer.

```bash
npm run studio -- create examples/morning.txt --title "Chiếc cốc buổi sáng"
npm run studio -- list
npm run studio -- voice PROJECT_ID
npm run studio -- render PROJECT_ID --profile final
npm run studio -- show PROJECT_ID
npm run studio -- export PROJECT_ID /tmp/morning.studio.json
npm run studio -- import /tmp/morning.studio.json
```

Thay PROJECT_ID bằng `id` từ create. MP4 ở `DATA/media/ARTIFACT_ID.mp4`; show liệt kê artifacts/jobs/reviews. CLI in JSON; lỗi có code/message và exit khác 0. Import `artifacts/morning.studio.json` để có chính audio của demo mà không cần sinh lại voice.

## Bộ kiểm

```bash
npm run verify
npm run build
npm run test:integration
npm run test:ui
```

- Verify: format, TypeScript strict, unit/negative/workflow/HTTP.
- Integration: voice thật, seek raster, audio sau encode, QC lỗi, cancel/retry thật, ba styles, pilot 1080p, cache/import và compiled CLI.
- UI: Chromium thật tạo/sửa/voice/WAV/render/review/export/import, desktop/mobile.
- Data test riêng dưới `/tmp`; kết quả ở `artifacts/`. Giữ snapshot trước khi chạy lại một release; không test trên data sản xuất.
- Harness cũ có package/lock riêng trong `validation/`.

Lockfile khóa JavaScript dependencies. Browser/FFmpeg do hệ điều hành cung cấp; hashes raster chỉ so trong cùng môi trường đã ghi. CI/clean install phải ghi runtime thực.
