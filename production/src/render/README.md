# Candidate A — Three + HyperFrames protocol

## Dòng dữ liệu

`server.ts` đọc native asset + raster manifest đã kiểm hash, bundle code tin cậy
bằng esbuild, phục vụ tại loopback. `browser.ts` fetch/hash/decode tất cả texture,
compile shader rồi mới expose `window.__hf = {duration, seek}`. HyperFrames engine
0.9.33 capture giao thức này. Không cần wrapper public counter của native Three
LoadingManager; không giả `itemsLoaded/itemsTotal` tồn tại ở Three r187.

`benchmarkFrame(pack, shot, frame, edit)` là hàm thuần. `seek(t)` lượng tử 24fps,
đặt trực tiếp mọi transform/material/camera, render và finish GPU. Không rAF loop,
physics integration, autoplay hoặc đọc wall clock. Camera orthographic + authored
multiplane offsets; chưa nhận hỗ trợ orbit 3D/path tracing.

## Chạy kiểm và render từ repo root

```bash
python scripts/run-step.py Q2 adapter -- production/node_modules/.bin/tsx production/src/render/check_adapter.ts
python scripts/run-step.py Q2 blocking -- production/node_modules/.bin/tsx production/src/render/render_shots.ts S01,S02,S03,S04,S05,S06 640
python scripts/run-step.py Q2 finals -- production/node_modules/.bin/tsx production/src/render/render_shots.ts S01,S02,S03,S04,S05,S06 1920
```

`check_adapter.ts`: slow/404/hash/corrupt PNG/timeout, sau đó 48 actual HF captures
theo bốn thứ tự/browser mới; 36 repeat comparisons. PNG exact chỉ trong software
renderer đã đo. `render_shots.ts`: unique take, full frame hashes, key stills,
picture/delivery, probe + full decode. Failed take giữ nguyên, không publish nó
như phim được duyệt. Màu nguồn sRGB chuyển transfer/matrix/range thật bằng zscale,
không chỉ gắn tag 709. Round-trip/player tolerance sẽ kiểm Q7.

Preview 640×360 không upscale thành final. Voice fixture chỉ có trong S01, các
shot đối chứng còn lại có silence stereo. Mix/loudness/sound design là Q5/Q7,
không nhận delivery benchmark là bản âm thanh production.

## Giới hạn và xử lý lỗi

Không asset → readiness reject + không protocol; không capture ảnh trắng rồi
báo thành công. Context lost xóa readiness/protocol. Hỗ trợ recovery/publish/cache
đầy đủ nằm Q7, chưa được tuyên bố từ fixture. Config là trusted benchmark data,
validation authoring/API registry production nằm Q4. Gate technical riêng với
art/motion và voice listening (EX-011 vẫn mở).
