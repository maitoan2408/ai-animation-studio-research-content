# Nhật ký kiểm chứng ứng dụng

Kết quả nghiên cứu gốc nằm trong `validation/evidence/` và `reports/Tham_dinh_ky_thuat.md`. Nhật ký này dành cho chương trình mới. PASS kỹ thuật không thay cho duyệt hình ảnh và giọng nói của người dùng.

## M1 — schema, planner, revision store

- `npm run verify`: PASS, TypeScript strict và 7 tests.
- Đã kiểm: parsing script, thời lượng/action sai, quá số cảnh, narration/voice hash, scene ID trùng, unknown fields, hai cập nhật đồng thời chỉ một thành công, revision cũ không đổi, path traversal, asset bị sửa bytes, job running sau restart chuyển interrupted.
- Máy kiểm: Node 24.22.1, Linux; file JSON trong temporary data directory.
- Giới hạn tại mốc này: chưa nghiệm thu renderer/UI. Các lệnh sản phẩm sẽ được nối ở M2–M4.

## M2 — renderer và âm thanh

- Render thật qua HyperFrames strict: 2 cảnh/4 giây cho paper-cut, multiplane và shadow-box; 3 cảnh/13 giây cho pilot 1920×1080.
- QC pilot: 312/312 frames, 24/1 fps, audio mono 48 kHz, duration video/audio 13 giây, full decode PASS. Video nằm ở `artifacts/morning-final.mp4`.
- Giọng eSpeak tiếng Việt có PCM khác silence; hash transcript gắn binding. Kiểm mixer chặn audio tràn cảnh và sample đầu cảnh bắt đầu đúng tại frame boundary.
- Browser seek 7 frame theo thứ tự thuận/ngược: hashes ảnh trùng. Không kiểm chứng mọi frame trên mọi hệ điều hành.
- Lần chạy integration đầu bị policy Chromium chặn `file://`. Fixture chuyển sang HTTP loopback; chạy lại PASS. Giữ bằng chứng trong `artifacts/failures/01-file-url-policy.json`.

## M3 — jobs, cache, review, packaging

- 15 unit/workflow checks PASS ở checkpoint hiện tại. Renderer giả chỉ dùng để cô lập state machine; không tính chúng là kiểm chất lượng hình ảnh.
- Kiểm: attempt lỗi rồi retry; cancel đang chạy; duplicate submit; một process sở hữu data; cache hit có hash; cache bị sửa phải render lại; review tham chiếu đúng revision; corrupt artifact không được review; package sai hash không tạo project mới.
- Integration thật xác nhận cache hit, audio bị sửa bị chặn và export/open giữ nguyên spec/hash.
- Startup recovery đã kiểm bằng persisted running state. Chưa chạy fault injection SIGKILL tại mọi bước capture/encode/commit; mục đó giữ mở trong P9.

## M4 — giao diện và CLI

- CLI biên dịch: create → voice → render, PASS.
- Browser: 9 checks PASS — tạo, sửa revision, voice, upload WAV, render/playback metadata, review, export/import, viewport 390 px và không lỗi JavaScript.
- Phát hiện tràn ngang do intrinsic width của form trong grid. Sửa min-width và layout mobile; chạy lại toàn luồng PASS. Log và ảnh trước sửa ở `artifacts/failures/02-mobile-overflow.*`.
- Review trong test dùng tên `Automated UI test` và dữ liệu tạm; pilot bàn giao chưa được người dùng duyệt.

## M5 — clean checkout và kiểm chứng bổ sung

- Checkout bằng `git archive` commit **5891a77** sang `/tmp/paper-studio-clean-BS1la7`, cài bằng `npm ci` với npm cache riêng; không copy node_modules từ workspace.
- `npm run verify`: PASS **16 tests**, format và hai lượt typecheck.
- `npm run build`: PASS. `npm run test:integration`: PASS **13 checks**. `npm run test:ui`: PASS **9 checks**.
- Bổ sung: QC từ chối video 96 frames khi spec yêu cầu 120; cancellation renderer thật không công bố artifact và retry thành công với attempt thứ hai.
- Audio AAC sau encode so với PCM trộn tại cùng sample index: correlation **0.9998988035476665**, ngưỡng đã đặt >0.98. Đây là kiểm timing pipeline, chưa kiểm ngữ âm/viseme.
- Reopen app từ persisted running state chuyển interrupted và đóng attempt; retry được; close lặp của owner cũ không tháo lock owner mới.
- Integration clean run mất **86,448 giây cho toàn suite**, không phải tốc độ render production/phút phim. Cùng runtime như checkpoint M2; hashes hai MP4 giống bản trước.
- Raw log: `artifacts/runs/clean-install.log`; JSON: `artifacts/runs/clean-*.json`. Kết quả trước giữ ở `m2-integration.json` và `m4-ui.json`.
- CI remote được theo dõi riêng trong trạng thái bàn giao; việc có file workflow chưa có nghĩa CI đã PASS.

## Giới hạn chưa được đánh dấu PASS

Art acceptance, corpus phát âm/phoneme, placement/retarget/foot-lock, load test production, SIGKILL tại mọi giai đoạn commit, restore full history giữa máy, provider LLM/eval 40 đề và chi phí/phút accepted. Toàn bộ được ánh xạ vào P0–P11 trong `docs/roadmap-full.md`.
