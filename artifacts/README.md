# Bằng chứng bàn giao v0.1

- morning-final.mp4: 13 giây, 312 frames, 1920×1080/24fps, 3 scene, giọng VI local; **chờ người dùng duyệt art**.
- morning.studio.json: portable spec/audio để import/render lại; không mang approval.
- smoke-preview.mp4: 2 scene/96 frames/640×360, fixture kỹ thuật.
- integration-results.json, ui-results.json: kết quả clean checkout 5891a77.
- ui-desktop.png, ui-mobile.png: giao diện test; reviewer `Automated UI test` chỉ là test data.
- runs/: checkpoint trước và clean-install log; failures/: lỗi đã phát hiện/sửa, giữ làm lịch sử.
- dependency-bom.json: npm CycloneDX cho production dependencies.
- SHA256SUMS: kiểm tính toàn vẹn evidence; `python scripts/seal-evidence.py` cập nhật sau khi thay evidence có chủ đích.

DataRoot trong JSON là đường dẫn tạm của lần chạy, không cần để replay; dùng examples và package. `npm run test:integration`/UI tạo kết quả mới; snapshot kết quả release trước nếu muốn giữ lịch sử. Screenshot không chứng minh art acceptance, audio phát âm hoặc mọi hành vi production.
